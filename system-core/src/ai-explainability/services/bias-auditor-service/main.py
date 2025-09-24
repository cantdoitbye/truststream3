"""
Bias Auditor Service for TrustStram v4.4

Integrates Aequitas and Fairlearn for comprehensive bias detection and fairness monitoring.
"""

import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Union, Tuple

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel

# Fairness libraries
try:
    import aequitas
    from aequitas.group import Group
    from aequitas.bias import Bias
    from aequitas.fairness import Fairness
except ImportError:
    logging.warning("Aequitas not available. Install with: pip install aequitas")
    aequitas = None

try:
    import fairlearn
    from fairlearn.metrics import (
        demographic_parity_difference,
        equalized_odds_difference,
        MetricFrame
    )
    from fairlearn.postprocessing import ThresholdOptimizer
except ImportError:
    logging.warning("Fairlearn not available. Install with: pip install fairlearn")
    fairlearn = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TrustStram Bias Auditor Service",
    description="Comprehensive bias detection and fairness monitoring with Aequitas and Fairlearn",
    version="4.4.0"
)

# Request/Response Models
class BiasAuditRequest(BaseModel):
    model_id: str
    dataset: Dict[str, List[Any]]  # Dictionary with feature names as keys
    predictions: List[Any]
    protected_attributes: List[str]
    true_labels: Optional[List[Any]] = None
    fairness_metrics: Optional[List[str]] = None
    audit_type: str = 'comprehensive'  # 'quick', 'comprehensive', 'continuous'
    
class FairnessMetricsResponse(BaseModel):
    audit_id: str
    model_id: str
    audit_type: str
    overall_fairness_score: float
    bias_detected: bool
    protected_groups_analysis: Dict[str, Any]
    aequitas_metrics: Dict[str, Any]
    fairlearn_metrics: Dict[str, Any]
    recommendations: List[str]
    compliance_status: Dict[str, Any]
    timestamp: str
    audit_duration_ms: float

class ContinuousMonitoringRequest(BaseModel):
    model_id: str
    monitoring_config: Dict[str, Any]
    alert_thresholds: Dict[str, float]
    
class HealthResponse(BaseModel):
    status: str
    version: str
    active_audits: int
    models_monitored: int

# Global components
bias_auditor = None
fairness_monitor = None

START_TIME = time.time()

@app.on_event("startup")
async def startup_event():
    """Initialize bias auditing components."""
    global bias_auditor, fairness_monitor
    
    try:
        bias_auditor = BiasAuditor()
        fairness_monitor = ContinuousFairnessMonitor()
        
        logger.info("Bias auditor service initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize bias auditor service: {str(e)}")
        raise

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="4.4.0",
        active_audits=bias_auditor.active_audits if bias_auditor else 0,
        models_monitored=len(fairness_monitor.monitored_models) if fairness_monitor else 0
    )

