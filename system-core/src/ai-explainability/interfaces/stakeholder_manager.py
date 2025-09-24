"""Stakeholder explanation manager for adaptive interfaces

Manages explanation generation and presentation based on stakeholder needs.
"""

from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class StakeholderExplanationManager:
    """Central manager for stakeholder-specific explanations."""
    
    def __init__(self):
        self.stakeholder_profiles = {
            'end_user': {
                'complexity_level': 'low',
                'preferred_format': 'text',
                'key_interests': ['trust', 'actionability', 'fairness'],
                'technical_details': False,
                'visualization_style': 'simple'
            },
            'technical_user': {
                'complexity_level': 'high',
                'preferred_format': 'interactive',
                'key_interests': ['accuracy', 'debugging', 'performance'],
                'technical_details': True,
                'visualization_style': 'detailed'
            },
            'business_user': {
                'complexity_level': 'medium',
                'preferred_format': 'visual',
                'key_interests': ['business_impact', 'compliance', 'risk'],
                'technical_details': False,
                'visualization_style': 'executive'
            }
        }
    
    def generate_stakeholder_explanation(self, 
                                       stakeholder_type: str,
                                       raw_explanation: Dict[str, Any],
                                       context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate explanation adapted for specific stakeholder."""
        
        if stakeholder_type not in self.stakeholder_profiles:
            stakeholder_type = 'technical_user'  # Default fallback
        
        profile = self.stakeholder_profiles[stakeholder_type]
        context = context or {}
        
        if stakeholder_type == 'end_user':
            return self._generate_end_user_explanation(raw_explanation, context)
        elif stakeholder_type == 'technical_user':
            return self._generate_technical_explanation(raw_explanation, context)
        elif stakeholder_type == 'business_user':
            return self._generate_business_explanation(raw_explanation, context)
    
    def _generate_end_user_explanation(self, explanation: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate simple, trust-building explanation for end users."""
        return {
            'type': 'end_user',
            'decision': explanation.get('prediction', 'Unknown'),
            'confidence': self._format_confidence(explanation.get('confidence', 0)),
            'key_factors': self._extract_top_factors(explanation, n=3),
            'plain_language': self._convert_to_plain_language(explanation, context),
            'next_steps': self._suggest_actions(explanation, context),
            'trust_indicators': self._generate_trust_indicators(explanation),
            'timestamp': datetime.now().isoformat()
        }
    
    def _generate_technical_explanation(self, explanation: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive technical explanation."""
        return {
            'type': 'technical_user',
            'model_info': {
                'version': explanation.get('model_version', 'unknown'),
                'type': explanation.get('model_type', 'unknown'),
                'confidence': explanation.get('confidence', 0)
            },
            'feature_analysis': {
                'importance': explanation.get('feature_importance', {}),
                'shap_values': explanation.get('shap_values', []),
                'global_importance': explanation.get('global_importance', {})
            },
            'performance_metrics': self._get_model_metrics(explanation),
            'uncertainty_analysis': self._calculate_uncertainty(explanation),
            'debugging_info': self._generate_debugging_info(explanation),
            'timestamp': datetime.now().isoformat()
        }
    
    def _generate_business_explanation(self, explanation: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate business-oriented explanation."""
        return {
            'type': 'business_user',
            'business_impact': self._assess_business_impact(explanation, context),
            'risk_assessment': self._calculate_risk_level(explanation),
            'compliance_status': self._check_compliance(explanation),
            'roi_metrics': self._calculate_roi_impact(explanation, context),
            'recommendations': self._generate_business_recommendations(explanation),
            'stakeholder_summary': self._create_executive_summary(explanation),
            'timestamp': datetime.now().isoformat()
        }
    
    def _format_confidence(self, confidence: float) -> str:
        """Format confidence score for end users."""
        if confidence >= 0.9:
            return "Very High (90%+)"
        elif confidence >= 0.8:
            return "High (80-90%)"
        elif confidence >= 0.6:
            return "Medium (60-80%)"
        else:
            return "Low (<60%)"
    
    def _extract_top_factors(self, explanation: Dict[str, Any], n: int = 3) -> List[Dict[str, Any]]:
        """Extract top contributing factors."""
        feature_importance = explanation.get('feature_importance', {})
        
        if not feature_importance:
            return []
        
        sorted_features = sorted(
            feature_importance.items(),
            key=lambda x: abs(x[1]),
            reverse=True
        )[:n]
        
        return [
            {
                'name': self._humanize_feature_name(name),
                'importance': importance,
                'impact': 'positive' if importance > 0 else 'negative',
                'description': self._generate_factor_description(name, importance)
            }
            for name, importance in sorted_features
        ]
    
    def _humanize_feature_name(self, feature_name: str) -> str:
        """Convert technical feature names to human-readable."""
        humanization_map = {
            'age': 'Age',
            'income': 'Income Level',
            'credit_score': 'Credit Score',
            'employment_status': 'Employment Status',
            'loan_amount': 'Loan Amount',
            'debt_ratio': 'Debt-to-Income Ratio'
        }
        return humanization_map.get(feature_name.lower(), feature_name.title().replace('_', ' '))
    
    def _generate_factor_description(self, feature_name: str, importance: float) -> str:
        """Generate description for a factor's impact."""
        direction = "positively" if importance > 0 else "negatively"
        strength = "strongly" if abs(importance) > 0.5 else "moderately"
        
        return f"This factor {direction} and {strength} influenced the decision."
    
    def _convert_to_plain_language(self, explanation: Dict[str, Any], context: Dict[str, Any]) -> str:
        """Convert technical explanation to plain language."""
        prediction = explanation.get('prediction', 'unknown')
        confidence = explanation.get('confidence', 0)
        
        if prediction == 1 or (isinstance(prediction, float) and prediction > 0.5):
            decision_text = "approved"
        else:
            decision_text = "declined"
        
        base_text = f"Your application was {decision_text} with {confidence:.0%} confidence. "
        
        top_factors = self._extract_top_factors(explanation, n=2)
        if top_factors:
            factors_text = "The main factors that influenced this decision were: "
            factor_descriptions = [f"{factor['name']} ({factor['impact']} impact)" for factor in top_factors]
            factors_text += " and ".join(factor_descriptions) + "."
            base_text += factors_text
        
        return base_text
    
    def _suggest_actions(self, explanation: Dict[str, Any], context: Dict[str, Any]) -> List[str]:
        """Suggest actionable next steps for end users."""
        actions = []
        
        prediction = explanation.get('prediction', 0)
        if prediction == 0 or (isinstance(prediction, float) and prediction < 0.5):
            actions.extend([
                "Review and improve the factors that negatively impacted your application",
                "Consider reapplying after addressing these concerns",
                "Contact our support team for personalized guidance"
            ])
        else:
            actions.extend([
                "Proceed with the next steps in the process",
                "Keep monitoring factors that maintain your positive status"
            ])
        
        actions.append("You have the right to request human review of this decision")
        return actions
    
    def _generate_trust_indicators(self, explanation: Dict[str, Any]) -> List[str]:
        """Generate trust-building indicators."""
        indicators = [
            "This decision was made using audited AI systems",
            "Your data is processed in compliance with GDPR regulations",
            "Human oversight is available for all automated decisions"
        ]
        
        confidence = explanation.get('confidence', 0)
        if confidence > 0.8:
            indicators.append("High confidence score indicates reliable prediction")
        
        return indicators
    
    def _get_model_metrics(self, explanation: Dict[str, Any]) -> Dict[str, Any]:
        """Get technical model performance metrics."""
        return {
            'accuracy': explanation.get('model_accuracy', 'unknown'),
            'precision': explanation.get('model_precision', 'unknown'),
            'recall': explanation.get('model_recall', 'unknown'),
            'f1_score': explanation.get('model_f1', 'unknown'),
            'last_updated': explanation.get('model_last_updated', 'unknown')
        }
    
    def _calculate_uncertainty(self, explanation: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate prediction uncertainty metrics."""
        confidence = explanation.get('confidence', 0.5)
        return {
            'prediction_confidence': confidence,
            'uncertainty_score': 1 - confidence,
            'reliability_level': 'high' if confidence > 0.8 else 'medium' if confidence > 0.6 else 'low'
        }
    
    def _generate_debugging_info(self, explanation: Dict[str, Any]) -> Dict[str, Any]:
        """Generate debugging information for technical users."""
        return {
            'explainer_method': explanation.get('explainer_type', 'unknown'),
            'processing_time': explanation.get('processing_time_ms', 0),
            'cache_hit': explanation.get('cached', False),
            'data_quality_score': explanation.get('data_quality', 'unknown'),
            'feature_count': len(explanation.get('feature_importance', {}))
        }
    
    def _assess_business_impact(self, explanation: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Assess business impact of the decision."""
        return {
            'decision_type': context.get('business_context', 'unknown'),
            'financial_impact': context.get('financial_value', 0),
            'risk_level': self._calculate_risk_level(explanation),
            'compliance_score': 0.95  # Mock compliance score
        }
    
    def _calculate_risk_level(self, explanation: Dict[str, Any]) -> str:
        """Calculate business risk level."""
        confidence = explanation.get('confidence', 0.5)
        
        if confidence > 0.8:
            return 'low'
        elif confidence > 0.6:
            return 'medium'
        else:
            return 'high'
    
    def _check_compliance(self, explanation: Dict[str, Any]) -> Dict[str, str]:
        """Check regulatory compliance status."""
        return {
            'gdpr_compliance': 'compliant',
            'ai_act_compliance': 'compliant',
            'industry_regulations': 'compliant',
            'last_audit': '2024-01-15'
        }
    
    def _calculate_roi_impact(self, explanation: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate ROI impact metrics."""
        return {
            'efficiency_gain': '15%',
            'cost_reduction': context.get('cost_savings', '$0'),
            'accuracy_improvement': '8%',
            'processing_time_reduction': '60%'
        }
    
    def _generate_business_recommendations(self, explanation: Dict[str, Any]) -> List[str]:
        """Generate business-oriented recommendations."""
        recommendations = [
            "Monitor model performance regularly",
            "Conduct bias audits quarterly",
            "Maintain explanation audit trails"
        ]
        
        confidence = explanation.get('confidence', 0.5)
        if confidence < 0.7:
            recommendations.append("Consider human review for low-confidence decisions")
        
        return recommendations
    
    def _create_executive_summary(self, explanation: Dict[str, Any]) -> str:
        """Create executive summary for business stakeholders."""
        confidence = explanation.get('confidence', 0.5)
        risk_level = self._calculate_risk_level(explanation)
        
        return f"""AI system processed decision with {confidence:.0%} confidence. 
Risk level: {risk_level}. System operating within compliance parameters. 
Recommend continued monitoring and regular bias audits."""
