"""
Performance Monitor for TrustStram v4.4 AI Explainability

Monitors explanation generation performance, tracks metrics, and provides insights.
"""

import asyncio
import logging
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """
    Comprehensive performance monitoring for explanation services.
    """
    
    def __init__(self, max_history: int = 10000):
        """
        Initialize performance monitor.
        
        Args:
            max_history: Maximum number of performance records to keep
        """
        self.max_history = max_history
        
        # Performance metrics storage
        self.explanation_metrics = deque(maxlen=max_history)
        self.method_metrics = defaultdict(lambda: deque(maxlen=max_history))
        self.model_metrics = defaultdict(lambda: deque(maxlen=max_history))
        self.stakeholder_metrics = defaultdict(lambda: deque(maxlen=max_history))
        
        # Real-time counters
        self.total_explanations = 0
        self.total_errors = 0
        self.active_requests = 0
        
        # Performance targets (from research requirements)
        self.performance_targets = {
            'simple_explanations_ms': 100,
            'shap_explanations_ms': 2000,
            'complex_counterfactuals_ms': 10000,
            'bias_audits_ms': 30000,
            'cache_hit_rate': 0.8
        }
        
        # Start time for uptime calculation
        self.start_time = time.time()
        
        logger.info("Performance monitor initialized")
    
    async def log_explanation(
        self,
        explanation_type: str,
        generation_time_ms: float,
        data_size_bytes: int,
        model_id: Optional[str] = None,
        stakeholder_type: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        additional_metrics: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Log explanation generation metrics.
        
        Args:
            explanation_type: Type of explanation generated
            generation_time_ms: Time taken to generate explanation
            data_size_bytes: Size of explanation data
            model_id: Model identifier
            stakeholder_type: Target stakeholder type
            success: Whether explanation generation was successful
            error_message: Error message if generation failed
            additional_metrics: Additional custom metrics
        """
        timestamp = datetime.now()
        
        metric_record = {
            'timestamp': timestamp,
            'explanation_type': explanation_type,
            'generation_time_ms': generation_time_ms,
            'data_size_bytes': data_size_bytes,
            'model_id': model_id,
            'stakeholder_type': stakeholder_type,
            'success': success,
            'error_message': error_message,
            'additional_metrics': additional_metrics or {}
        }
        
        # Store in appropriate metric collections
        self.explanation_metrics.append(metric_record)
        
        if explanation_type:
            self.method_metrics[explanation_type].append(metric_record)
        
        if model_id:
            self.model_metrics[model_id].append(metric_record)
        
        if stakeholder_type:
            self.stakeholder_metrics[stakeholder_type].append(metric_record)
        
        # Update counters
        self.total_explanations += 1
        if not success:
            self.total_errors += 1
        
        # Check performance against targets
        await self._check_performance_targets(explanation_type, generation_time_ms)
        
        logger.debug(f"Logged performance metric: {explanation_type} in {generation_time_ms:.2f}ms")
    
    async def start_request_tracking(self, request_id: str) -> None:
        """
        Start tracking an active request.
        
        Args:
            request_id: Unique request identifier
        """
        self.active_requests += 1
        logger.debug(f"Started tracking request: {request_id}. Active requests: {self.active_requests}")
    
    async def end_request_tracking(self, request_id: str) -> None:
        """
        End tracking an active request.
        
        Args:
            request_id: Unique request identifier
        """
        self.active_requests = max(0, self.active_requests - 1)
        logger.debug(f"Ended tracking request: {request_id}. Active requests: {self.active_requests}")
    
    async def get_metrics(
        self,
        time_window_minutes: int = 60,
        breakdown_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive performance metrics.
        
        Args:
            time_window_minutes: Time window for metrics calculation
            breakdown_by: Optional breakdown dimension ('method', 'model', 'stakeholder')
            
        Returns:
            Performance metrics dictionary
        """
        try:
            # Calculate time window
            cutoff_time = datetime.now() - timedelta(minutes=time_window_minutes)
            
            # Filter metrics by time window
            recent_metrics = [
                m for m in self.explanation_metrics 
                if m['timestamp'] > cutoff_time
            ]
            
            if not recent_metrics:
                return self._get_empty_metrics()
            
            # Calculate basic metrics
            basic_metrics = await self._calculate_basic_metrics(recent_metrics)
            
            # Calculate performance metrics
            performance_metrics = await self._calculate_performance_metrics(recent_metrics)
            
            # Calculate reliability metrics
            reliability_metrics = await self._calculate_reliability_metrics(recent_metrics)
            
            # Calculate efficiency metrics
            efficiency_metrics = await self._calculate_efficiency_metrics(recent_metrics)
            
            # Get breakdown metrics if requested
            breakdown_metrics = {}
            if breakdown_by:
                breakdown_metrics = await self._get_breakdown_metrics(recent_metrics, breakdown_by)
            
            # Performance targets comparison
            target_comparison = await self._compare_against_targets(recent_metrics)
            
            # System health indicators
            health_indicators = await self._calculate_health_indicators()
            
            return {
                'time_window_minutes': time_window_minutes,
                'total_explanations_period': len(recent_metrics),
                'basic_metrics': basic_metrics,
                'performance_metrics': performance_metrics,
                'reliability_metrics': reliability_metrics,
                'efficiency_metrics': efficiency_metrics,
                'breakdown_metrics': breakdown_metrics,
                'target_comparison': target_comparison,
                'health_indicators': health_indicators,
                'uptime_seconds': time.time() - self.start_time
            }
            
        except Exception as e:
            logger.error(f"Error calculating metrics: {str(e)}")
            return {'error': str(e)}
    
    async def _calculate_basic_metrics(
        self,
        metrics: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate basic performance metrics.
        
        Args:
            metrics: List of metric records
            
        Returns:
            Basic metrics dictionary
        """
        if not metrics:
            return {}
        
        generation_times = [m['generation_time_ms'] for m in metrics if m['success']]
        data_sizes = [m['data_size_bytes'] for m in metrics if m['success']]
        
        return {
            'avg_generation_time_ms': float(np.mean(generation_times)) if generation_times else 0,
            'median_generation_time_ms': float(np.median(generation_times)) if generation_times else 0,
            'p95_generation_time_ms': float(np.percentile(generation_times, 95)) if generation_times else 0,
            'p99_generation_time_ms': float(np.percentile(generation_times, 99)) if generation_times else 0,
            'min_generation_time_ms': float(np.min(generation_times)) if generation_times else 0,
            'max_generation_time_ms': float(np.max(generation_times)) if generation_times else 0,
            'std_generation_time_ms': float(np.std(generation_times)) if generation_times else 0,
            'avg_data_size_bytes': float(np.mean(data_sizes)) if data_sizes else 0,
            'total_data_bytes': float(np.sum(data_sizes)) if data_sizes else 0
        }
    
    async def _calculate_performance_metrics(
        self,
        metrics: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate performance-specific metrics.
        
        Args:
            metrics: List of metric records
            
        Returns:
            Performance metrics dictionary
        """
        if not metrics:
            return {}
        
        # Throughput calculation
        if len(metrics) > 1:
            time_span = (metrics[-1]['timestamp'] - metrics[0]['timestamp']).total_seconds()
            throughput_per_second = len(metrics) / time_span if time_span > 0 else 0
        else:
            throughput_per_second = 0
        
        # Method-specific performance
        method_performance = {}
        for explanation_type in set(m['explanation_type'] for m in metrics if m['explanation_type']):
            method_metrics = [m for m in metrics if m['explanation_type'] == explanation_type and m['success']]
            if method_metrics:
                times = [m['generation_time_ms'] for m in method_metrics]
                method_performance[explanation_type] = {
                    'avg_time_ms': float(np.mean(times)),
                    'count': len(method_metrics),
                    'success_rate': len(method_metrics) / len([m for m in metrics if m['explanation_type'] == explanation_type])
                }
        
        return {
            'throughput_per_second': throughput_per_second,
            'throughput_per_minute': throughput_per_second * 60,
            'method_performance': method_performance,
            'active_requests': self.active_requests
        }
    
    async def _calculate_reliability_metrics(
        self,
        metrics: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate reliability metrics.
        
        Args:
            metrics: List of metric records
            
        Returns:
            Reliability metrics dictionary
        """
        if not metrics:
            return {}
        
        successful_requests = len([m for m in metrics if m['success']])
        total_requests = len(metrics)
        success_rate = successful_requests / total_requests if total_requests > 0 else 0
        
        # Error analysis
        error_metrics = [m for m in metrics if not m['success']]
        error_types = {}
        for error_metric in error_metrics:
            error_msg = error_metric.get('error_message', 'Unknown error')
            error_type = error_msg.split(':')[0] if ':' in error_msg else error_msg
            error_types[error_type] = error_types.get(error_type, 0) + 1
        
        return {
            'success_rate': success_rate,
            'error_rate': 1 - success_rate,
            'total_errors': len(error_metrics),
            'error_breakdown': error_types,
            'availability_score': success_rate  # Simplified availability calculation
        }
    
    async def _calculate_efficiency_metrics(
        self,
        metrics: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate efficiency metrics.
        
        Args:
            metrics: List of metric records
            
        Returns:
            Efficiency metrics dictionary
        """
        if not metrics:
            return {}
        
        successful_metrics = [m for m in metrics if m['success']]
        
        if not successful_metrics:
            return {'efficiency_score': 0.0}
        
        # Time efficiency (lower is better)
        times = [m['generation_time_ms'] for m in successful_metrics]
        avg_time = np.mean(times)
        time_efficiency = 1 / (1 + avg_time / 1000)  # Normalize to 0-1 scale
        
        # Data efficiency (explanations per byte)
        sizes = [m['data_size_bytes'] for m in successful_metrics]
        avg_size = np.mean(sizes)
        data_efficiency = 1 / (1 + avg_size / 10000)  # Normalize to 0-1 scale
        
        # Resource utilization efficiency
        resource_efficiency = min(1.0, len(successful_metrics) / 100)  # Normalize by expected load
        
        # Combined efficiency score
        efficiency_score = (time_efficiency + data_efficiency + resource_efficiency) / 3
        
        return {
            'efficiency_score': efficiency_score,
            'time_efficiency': time_efficiency,
            'data_efficiency': data_efficiency,
            'resource_efficiency': resource_efficiency,
            'avg_time_per_mb': avg_time / (avg_size / 1024 / 1024) if avg_size > 0 else 0
        }
    
    async def _get_breakdown_metrics(
        self,
        metrics: List[Dict[str, Any]],
        breakdown_by: str
    ) -> Dict[str, Any]:
        """
        Get metrics broken down by specific dimension.
        
        Args:
            metrics: List of metric records
            breakdown_by: Breakdown dimension
            
        Returns:
            Breakdown metrics dictionary
        """
        breakdown_data = {}
        
        # Group metrics by breakdown dimension
        if breakdown_by == 'method':
            groups = defaultdict(list)
            for m in metrics:
                if m['explanation_type']:
                    groups[m['explanation_type']].append(m)
        
        elif breakdown_by == 'model':
            groups = defaultdict(list)
            for m in metrics:
                if m['model_id']:
                    groups[m['model_id']].append(m)
        
        elif breakdown_by == 'stakeholder':
            groups = defaultdict(list)
            for m in metrics:
                if m['stakeholder_type']:
                    groups[m['stakeholder_type']].append(m)
        
        else:
            return {'error': f'Invalid breakdown dimension: {breakdown_by}'}
        
        # Calculate metrics for each group
        for group_name, group_metrics in groups.items():
            successful = [m for m in group_metrics if m['success']]
            
            if successful:
                times = [m['generation_time_ms'] for m in successful]
                breakdown_data[group_name] = {
                    'count': len(group_metrics),
                    'success_count': len(successful),
                    'success_rate': len(successful) / len(group_metrics),
                    'avg_time_ms': float(np.mean(times)),
                    'median_time_ms': float(np.median(times)),
                    'p95_time_ms': float(np.percentile(times, 95))
                }
            else:
                breakdown_data[group_name] = {
                    'count': len(group_metrics),
                    'success_count': 0,
                    'success_rate': 0.0,
                    'avg_time_ms': 0.0,
                    'median_time_ms': 0.0,
                    'p95_time_ms': 0.0
                }
        
        return breakdown_data
    
    async def _compare_against_targets(
        self,
        metrics: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Compare performance against targets.
        
        Args:
            metrics: List of metric records
            
        Returns:
            Target comparison dictionary
        """
        if not metrics:
            return {}
        
        successful_metrics = [m for m in metrics if m['success']]
        comparison = {}
        
        # Check each target
        for target_name, target_value in self.performance_targets.items():
            if target_name == 'simple_explanations_ms':
                # Simple explanations should be under 100ms
                simple_metrics = [
                    m for m in successful_metrics 
                    if m['explanation_type'] in ['feature_importance', 'simple']
                ]
                if simple_metrics:
                    times = [m['generation_time_ms'] for m in simple_metrics]
                    avg_time = np.mean(times)
                    comparison[target_name] = {
                        'target': target_value,
                        'actual': avg_time,
                        'meets_target': avg_time <= target_value,
                        'percentage_of_target': (avg_time / target_value) * 100
                    }
            
            elif target_name == 'shap_explanations_ms':
                # SHAP explanations should be under 2 seconds
                shap_metrics = [
                    m for m in successful_metrics 
                    if m['explanation_type'] == 'shap'
                ]
                if shap_metrics:
                    times = [m['generation_time_ms'] for m in shap_metrics]
                    avg_time = np.mean(times)
                    comparison[target_name] = {
                        'target': target_value,
                        'actual': avg_time,
                        'meets_target': avg_time <= target_value,
                        'percentage_of_target': (avg_time / target_value) * 100
                    }
            
            elif target_name == 'complex_counterfactuals_ms':
                # Complex counterfactuals should be under 10 seconds
                cf_metrics = [
                    m for m in successful_metrics 
                    if m['explanation_type'] == 'counterfactual'
                ]
                if cf_metrics:
                    times = [m['generation_time_ms'] for m in cf_metrics]
                    avg_time = np.mean(times)
                    comparison[target_name] = {
                        'target': target_value,
                        'actual': avg_time,
                        'meets_target': avg_time <= target_value,
                        'percentage_of_target': (avg_time / target_value) * 100
                    }
        
        return comparison
    
    async def _calculate_health_indicators(self) -> Dict[str, Any]:
        """
        Calculate system health indicators.
        
        Returns:
            Health indicators dictionary
        """
        recent_errors = len([
            m for m in list(self.explanation_metrics)[-100:] 
            if not m['success']
        ])
        
        error_rate = recent_errors / min(100, len(self.explanation_metrics))
        
        # Determine health status
        if error_rate <= 0.01:  # 1% error rate
            health_status = 'excellent'
        elif error_rate <= 0.05:  # 5% error rate
            health_status = 'good'
        elif error_rate <= 0.10:  # 10% error rate
            health_status = 'fair'
        else:
            health_status = 'poor'
        
        return {
            'health_status': health_status,
            'recent_error_rate': error_rate,
            'total_explanations': self.total_explanations,
            'total_errors': self.total_errors,
            'overall_error_rate': self.total_errors / max(1, self.total_explanations),
            'active_requests': self.active_requests,
            'uptime_hours': (time.time() - self.start_time) / 3600
        }
    
    def _get_empty_metrics(self) -> Dict[str, Any]:
        """
        Get empty metrics structure for when no data is available.
        
        Returns:
            Empty metrics dictionary
        """
        return {
            'message': 'No metrics available for the specified time window',
            'total_explanations_period': 0,
            'basic_metrics': {},
            'performance_metrics': {'throughput_per_second': 0, 'active_requests': self.active_requests},
            'reliability_metrics': {'success_rate': 0, 'error_rate': 0},
            'efficiency_metrics': {'efficiency_score': 0},
            'health_indicators': await self._calculate_health_indicators()
        }
    
    async def _check_performance_targets(
        self,
        explanation_type: str,
        generation_time_ms: float
    ) -> None:
        """
        Check if performance meets targets and log warnings if not.
        
        Args:
            explanation_type: Type of explanation
            generation_time_ms: Generation time in milliseconds
        """
        target_exceeded = False
        
        if explanation_type in ['feature_importance', 'simple']:
            if generation_time_ms > self.performance_targets['simple_explanations_ms']:
                target_exceeded = True
                logger.warning(f"Simple explanation exceeded target: {generation_time_ms:.2f}ms > {self.performance_targets['simple_explanations_ms']}ms")
        
        elif explanation_type == 'shap':
            if generation_time_ms > self.performance_targets['shap_explanations_ms']:
                target_exceeded = True
                logger.warning(f"SHAP explanation exceeded target: {generation_time_ms:.2f}ms > {self.performance_targets['shap_explanations_ms']}ms")
        
        elif explanation_type == 'counterfactual':
            if generation_time_ms > self.performance_targets['complex_counterfactuals_ms']:
                target_exceeded = True
                logger.warning(f"Counterfactual explanation exceeded target: {generation_time_ms:.2f}ms > {self.performance_targets['complex_counterfactuals_ms']}ms")
        
        if target_exceeded:
            # Could trigger alerts or auto-scaling here
            pass
    
    async def get_real_time_metrics(self) -> Dict[str, Any]:
        """
        Get real-time performance metrics for monitoring dashboards.
        
        Returns:
            Real-time metrics dictionary
        """
        # Get metrics from last 5 minutes
        recent_metrics = await self.get_metrics(time_window_minutes=5)
        
        # Add real-time indicators
        current_time = datetime.now()
        last_minute_metrics = [
            m for m in self.explanation_metrics 
            if m['timestamp'] > current_time - timedelta(minutes=1)
        ]
        
        return {
            'current_timestamp': current_time.isoformat(),
            'active_requests': self.active_requests,
            'requests_last_minute': len(last_minute_metrics),
            'avg_response_time_last_minute': np.mean([
                m['generation_time_ms'] for m in last_minute_metrics if m['success']
            ]) if last_minute_metrics else 0,
            'error_rate_last_minute': len([
                m for m in last_minute_metrics if not m['success']
            ]) / max(1, len(last_minute_metrics)),
            'recent_metrics': recent_metrics
        }