@app.post("/audit", response_model=FairnessMetricsResponse)
async def conduct_bias_audit(
    request: BiasAuditRequest,
    background_tasks: BackgroundTasks
):
    """Conduct comprehensive bias audit using Aequitas and Fairlearn."""
    start_time = time.time()
    
    try:
        # Generate audit ID
        audit_id = f"audit_{int(time.time())}_{hash(request.model_id) % 10000}"
        
        # Conduct bias audit
        audit_results = await bias_auditor.conduct_audit(
            audit_id=audit_id,
            model_id=request.model_id,
            dataset=request.dataset,
            predictions=request.predictions,
            protected_attributes=request.protected_attributes,
            true_labels=request.true_labels,
            fairness_metrics=request.fairness_metrics,
            audit_type=request.audit_type
        )
        
        # Generate recommendations
        recommendations = await bias_auditor.generate_recommendations(
            audit_results['aequitas_metrics'],
            audit_results['fairlearn_metrics'],
            audit_results['protected_groups_analysis']
        )
        
        # Check compliance status
        compliance_status = await bias_auditor.check_compliance(
            audit_results
        )
        
        # Calculate overall fairness score
        overall_fairness_score = await bias_auditor.calculate_overall_fairness_score(
            audit_results
        )
        
        response = FairnessMetricsResponse(
            audit_id=audit_id,
            model_id=request.model_id,
            audit_type=request.audit_type,
            overall_fairness_score=overall_fairness_score,
            bias_detected=overall_fairness_score < 0.8,  # Threshold for bias detection
            protected_groups_analysis=audit_results['protected_groups_analysis'],
            aequitas_metrics=audit_results['aequitas_metrics'],
            fairlearn_metrics=audit_results['fairlearn_metrics'],
            recommendations=recommendations,
            compliance_status=compliance_status,
            timestamp=datetime.now().isoformat(),
            audit_duration_ms=(time.time() - start_time) * 1000
        )
        
        # Store audit results for compliance tracking
        background_tasks.add_task(
            bias_auditor.store_audit_results,
            audit_id,
            response.dict()
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error conducting bias audit: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/monitor/start")
async def start_continuous_monitoring(
    request: ContinuousMonitoringRequest
):
    """Start continuous fairness monitoring for a model."""
    try:
        monitoring_id = await fairness_monitor.start_monitoring(
            request.model_id,
            request.monitoring_config,
            request.alert_thresholds
        )
        
        return {
            'monitoring_id': monitoring_id,
            'model_id': request.model_id,
            'status': 'monitoring_started',
            'message': f'Continuous monitoring started for model {request.model_id}'
        }
        
    except Exception as e:
        logger.error(f"Error starting monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/monitor/{model_id}/status")
async def get_monitoring_status(model_id: str):
    """Get continuous monitoring status for a model."""
    try:
        status = await fairness_monitor.get_monitoring_status(model_id)
        return status
        
    except Exception as e:
        logger.error(f"Error getting monitoring status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/audits/{audit_id}")
async def get_audit_results(audit_id: str):
    """Get stored audit results by ID."""
    try:
        results = await bias_auditor.get_audit_results(audit_id)
        if not results:
            raise HTTPException(status_code=404, detail="Audit not found")
        
        return results
        
    except Exception as e:
        logger.error(f"Error getting audit results: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/compliance/{model_id}")
async def get_compliance_report(model_id: str):
    """Get compliance report for a model."""
    try:
        report = await bias_auditor.generate_compliance_report(model_id)
        return report
        
    except Exception as e:
        logger.error(f"Error generating compliance report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)


class BiasAuditor:
    """
    Core bias auditing engine using Aequitas and Fairlearn.
    """
    
    def __init__(self):
        """
        Initialize bias auditor with fairness frameworks.
        """
        self.audit_history = {}
        self.active_audits = 0
        
        # Check library availability
        self.aequitas_available = aequitas is not None
        self.fairlearn_available = fairlearn is not None
        
        if not self.aequitas_available:
            logger.warning("Aequitas not available. Some bias metrics will be unavailable.")
        
        if not self.fairlearn_available:
            logger.warning("Fairlearn not available. Some fairness metrics will be unavailable.")
        
        logger.info("Bias auditor initialized")
    
    async def conduct_audit(
        self,
        audit_id: str,
        model_id: str,
        dataset: Dict[str, List[Any]],
        predictions: List[Any],
        protected_attributes: List[str],
        true_labels: Optional[List[Any]] = None,
        fairness_metrics: Optional[List[str]] = None,
        audit_type: str = 'comprehensive'
    ) -> Dict[str, Any]:
        """
        Conduct comprehensive bias audit.
        
        Args:
            audit_id: Unique audit identifier
            model_id: Model being audited
            dataset: Dataset with features
            predictions: Model predictions
            protected_attributes: List of protected attribute names
            true_labels: Ground truth labels (if available)
            fairness_metrics: Specific metrics to calculate
            audit_type: Type of audit to conduct
            
        Returns:
            Comprehensive audit results
        """
        self.active_audits += 1
        
        try:
            # Convert data to DataFrame
            df = pd.DataFrame(dataset)
            df['predictions'] = predictions
            
            if true_labels:
                df['true_labels'] = true_labels
            
            # Validate protected attributes exist
            missing_attrs = [attr for attr in protected_attributes if attr not in df.columns]
            if missing_attrs:
                raise ValueError(f"Protected attributes not found in dataset: {missing_attrs}")
            
            # Conduct Aequitas audit
            aequitas_results = {}
            if self.aequitas_available:
                aequitas_results = await self._conduct_aequitas_audit(
                    df, protected_attributes, fairness_metrics
                )
            
            # Conduct Fairlearn audit
            fairlearn_results = {}
            if self.fairlearn_available:
                fairlearn_results = await self._conduct_fairlearn_audit(
                    df, protected_attributes, true_labels is not None
                )
            
            # Analyze protected groups
            protected_groups_analysis = await self._analyze_protected_groups(
                df, protected_attributes
            )
            
            # Perform intersectional analysis
            intersectional_analysis = await self._perform_intersectional_analysis(
                df, protected_attributes
            )
            
            # Statistical parity analysis
            statistical_parity = await self._analyze_statistical_parity(
                df, protected_attributes
            )
            
            audit_results = {
                'audit_id': audit_id,
                'model_id': model_id,
                'audit_type': audit_type,
                'protected_attributes': protected_attributes,
                'aequitas_metrics': aequitas_results,
                'fairlearn_metrics': fairlearn_results,
                'protected_groups_analysis': protected_groups_analysis,
                'intersectional_analysis': intersectional_analysis,
                'statistical_parity': statistical_parity,
                'data_summary': {
                    'total_samples': len(df),
                    'protected_groups_count': {attr: df[attr].nunique() for attr in protected_attributes},
                    'prediction_distribution': df['predictions'].value_counts().to_dict(),
                    'missing_data': df.isnull().sum().to_dict()
                }
            }
            
            # Store audit results
            self.audit_history[audit_id] = audit_results
            
            return audit_results
            
        except Exception as e:
            logger.error(f"Error conducting bias audit: {str(e)}")
            raise
        finally:
            self.active_audits -= 1
    
    async def _conduct_aequitas_audit(
        self,
        df: pd.DataFrame,
        protected_attributes: List[str],
        fairness_metrics: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Conduct audit using Aequitas framework.
        
        Args:
            df: DataFrame with data and predictions
            protected_attributes: Protected attribute names
            fairness_metrics: Specific metrics to calculate
            
        Returns:
            Aequitas audit results
        """
        try:
            results = {}
            
            for attr in protected_attributes:
                attr_results = {}
                
                # Prepare data for Aequitas
                aequitas_df = df[['predictions', attr]].copy()
                aequitas_df.columns = ['score', 'attribute_value']
                aequitas_df['model_id'] = 1
                aequitas_df['entity_id'] = range(len(aequitas_df))
                
                # Add labels if available
                if 'true_labels' in df.columns:
                    aequitas_df['label_value'] = df['true_labels']
                
                try:
                    # Calculate group metrics
                    g = Group()
                    xtab, _ = g.get_crosstabs(aequitas_df)
                    
                    # Calculate bias metrics
                    b = Bias()
                    bias_df = b.get_disparity_predefined_groups(
                        xtab, 
                        original_df=aequitas_df,
                        ref_groups_dict={attr: aequitas_df[aequitas_df['attribute_value'].value_counts().index[0]]['attribute_value'].iloc[0]}
                    )
                    
                    attr_results['group_metrics'] = xtab.to_dict('records')
                    attr_results['bias_metrics'] = bias_df.to_dict('records')
                    
                    # Calculate fairness metrics if labels available
                    if 'label_value' in aequitas_df.columns:
                        f = Fairness()
                        fairness_df = f.get_group_value_fairness(bias_df)
                        attr_results['fairness_metrics'] = fairness_df.to_dict('records')
                        
                except Exception as e:
                    logger.warning(f"Error in Aequitas analysis for {attr}: {str(e)}")
                    attr_results['error'] = str(e)
                
                results[attr] = attr_results
            
            return results
            
        except Exception as e:
            logger.error(f"Error in Aequitas audit: {str(e)}")
            return {'error': str(e)}
    
    async def _conduct_fairlearn_audit(
        self,
        df: pd.DataFrame,
        protected_attributes: List[str],
        has_labels: bool
    ) -> Dict[str, Any]:
        """
        Conduct audit using Fairlearn framework.
        
        Args:
            df: DataFrame with data and predictions
            protected_attributes: Protected attribute names
            has_labels: Whether true labels are available
            
        Returns:
            Fairlearn audit results
        """
        try:
            results = {}
            
            for attr in protected_attributes:
                attr_results = {}
                
                try:
                    # Get predictions and sensitive features
                    y_pred = df['predictions']
                    sensitive_features = df[attr]
                    
                    if has_labels:
                        y_true = df['true_labels']
                        
                        # Calculate fairness metrics with labels
                        attr_results['demographic_parity_difference'] = float(
                            demographic_parity_difference(y_true, y_pred, sensitive_features=sensitive_features)
                        )
                        
                        attr_results['equalized_odds_difference'] = float(
                            equalized_odds_difference(y_true, y_pred, sensitive_features=sensitive_features)
                        )
                        
                        # MetricFrame for detailed analysis
                        from sklearn.metrics import accuracy_score, precision_score, recall_score
                        
                        metric_frame = MetricFrame(
                            metrics={
                                'accuracy': accuracy_score,
                                'precision': precision_score,
                                'recall': recall_score
                            },
                            y_true=y_true,
                            y_pred=y_pred,
                            sensitive_features=sensitive_features
                        )
                        
                        attr_results['metric_frame'] = {
                            'by_group': metric_frame.by_group.to_dict(),
                            'overall': metric_frame.overall.to_dict(),
                            'difference': metric_frame.difference().to_dict(),
                            'ratio': metric_frame.ratio().to_dict()
                        }
                    
                    else:
                        # Without labels, calculate demographic parity on predictions
                        group_stats = {}
                        for group in sensitive_features.unique():
                            group_mask = sensitive_features == group
                            group_pred_rate = y_pred[group_mask].mean()
                            group_stats[str(group)] = {
                                'positive_prediction_rate': float(group_pred_rate),
                                'sample_count': int(group_mask.sum())
                            }
                        
                        attr_results['group_statistics'] = group_stats
                        
                        # Calculate max difference in positive prediction rates
                        rates = [stats['positive_prediction_rate'] for stats in group_stats.values()]
                        attr_results['max_demographic_parity_difference'] = float(max(rates) - min(rates))
                    
                except Exception as e:
                    logger.warning(f"Error in Fairlearn analysis for {attr}: {str(e)}")
                    attr_results['error'] = str(e)
                
                results[attr] = attr_results
            
            return results
            
        except Exception as e:
            logger.error(f"Error in Fairlearn audit: {str(e)}")
            return {'error': str(e)}
    
    async def _analyze_protected_groups(
        self,
        df: pd.DataFrame,
        protected_attributes: List[str]
    ) -> Dict[str, Any]:
        """
        Analyze protected groups in the dataset.
        
        Args:
            df: DataFrame with data
            protected_attributes: Protected attribute names
            
        Returns:
            Protected groups analysis
        """
        analysis = {}
        
        for attr in protected_attributes:
            try:
                attr_analysis = {}
                
                # Group distribution
                value_counts = df[attr].value_counts()
                attr_analysis['distribution'] = value_counts.to_dict()
                attr_analysis['group_sizes'] = value_counts.to_dict()
                
                # Prediction rates by group
                prediction_by_group = df.groupby(attr)['predictions'].agg([
                    'mean', 'std', 'count'
                ]).to_dict('index')
                
                attr_analysis['prediction_statistics'] = prediction_by_group
                
                # Calculate representation ratios
                total_samples = len(df)
                representation_ratios = {}
                for group, count in value_counts.items():
                    representation_ratios[str(group)] = count / total_samples
                
                attr_analysis['representation_ratios'] = representation_ratios
                
                # Identify underrepresented groups (< 10% representation)
                underrepresented = [
                    group for group, ratio in representation_ratios.items() 
                    if ratio < 0.1
                ]
                attr_analysis['underrepresented_groups'] = underrepresented
                
                analysis[attr] = attr_analysis
                
            except Exception as e:
                logger.warning(f"Error analyzing protected group {attr}: {str(e)}")
                analysis[attr] = {'error': str(e)}
        
        return analysis
    
    async def _perform_intersectional_analysis(
        self,
        df: pd.DataFrame,
        protected_attributes: List[str]
    ) -> Dict[str, Any]:
        """
        Perform intersectional bias analysis.
        
        Args:
            df: DataFrame with data
            protected_attributes: Protected attribute names
            
        Returns:
            Intersectional analysis results
        """
        if len(protected_attributes) < 2:
            return {'message': 'Intersectional analysis requires at least 2 protected attributes'}
        
        try:
            # Create intersectional groups
            intersectional_groups = df[protected_attributes].apply(
                lambda x: '_'.join(x.astype(str)), axis=1
            )
            
            # Analyze intersectional bias
            intersectional_stats = df.groupby(intersectional_groups)['predictions'].agg([
                'mean', 'std', 'count'
            ]).reset_index()
            
            intersectional_stats.columns = ['intersectional_group', 'mean_prediction', 'std_prediction', 'count']
            
            # Calculate disparities between intersectional groups
            max_disparity = intersectional_stats['mean_prediction'].max() - intersectional_stats['mean_prediction'].min()
            
            # Identify most and least favored intersectional groups
            most_favored = intersectional_stats.loc[intersectional_stats['mean_prediction'].idxmax(), 'intersectional_group']
            least_favored = intersectional_stats.loc[intersectional_stats['mean_prediction'].idxmin(), 'intersectional_group']
            
            return {
                'intersectional_statistics': intersectional_stats.to_dict('records'),
                'max_disparity': float(max_disparity),
                'most_favored_group': most_favored,
                'least_favored_group': least_favored,
                'total_intersectional_groups': len(intersectional_stats),
                'groups_with_sufficient_data': len(intersectional_stats[intersectional_stats['count'] >= 30])  # Rule of thumb
            }
            
        except Exception as e:
            logger.error(f"Error in intersectional analysis: {str(e)}")
            return {'error': str(e)}
    
    async def _analyze_statistical_parity(
        self,
        df: pd.DataFrame,
        protected_attributes: List[str]
    ) -> Dict[str, Any]:
        """
        Analyze statistical parity across protected groups.
        
        Args:
            df: DataFrame with data
            protected_attributes: Protected attribute names
            
        Returns:
            Statistical parity analysis
        """
        try:
            analysis = {}
            
            for attr in protected_attributes:
                # Calculate positive prediction rates by group
                group_rates = df.groupby(attr)['predictions'].mean()
                overall_rate = df['predictions'].mean()
                
                # Calculate differences from overall rate
                rate_differences = group_rates - overall_rate
                
                # Statistical parity violation threshold (> 10% difference)
                violation_threshold = 0.1
                violations = rate_differences.abs() > violation_threshold
                
                analysis[attr] = {
                    'group_positive_rates': group_rates.to_dict(),
                    'overall_positive_rate': float(overall_rate),
                    'rate_differences': rate_differences.to_dict(),
                    'max_absolute_difference': float(rate_differences.abs().max()),
                    'statistical_parity_violated': bool(violations.any()),
                    'violating_groups': violations[violations].index.tolist()
                }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error in statistical parity analysis: {str(e)}")
            return {'error': str(e)}
    
    async def generate_recommendations(
        self,
        aequitas_metrics: Dict[str, Any],
        fairlearn_metrics: Dict[str, Any],
        protected_groups_analysis: Dict[str, Any]
    ) -> List[str]:
        """
        Generate bias mitigation recommendations.
        
        Args:
            aequitas_metrics: Aequitas audit results
            fairlearn_metrics: Fairlearn audit results
            protected_groups_analysis: Protected groups analysis
            
        Returns:
            List of recommendations
        """
        recommendations = []
        
        try:
            # Check for demographic parity violations
            for attr, metrics in fairlearn_metrics.items():
                if 'max_demographic_parity_difference' in metrics:
                    diff = metrics['max_demographic_parity_difference']
                    if diff > 0.1:  # 10% threshold
                        recommendations.append(
                            f"Demographic parity violation detected for {attr} (difference: {diff:.3f}). "
                            "Consider re-balancing training data or applying fairness constraints."
                        )
                
                if 'equalized_odds_difference' in metrics:
                    diff = metrics['equalized_odds_difference']
                    if abs(diff) > 0.1:
                        recommendations.append(
                            f"Equalized odds violation detected for {attr} (difference: {diff:.3f}). "
                            "Consider post-processing techniques or threshold optimization."
                        )
            
            # Check for underrepresented groups
            for attr, analysis in protected_groups_analysis.items():
                if 'underrepresented_groups' in analysis and analysis['underrepresented_groups']:
                    groups = ', '.join(analysis['underrepresented_groups'])
                    recommendations.append(
                        f"Underrepresented groups detected for {attr}: {groups}. "
                        "Consider data augmentation or stratified sampling."
                    )
            
            # Generic recommendations if no specific issues found
            if not recommendations:
                recommendations.extend([
                    "Continue regular bias monitoring to maintain fairness over time.",
                    "Consider expanding bias audits to additional protected attributes.",
                    "Implement continuous fairness monitoring in production."
                ])
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {str(e)}")
            recommendations.append("Error generating specific recommendations. Conduct manual review.")
        
        return recommendations
    
    async def calculate_overall_fairness_score(
        self,
        audit_results: Dict[str, Any]
    ) -> float:
        """
        Calculate overall fairness score from audit results.
        
        Args:
            audit_results: Complete audit results
            
        Returns:
            Overall fairness score (0-1, higher is more fair)
        """
        try:
            scores = []
            
            # Score from statistical parity
            statistical_parity = audit_results.get('statistical_parity', {})
            for attr, parity_data in statistical_parity.items():
                max_diff = parity_data.get('max_absolute_difference', 0)
                # Convert difference to score (0 difference = score 1)
                parity_score = max(0, 1 - (max_diff * 2))  # Scale by 2 to make 0.5 diff = 0 score
                scores.append(parity_score)
            
            # Score from Fairlearn metrics
            fairlearn_metrics = audit_results.get('fairlearn_metrics', {})
            for attr, metrics in fairlearn_metrics.items():
                if 'max_demographic_parity_difference' in metrics:
                    diff = metrics['max_demographic_parity_difference']
                    demo_score = max(0, 1 - (diff * 2))
                    scores.append(demo_score)
            
            # Score from representation analysis
            protected_groups = audit_results.get('protected_groups_analysis', {})
            for attr, analysis in protected_groups.items():
                underrep_groups = analysis.get('underrepresented_groups', [])
                # Penalize for underrepresented groups
                repr_score = 1 - (len(underrep_groups) * 0.2)  # 0.2 penalty per underrep group
                scores.append(max(0, repr_score))
            
            # Calculate weighted average
            if scores:
                overall_score = np.mean(scores)
            else:
                overall_score = 0.5  # Neutral score if no metrics available
            
            return float(np.clip(overall_score, 0, 1))
            
        except Exception as e:
            logger.error(f"Error calculating fairness score: {str(e)}")
            return 0.5  # Return neutral score on error
    
    async def check_compliance(
        self,
        audit_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Check compliance with fairness regulations.
        
        Args:
            audit_results: Audit results to check
            
        Returns:
            Compliance status
        """
        compliance = {
            'eu_ai_act': {'compliant': True, 'issues': []},
            'gdpr': {'compliant': True, 'issues': []},
            'equal_opportunity': {'compliant': True, 'issues': []}
        }
        
        try:
            # EU AI Act compliance (high-risk AI systems)
            fairlearn_metrics = audit_results.get('fairlearn_metrics', {})
            for attr, metrics in fairlearn_metrics.items():
                if 'max_demographic_parity_difference' in metrics:
                    diff = metrics['max_demographic_parity_difference']
                    if diff > 0.2:  # 20% threshold for high-risk systems
                        compliance['eu_ai_act']['compliant'] = False
                        compliance['eu_ai_act']['issues'].append(
                            f"Demographic parity difference exceeds 20% for {attr}: {diff:.3f}"
                        )
            
            # Equal opportunity compliance
            for attr, metrics in fairlearn_metrics.items():
                if 'equalized_odds_difference' in metrics:
                    diff = abs(metrics['equalized_odds_difference'])
                    if diff > 0.1:  # 10% threshold
                        compliance['equal_opportunity']['compliant'] = False
                        compliance['equal_opportunity']['issues'].append(
                            f"Equalized odds difference exceeds 10% for {attr}: {diff:.3f}"
                        )
            
            # Overall compliance status
            compliance['overall_compliant'] = all(
                comp['compliant'] for comp in compliance.values() if isinstance(comp, dict)
            )
            
        except Exception as e:
            logger.error(f"Error checking compliance: {str(e)}")
            compliance['error'] = str(e)
        
        return compliance
    
    async def store_audit_results(
        self,
        audit_id: str,
        results: Dict[str, Any]
    ) -> None:
        """
        Store audit results for compliance tracking.
        
        Args:
            audit_id: Audit identifier
            results: Audit results to store
        """
        try:
            # In production, this would store to a database
            # For now, keep in memory
            self.audit_history[audit_id] = {
                'stored_at': datetime.now().isoformat(),
                'results': results
            }
            
            logger.info(f"Stored audit results for {audit_id}")
            
        except Exception as e:
            logger.error(f"Error storing audit results: {str(e)}")
    
    async def get_audit_results(self, audit_id: str) -> Optional[Dict[str, Any]]:
        """
        Get stored audit results.
        
        Args:
            audit_id: Audit identifier
            
        Returns:
            Stored audit results or None
        """
        return self.audit_history.get(audit_id)
    
    async def generate_compliance_report(
        self,
        model_id: str
    ) -> Dict[str, Any]:
        """
        Generate compliance report for a model.
        
        Args:
            model_id: Model identifier
            
        Returns:
            Compliance report
        """
        try:
            # Find all audits for this model
            model_audits = [
                audit for audit in self.audit_history.values()
                if audit.get('results', {}).get('model_id') == model_id
            ]
            
            if not model_audits:
                return {'error': f'No audits found for model {model_id}'}
            
            # Generate summary report
            report = {
                'model_id': model_id,
                'total_audits': len(model_audits),
                'audit_period': {
                    'first_audit': min(audit['stored_at'] for audit in model_audits),
                    'last_audit': max(audit['stored_at'] for audit in model_audits)
                },
                'compliance_summary': {
                    'currently_compliant': True,
                    'compliance_history': [],
                    'outstanding_issues': []
                },
                'fairness_trends': {},
                'recommendations': []
            }
            
            # Analyze compliance over time
            for audit in model_audits:
                audit_results = audit.get('results', {})
                compliance_status = audit_results.get('compliance_status', {})
                
                report['compliance_summary']['compliance_history'].append({
                    'timestamp': audit['stored_at'],
                    'compliant': compliance_status.get('overall_compliant', False),
                    'fairness_score': audit_results.get('overall_fairness_score', 0)
                })
            
            # Latest compliance status
            latest_audit = max(model_audits, key=lambda x: x['stored_at'])
            latest_compliance = latest_audit.get('results', {}).get('compliance_status', {})
            
            report['compliance_summary']['currently_compliant'] = latest_compliance.get('overall_compliant', False)
            
            # Collect outstanding issues
            for standard, status in latest_compliance.items():
                if isinstance(status, dict) and not status.get('compliant', True):
                    report['compliance_summary']['outstanding_issues'].extend(
                        status.get('issues', [])
                    )
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating compliance report: {str(e)}")
            return {'error': str(e)}


class ContinuousFairnessMonitor:
    """
    Continuous monitoring for fairness metrics in production.
    """
    
    def __init__(self):
        """
        Initialize continuous fairness monitor.
        """
        self.monitored_models = {}
        self.monitoring_tasks = {}
        
        logger.info("Continuous fairness monitor initialized")
    
    async def start_monitoring(
        self,
        model_id: str,
        monitoring_config: Dict[str, Any],
        alert_thresholds: Dict[str, float]
    ) -> str:
        """
        Start continuous monitoring for a model.
        
        Args:
            model_id: Model to monitor
            monitoring_config: Monitoring configuration
            alert_thresholds: Alert thresholds
            
        Returns:
            Monitoring ID
        """
        monitoring_id = f"monitor_{model_id}_{int(time.time())}"
        
        self.monitored_models[model_id] = {
            'monitoring_id': monitoring_id,
            'config': monitoring_config,
            'thresholds': alert_thresholds,
            'started_at': datetime.now().isoformat(),
            'status': 'active'
        }
        
        # In production, this would start a background monitoring task
        logger.info(f"Started monitoring for model {model_id}")
        
        return monitoring_id
    
    async def get_monitoring_status(self, model_id: str) -> Dict[str, Any]:
        """
        Get monitoring status for a model.
        
        Args:
            model_id: Model identifier
            
        Returns:
            Monitoring status
        """
        if model_id not in self.monitored_models:
            return {'error': f'No monitoring found for model {model_id}'}
        
        return self.monitored_models[model_id]
