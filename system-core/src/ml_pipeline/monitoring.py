from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import logging
import statistics

class AlertSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class MetricData:
    name: str
    value: float
    timestamp: datetime
    tags: Dict[str, str]
    unit: str = ""

@dataclass
class Alert:
    id: str
    severity: AlertSeverity
    message: str
    timestamp: datetime
    source: str
    resolved: bool = False
    resolved_at: Optional[datetime] = None

class MetricCollector:
    """Collects and stores metrics"""
    
    def __init__(self, retention_days: int = 30):
        self.metrics: Dict[str, List[MetricData]] = {}
        self.retention_days = retention_days
        self.logger = logging.getLogger("metric_collector")
    
    def record_metric(self, name: str, value: float, tags: Dict[str, str] = None, unit: str = ""):
        """Record a metric value"""
        metric = MetricData(
            name=name,
            value=value,
            timestamp=datetime.now(),
            tags=tags or {},
            unit=unit
        )
        
        if name not in self.metrics:
            self.metrics[name] = []
        
        self.metrics[name].append(metric)
        self._cleanup_old_metrics()
    
    def get_metrics(self, name: str, 
                   start_time: Optional[datetime] = None,
                   end_time: Optional[datetime] = None) -> List[MetricData]:
        """Get metrics within time range"""
        if name not in self.metrics:
            return []
        
        metrics = self.metrics[name]
        
        if start_time:
            metrics = [m for m in metrics if m.timestamp >= start_time]
        
        if end_time:
            metrics = [m for m in metrics if m.timestamp <= end_time]
        
        return metrics
    
    def get_latest_metric(self, name: str) -> Optional[MetricData]:
        """Get the latest metric value"""
        if name not in self.metrics or not self.metrics[name]:
            return None
        
        return max(self.metrics[name], key=lambda m: m.timestamp)
    
    def calculate_aggregation(self, name: str, 
                            aggregation: str,
                            start_time: Optional[datetime] = None,
                            end_time: Optional[datetime] = None) -> Optional[float]:
        """Calculate metric aggregation"""
        metrics = self.get_metrics(name, start_time, end_time)
        
        if not metrics:
            return None
        
        values = [m.value for m in metrics]
        
        if aggregation == "avg":
            return statistics.mean(values)
        elif aggregation == "sum":
            return sum(values)
        elif aggregation == "min":
            return min(values)
        elif aggregation == "max":
            return max(values)
        elif aggregation == "count":
            return len(values)
        elif aggregation == "median":
            return statistics.median(values)
        else:
            raise ValueError(f"Unknown aggregation: {aggregation}")
    
    def _cleanup_old_metrics(self):
        """Remove metrics older than retention period"""
        cutoff_time = datetime.now() - timedelta(days=self.retention_days)
        
        for name in self.metrics:
            self.metrics[name] = [
                m for m in self.metrics[name] 
                if m.timestamp >= cutoff_time
            ]

class AlertManager:
    """Manages alerts and notifications"""
    
    def __init__(self):
        self.alerts: Dict[str, Alert] = {}
        self.notification_handlers: List[Callable[[Alert], None]] = []
        self.logger = logging.getLogger("alert_manager")
    
    def add_notification_handler(self, handler: Callable[[Alert], None]):
        """Add a notification handler"""
        self.notification_handlers.append(handler)
    
    def create_alert(self, 
                    alert_id: str,
                    severity: AlertSeverity,
                    message: str,
                    source: str) -> Alert:
        """Create a new alert"""
        alert = Alert(
            id=alert_id,
            severity=severity,
            message=message,
            timestamp=datetime.now(),
            source=source
        )
        
        self.alerts[alert_id] = alert
        
        # Send notifications
        for handler in self.notification_handlers:
            try:
                handler(alert)
            except Exception as e:
                self.logger.error(f"Notification handler failed: {e}")
        
        return alert
    
    def resolve_alert(self, alert_id: str):
        """Mark an alert as resolved"""
        if alert_id in self.alerts:
            self.alerts[alert_id].resolved = True
            self.alerts[alert_id].resolved_at = datetime.now()
    
    def get_active_alerts(self, severity: Optional[AlertSeverity] = None) -> List[Alert]:
        """Get active alerts"""
        alerts = [a for a in self.alerts.values() if not a.resolved]
        
        if severity:
            alerts = [a for a in alerts if a.severity == severity]
        
        return alerts

class ModelMonitor:
    """Monitors model performance and health"""
    
    def __init__(self, metric_collector: MetricCollector, alert_manager: AlertManager):
        self.metric_collector = metric_collector
        self.alert_manager = alert_manager
        self.thresholds: Dict[str, Dict[str, float]] = {}
        self.logger = logging.getLogger("model_monitor")
    
    def set_threshold(self, metric_name: str, threshold_type: str, value: float):
        """Set monitoring threshold"""
        if metric_name not in self.thresholds:
            self.thresholds[metric_name] = {}
        
        self.thresholds[metric_name][threshold_type] = value
    
    def record_prediction(self, model_id: str, 
                         input_features: Dict[str, Any],
                         prediction: Any,
                         actual: Any = None,
                         latency: float = None):
        """Record a model prediction for monitoring"""
        tags = {"model_id": model_id}
        
        # Record prediction count
        self.metric_collector.record_metric("predictions_total", 1, tags)
        
        # Record latency if provided
        if latency is not None:
            self.metric_collector.record_metric("prediction_latency", latency, tags, "ms")
        
        # Record accuracy if actual value is provided
        if actual is not None:
            accuracy = 1.0 if prediction == actual else 0.0
            self.metric_collector.record_metric("prediction_accuracy", accuracy, tags)
        
        # Check thresholds
        self._check_thresholds(model_id)
    
    def record_model_health(self, model_id: str, health_score: float):
        """Record model health score"""
        tags = {"model_id": model_id}
        self.metric_collector.record_metric("model_health", health_score, tags)
        self._check_thresholds(model_id)
    
    def _check_thresholds(self, model_id: str):
        """Check if any thresholds are violated"""
        for metric_name, thresholds in self.thresholds.items():
            latest_metric = self.metric_collector.get_latest_metric(metric_name)
            
            if not latest_metric:
                continue
            
            # Check if metric is for this model
            if latest_metric.tags.get("model_id") != model_id:
                continue
            
            value = latest_metric.value
            
            # Check max threshold
            if "max" in thresholds and value > thresholds["max"]:
                alert_id = f"{model_id}_{metric_name}_max_exceeded"
                self.alert_manager.create_alert(
                    alert_id=alert_id,
                    severity=AlertSeverity.WARNING,
                    message=f"Metric {metric_name} exceeded max threshold: {value} > {thresholds['max']}",
                    source=f"model_monitor:{model_id}"
                )
            
            # Check min threshold
            if "min" in thresholds and value < thresholds["min"]:
                alert_id = f"{model_id}_{metric_name}_min_breached"
                self.alert_manager.create_alert(
                    alert_id=alert_id,
                    severity=AlertSeverity.WARNING,
                    message=f"Metric {metric_name} below min threshold: {value} < {thresholds['min']}",
                    source=f"model_monitor:{model_id}"
                )
    
    async def run_health_check(self, model_id: str) -> Dict[str, Any]:
        """Run comprehensive health check for a model"""
        health_report = {
            "model_id": model_id,
            "timestamp": datetime.now().isoformat(),
            "status": "healthy",
            "metrics": {},
            "alerts": []
        }
        
        # Get recent metrics
        recent_time = datetime.now() - timedelta(hours=1)
        
        for metric_name in ["predictions_total", "prediction_latency", "prediction_accuracy", "model_health"]:
            metrics = self.metric_collector.get_metrics(metric_name, start_time=recent_time)
            model_metrics = [m for m in metrics if m.tags.get("model_id") == model_id]
            
            if model_metrics:
                avg_value = statistics.mean([m.value for m in model_metrics])
                health_report["metrics"][metric_name] = {
                    "average": avg_value,
                    "count": len(model_metrics),
                    "latest": model_metrics[-1].value
                }
        
        # Get active alerts for this model
        active_alerts = self.alert_manager.get_active_alerts()
        model_alerts = [a for a in active_alerts if model_id in a.source]
        
        health_report["alerts"] = [{
            "id": a.id,
            "severity": a.severity.value,
            "message": a.message,
            "timestamp": a.timestamp.isoformat()
        } for a in model_alerts]
        
        # Determine overall status
        if any(a.severity in [AlertSeverity.ERROR, AlertSeverity.CRITICAL] for a in model_alerts):
            health_report["status"] = "unhealthy"
        elif model_alerts:
            health_report["status"] = "degraded"
        
        return health_report
