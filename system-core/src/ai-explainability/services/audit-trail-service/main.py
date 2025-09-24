"""
Audit Trail Service for TrustStram v4.4

Integrates MLflow and DVC for comprehensive model versioning,
decision logging, and audit trail creation with regulatory compliance.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Union

import pandas as pd
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import hashlib
import uuid

# MLflow imports
try:
    import mlflow
    import mlflow.sklearn
    from mlflow.tracking import MlflowClient
except ImportError:
    logging.warning("MLflow not available. Install with: pip install mlflow")
    mlflow = None

# Database imports for audit storage
try:
    import sqlalchemy
    from sqlalchemy import create_engine, Column, String, Text, DateTime, Float, Integer
    from sqlalchemy.ext.declarative import declarative_base
    from sqlalchemy.orm import sessionmaker
except ImportError:
    logging.warning("SQLAlchemy not available. Install with: pip install sqlalchemy")
    sqlalchemy = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TrustStram Audit Trail Service",
    description="Comprehensive audit trail with MLflow integration and regulatory compliance",
    version="4.4.0"
)

# Request/Response Models
class DecisionLogRequest(BaseModel):
    model_id: str
    model_version: str
    instance_id: str
    input_data: Dict[str, Any]
    prediction: Any
    explanation_data: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    compliance_context: Optional[Dict[str, Any]] = None
    
class AuditQueryRequest(BaseModel):
    model_id: Optional[str] = None
    date_range: Optional[Dict[str, str]] = None  # {'start': 'ISO_date', 'end': 'ISO_date'}
    user_id: Optional[str] = None
    decision_type: Optional[str] = None
    compliance_flags: Optional[List[str]] = None
    limit: Optional[int] = 1000
    
class ModelVersionRequest(BaseModel):
    model_id: str
    model_artifact_path: str
    model_metadata: Dict[str, Any]
    training_data_version: Optional[str] = None
    experiment_id: Optional[str] = None
    
class ComplianceReportRequest(BaseModel):
    model_id: str
    report_type: str  # 'gdpr', 'ai_act', 'sox', 'custom'
    date_range: Dict[str, str]
    include_explanations: bool = True
    
class AuditResponse(BaseModel):
    audit_id: str
    model_id: str
    timestamp: str
    status: str
    
class ComplianceReportResponse(BaseModel):
    report_id: str
    model_id: str
    report_type: str
    generated_at: str
    total_decisions: int
    compliance_summary: Dict[str, Any]
    report_url: Optional[str] = None
    
class HealthResponse(BaseModel):
    status: str
    version: str
    mlflow_status: str
    audit_records_count: int
    oldest_record: Optional[str] = None

# Global components
audit_service = None
mlflow_manager = None
START_TIME = time.time()

@app.on_event("startup")
async def startup_event():
    """Initialize audit trail components."""
    global audit_service, mlflow_manager
    
    try:
        audit_service = AuditTrailService()
        mlflow_manager = MLflowManager()
        
        await audit_service.initialize()
        await mlflow_manager.initialize()
        
        logger.info("Audit trail service initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize audit trail service: {str(e)}")
        raise

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    try:
        mlflow_status = "healthy" if mlflow_manager and mlflow_manager.client else "unavailable"
        
        audit_count = await audit_service.get_audit_count() if audit_service else 0
        oldest_record = await audit_service.get_oldest_record() if audit_service else None
        
        return HealthResponse(
            status="healthy",
            version="4.4.0",
            mlflow_status=mlflow_status,
            audit_records_count=audit_count,
            oldest_record=oldest_record
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return HealthResponse(
            status="unhealthy",
            version="4.4.0",
            mlflow_status="unknown",
            audit_records_count=0
        )

@app.post("/log-decision", response_model=AuditResponse)
async def log_decision(
    request: DecisionLogRequest,
    background_tasks: BackgroundTasks
):
    """Log a model decision for audit trail."""
    try:
        audit_id = await audit_service.log_decision(
            model_id=request.model_id,
            model_version=request.model_version,
            instance_id=request.instance_id,
            input_data=request.input_data,
            prediction=request.prediction,
            explanation_data=request.explanation_data,
            confidence_score=request.confidence_score,
            user_id=request.user_id,
            session_id=request.session_id,
            compliance_context=request.compliance_context
        )
        
        # Background task for additional processing
        background_tasks.add_task(
            audit_service.process_audit_record,
            audit_id
        )
        
        return AuditResponse(
            audit_id=audit_id,
            model_id=request.model_id,
            timestamp=datetime.now().isoformat(),
            status="logged"
        )
        
    except Exception as e:
        logger.error(f"Error logging decision: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/register-model-version")
async def register_model_version(
    request: ModelVersionRequest
):
    """Register a new model version with MLflow."""
    try:
        version_info = await mlflow_manager.register_model_version(
            model_id=request.model_id,
            model_artifact_path=request.model_artifact_path,
            model_metadata=request.model_metadata,
            training_data_version=request.training_data_version,
            experiment_id=request.experiment_id
        )
        
        return {
            'model_id': request.model_id,
            'version': version_info['version'],
            'mlflow_run_id': version_info['run_id'],
            'status': 'registered',
            'registered_at': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error registering model version: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query-audit")
async def query_audit_trail(
    request: AuditQueryRequest
):
    """Query audit trail records."""
    try:
        records = await audit_service.query_audit_records(
            model_id=request.model_id,
            date_range=request.date_range,
            user_id=request.user_id,
            decision_type=request.decision_type,
            compliance_flags=request.compliance_flags,
            limit=request.limit
        )
        
        return {
            'total_records': len(records),
            'query_timestamp': datetime.now().isoformat(),
            'records': records
        }
        
    except Exception as e:
        logger.error(f"Error querying audit trail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/compliance-report", response_model=ComplianceReportResponse)
async def generate_compliance_report(
    request: ComplianceReportRequest,
    background_tasks: BackgroundTasks
):
    """Generate compliance report."""
    try:
        report_id = await audit_service.generate_compliance_report(
            model_id=request.model_id,
            report_type=request.report_type,
            date_range=request.date_range,
            include_explanations=request.include_explanations
        )
        
        # Background task for report generation
        background_tasks.add_task(
            audit_service.process_compliance_report,
            report_id
        )
        
        return ComplianceReportResponse(
            report_id=report_id,
            model_id=request.model_id,
            report_type=request.report_type,
            generated_at=datetime.now().isoformat(),
            total_decisions=0,  # Will be filled by background task
            compliance_summary={}
        )
        
    except Exception as e:
        logger.error(f"Error generating compliance report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/audit/{audit_id}")
async def get_audit_record(audit_id: str):
    """Get specific audit record by ID."""
    try:
        record = await audit_service.get_audit_record(audit_id)
        
        if not record:
            raise HTTPException(status_code=404, detail="Audit record not found")
        
        return record
        
    except Exception as e:
        logger.error(f"Error getting audit record: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/model/{model_id}/versions")
async def get_model_versions(model_id: str):
    """Get all versions of a model."""
    try:
        versions = await mlflow_manager.get_model_versions(model_id)
        return {
            'model_id': model_id,
            'total_versions': len(versions),
            'versions': versions
        }
        
    except Exception as e:
        logger.error(f"Error getting model versions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/audit/cleanup")
async def cleanup_old_records(
    retention_days: int = 2555  # 7 years default for regulatory compliance
):
    """Clean up old audit records beyond retention period."""
    try:
        deleted_count = await audit_service.cleanup_old_records(retention_days)
        
        return {
            'deleted_records': deleted_count,
            'retention_days': retention_days,
            'cleanup_timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)


class AuditTrailService:
    """
    Core audit trail service for decision logging and compliance tracking.
    """
    
    def __init__(self, db_url: str = "sqlite:///audit_trail.db"):
        """
        Initialize audit trail service.
        
        Args:
            db_url: Database URL for audit storage
        """
        self.db_url = db_url
        self.engine = None
        self.Session = None
        self.audit_records = {}  # In-memory cache for recent records
        
        logger.info("Audit trail service initialized")
    
    async def initialize(self):
        """
        Initialize database and tables.
        """
        if sqlalchemy is None:
            logger.warning("SQLAlchemy not available. Using in-memory storage.")
            return
        
        try:
            self.engine = create_engine(self.db_url)
            self.Session = sessionmaker(bind=self.engine)
            
            # Create tables
            Base.metadata.create_all(self.engine)
            
            logger.info("Audit trail database initialized")
            
        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}")
            raise
    
    async def log_decision(
        self,
        model_id: str,
        model_version: str,
        instance_id: str,
        input_data: Dict[str, Any],
        prediction: Any,
        explanation_data: Optional[Dict[str, Any]] = None,
        confidence_score: Optional[float] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        compliance_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Log a model decision to the audit trail.
        
        Returns:
            Audit record ID
        """
        try:
            # Generate audit ID
            audit_id = str(uuid.uuid4())
            
            # Create audit record
            audit_record = {
                'audit_id': audit_id,
                'model_id': model_id,
                'model_version': model_version,
                'instance_id': instance_id,
                'timestamp': datetime.now(),
                'input_data': json.dumps(input_data, default=str),
                'prediction': json.dumps(prediction, default=str),
                'explanation_data': json.dumps(explanation_data, default=str) if explanation_data else None,
                'confidence_score': confidence_score,
                'user_id': user_id,
                'session_id': session_id,
                'compliance_context': json.dumps(compliance_context, default=str) if compliance_context else None,
                'data_hash': self._calculate_data_hash(input_data, prediction)
            }
            
            # Store in database if available
            if self.Session:
                session = self.Session()
                try:
                    db_record = AuditRecord(**audit_record)
                    session.add(db_record)
                    session.commit()
                except Exception as e:
                    session.rollback()
                    logger.error(f"Error storing to database: {str(e)}")
                finally:
                    session.close()
            
            # Store in memory cache
            self.audit_records[audit_id] = audit_record
            
            logger.info(f"Logged decision with audit ID: {audit_id}")
            return audit_id
            
        except Exception as e:
            logger.error(f"Error logging decision: {str(e)}")
            raise
    
    async def query_audit_records(
        self,
        model_id: Optional[str] = None,
        date_range: Optional[Dict[str, str]] = None,
        user_id: Optional[str] = None,
        decision_type: Optional[str] = None,
        compliance_flags: Optional[List[str]] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Query audit trail records with filters.
        
        Returns:
            List of matching audit records
        """
        try:
            records = []
            
            # Query from database if available
            if self.Session:
                session = self.Session()
                try:
                    query = session.query(AuditRecord)
                    
                    # Apply filters
                    if model_id:
                        query = query.filter(AuditRecord.model_id == model_id)
                    
                    if user_id:
                        query = query.filter(AuditRecord.user_id == user_id)
                    
                    if date_range:
                        if 'start' in date_range:
                            start_date = datetime.fromisoformat(date_range['start'])
                            query = query.filter(AuditRecord.timestamp >= start_date)
                        
                        if 'end' in date_range:
                            end_date = datetime.fromisoformat(date_range['end'])
                            query = query.filter(AuditRecord.timestamp <= end_date)
                    
                    # Limit results
                    query = query.limit(limit)
                    
                    # Convert to dictionaries
                    for record in query.all():
                        records.append(self._audit_record_to_dict(record))
                    
                except Exception as e:
                    logger.error(f"Error querying database: {str(e)}")
                finally:
                    session.close()
            
            # Fallback to memory cache
            else:
                for record in list(self.audit_records.values())[:limit]:
                    # Apply basic filters
                    if model_id and record['model_id'] != model_id:
                        continue
                    if user_id and record['user_id'] != user_id:
                        continue
                    
                    records.append(record)
            
            return records
            
        except Exception as e:
            logger.error(f"Error querying audit records: {str(e)}")
            return []
    
    async def get_audit_record(self, audit_id: str) -> Optional[Dict[str, Any]]:
        """
        Get specific audit record by ID.
        
        Args:
            audit_id: Audit record ID
            
        Returns:
            Audit record or None if not found
        """
        try:
            # Check memory cache first
            if audit_id in self.audit_records:
                return self.audit_records[audit_id]
            
            # Query database if available
            if self.Session:
                session = self.Session()
                try:
                    record = session.query(AuditRecord).filter(
                        AuditRecord.audit_id == audit_id
                    ).first()
                    
                    if record:
                        return self._audit_record_to_dict(record)
                    
                except Exception as e:
                    logger.error(f"Error querying database: {str(e)}")
                finally:
                    session.close()
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting audit record: {str(e)}")
            return None
    
    async def generate_compliance_report(
        self,
        model_id: str,
        report_type: str,
        date_range: Dict[str, str],
        include_explanations: bool = True
    ) -> str:
        """
        Generate compliance report.
        
        Args:
            model_id: Model to generate report for
            report_type: Type of compliance report
            date_range: Date range for report
            include_explanations: Whether to include explanation data
            
        Returns:
            Report ID
        """
        report_id = str(uuid.uuid4())
        
        try:
            # Query relevant audit records
            records = await self.query_audit_records(
                model_id=model_id,
                date_range=date_range,
                limit=10000  # Large limit for compliance reports
            )
            
            # Generate report based on type
            if report_type == 'gdpr':
                report_data = await self._generate_gdpr_report(records, include_explanations)
            elif report_type == 'ai_act':
                report_data = await self._generate_ai_act_report(records, include_explanations)
            elif report_type == 'sox':
                report_data = await self._generate_sox_report(records)
            else:
                report_data = await self._generate_custom_report(records, report_type)
            
            # Store report (in practice, this would be saved to file system or database)
            report_data['report_id'] = report_id
            report_data['generated_at'] = datetime.now().isoformat()
            
            logger.info(f"Generated compliance report: {report_id}")
            return report_id
            
        except Exception as e:
            logger.error(f"Error generating compliance report: {str(e)}")
            raise
    
    async def _generate_gdpr_report(
        self,
        records: List[Dict[str, Any]],
        include_explanations: bool
    ) -> Dict[str, Any]:
        """
        Generate GDPR compliance report.
        
        Args:
            records: Audit records
            include_explanations: Include explanation data
            
        Returns:
            GDPR report data
        """
        report = {
            'report_type': 'gdpr',
            'total_decisions': len(records),
            'article_22_compliance': {
                'automated_decisions': 0,
                'explanations_provided': 0,
                'human_oversight_available': 0
            },
            'data_subject_rights': {
                'right_to_explanation_requests': 0,
                'data_portability_requests': 0,
                'erasure_requests': 0
            },
            'decisions_by_user': {},
            'recommendations': []
        }
        
        for record in records:
            # Count automated decisions
            report['article_22_compliance']['automated_decisions'] += 1
            
            # Check for explanations
            if record.get('explanation_data'):
                report['article_22_compliance']['explanations_provided'] += 1
            
            # Count decisions by user
            user_id = record.get('user_id', 'anonymous')
            if user_id not in report['decisions_by_user']:
                report['decisions_by_user'][user_id] = 0
            report['decisions_by_user'][user_id] += 1
        
        # Generate recommendations
        explanation_rate = (report['article_22_compliance']['explanations_provided'] / 
                          max(1, report['article_22_compliance']['automated_decisions']))
        
        if explanation_rate < 0.9:
            report['recommendations'].append(
                "Increase explanation provision rate to ensure GDPR Article 22 compliance"
            )
        
        return report
    
    async def _generate_ai_act_report(
        self,
        records: List[Dict[str, Any]],
        include_explanations: bool
    ) -> Dict[str, Any]:
        """
        Generate EU AI Act compliance report.
        
        Args:
            records: Audit records
            include_explanations: Include explanation data
            
        Returns:
            AI Act report data
        """
        report = {
            'report_type': 'eu_ai_act',
            'total_decisions': len(records),
            'transparency_requirements': {
                'user_informed': 0,
                'explanations_available': 0,
                'human_oversight': 0
            },
            'risk_management': {
                'high_risk_decisions': 0,
                'bias_monitoring': 0,
                'accuracy_monitoring': 0
            },
            'documentation': {
                'decision_records': len(records),
                'model_versions_tracked': set(),
                'compliance_documentation': 0
            },
            'recommendations': []
        }
        
        for record in records:
            # Track model versions
            if record.get('model_version'):
                report['documentation']['model_versions_tracked'].add(record['model_version'])
            
            # Check transparency requirements
            if record.get('explanation_data'):
                report['transparency_requirements']['explanations_available'] += 1
            
            # Check compliance context
            compliance_context = record.get('compliance_context')
            if compliance_context:
                try:
                    context_data = json.loads(compliance_context)
                    if context_data.get('user_informed'):
                        report['transparency_requirements']['user_informed'] += 1
                    if context_data.get('high_risk'):
                        report['risk_management']['high_risk_decisions'] += 1
                except:
                    pass
        
        # Convert set to count
        report['documentation']['model_versions_tracked'] = len(report['documentation']['model_versions_tracked'])
        
        # Generate recommendations
        transparency_rate = (report['transparency_requirements']['explanations_available'] / 
                           max(1, report['total_decisions']))
        
        if transparency_rate < 0.8:
            report['recommendations'].append(
                "Improve transparency by providing explanations for more decisions"
            )
        
        return report
    
    async def _generate_sox_report(
        self,
        records: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate SOX compliance report for financial services.
        
        Args:
            records: Audit records
            
        Returns:
            SOX report data
        """
        report = {
            'report_type': 'sox',
            'total_decisions': len(records),
            'internal_controls': {
                'decision_logging': len(records),
                'data_integrity_checks': 0,
                'access_controls': 0
            },
            'audit_trail_integrity': {
                'tamper_evidence': 0,
                'hash_verification': 0,
                'retention_compliance': 0
            },
            'recommendations': []
        }
        
        # Check data integrity
        for record in records:
            if record.get('data_hash'):
                report['audit_trail_integrity']['hash_verification'] += 1
        
        # Generate recommendations
        if report['audit_trail_integrity']['hash_verification'] < len(records):
            report['recommendations'].append(
                "Ensure all audit records include data integrity hashes"
            )
        
        return report
    
    async def _generate_custom_report(
        self,
        records: List[Dict[str, Any]],
        report_type: str
    ) -> Dict[str, Any]:
        """
        Generate custom compliance report.
        
        Args:
            records: Audit records
            report_type: Custom report type
            
        Returns:
            Custom report data
        """
        return {
            'report_type': report_type,
            'total_decisions': len(records),
            'summary': 'Custom compliance report generated',
            'records': records[:100],  # Sample of records
            'recommendations': ['Review custom compliance requirements']
        }
    
    def _calculate_data_hash(self, input_data: Dict[str, Any], prediction: Any) -> str:
        """
        Calculate hash for data integrity verification.
        
        Args:
            input_data: Input data
            prediction: Prediction result
            
        Returns:
            SHA-256 hash of the data
        """
        try:
            combined_data = {
                'input': input_data,
                'prediction': prediction
            }
            data_string = json.dumps(combined_data, sort_keys=True, default=str)
            return hashlib.sha256(data_string.encode()).hexdigest()
            
        except Exception as e:
            logger.warning(f"Error calculating data hash: {str(e)}")
            return "hash_error"
    
    def _audit_record_to_dict(self, record) -> Dict[str, Any]:
        """
        Convert SQLAlchemy audit record to dictionary.
        
        Args:
            record: SQLAlchemy record object
            
        Returns:
            Dictionary representation
        """
        return {
            'audit_id': record.audit_id,
            'model_id': record.model_id,
            'model_version': record.model_version,
            'instance_id': record.instance_id,
            'timestamp': record.timestamp.isoformat() if record.timestamp else None,
            'input_data': record.input_data,
            'prediction': record.prediction,
            'explanation_data': record.explanation_data,
            'confidence_score': record.confidence_score,
            'user_id': record.user_id,
            'session_id': record.session_id,
            'compliance_context': record.compliance_context,
            'data_hash': record.data_hash
        }
    
    async def process_audit_record(self, audit_id: str) -> None:
        """
        Background processing for audit records.
        
        Args:
            audit_id: Audit record ID to process
        """
        try:
            # Additional processing like data validation, indexing, etc.
            logger.info(f"Processing audit record: {audit_id}")
            
        except Exception as e:
            logger.error(f"Error processing audit record: {str(e)}")
    
    async def process_compliance_report(self, report_id: str) -> None:
        """
        Background processing for compliance reports.
        
        Args:
            report_id: Report ID to process
        """
        try:
            # Additional processing like PDF generation, encryption, etc.
            logger.info(f"Processing compliance report: {report_id}")
            
        except Exception as e:
            logger.error(f"Error processing compliance report: {str(e)}")
    
    async def cleanup_old_records(self, retention_days: int) -> int:
        """
        Clean up old audit records beyond retention period.
        
        Args:
            retention_days: Number of days to retain records
            
        Returns:
            Number of records deleted
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=retention_days)
            deleted_count = 0
            
            if self.Session:
                session = self.Session()
                try:
                    # Delete old records
                    deleted_count = session.query(AuditRecord).filter(
                        AuditRecord.timestamp < cutoff_date
                    ).delete()
                    
                    session.commit()
                    
                except Exception as e:
                    session.rollback()
                    logger.error(f"Error deleting records: {str(e)}")
                finally:
                    session.close()
            
            # Clean memory cache
            to_delete = [
                audit_id for audit_id, record in self.audit_records.items()
                if record['timestamp'] < cutoff_date
            ]
            
            for audit_id in to_delete:
                del self.audit_records[audit_id]
            
            deleted_count += len(to_delete)
            
            logger.info(f"Cleaned up {deleted_count} old audit records")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            return 0
    
    async def get_audit_count(self) -> int:
        """
        Get total count of audit records.
        
        Returns:
            Total audit record count
        """
        try:
            if self.Session:
                session = self.Session()
                try:
                    count = session.query(AuditRecord).count()
                    return count
                except Exception as e:
                    logger.error(f"Error counting records: {str(e)}")
                finally:
                    session.close()
            
            return len(self.audit_records)
            
        except Exception as e:
            logger.error(f"Error getting audit count: {str(e)}")
            return 0
    
    async def get_oldest_record(self) -> Optional[str]:
        """
        Get timestamp of oldest audit record.
        
        Returns:
            ISO timestamp of oldest record or None
        """
        try:
            if self.Session:
                session = self.Session()
                try:
                    oldest = session.query(AuditRecord).order_by(
                        AuditRecord.timestamp.asc()
                    ).first()
                    
                    if oldest:
                        return oldest.timestamp.isoformat()
                    
                except Exception as e:
                    logger.error(f"Error finding oldest record: {str(e)}")
                finally:
                    session.close()
            
            # Fallback to memory cache
            if self.audit_records:
                oldest_record = min(
                    self.audit_records.values(),
                    key=lambda x: x['timestamp']
                )
                return oldest_record['timestamp'].isoformat()
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting oldest record: {str(e)}")
            return None


class MLflowManager:
    """
    MLflow integration for model versioning and experiment tracking.
    """
    
    def __init__(self, tracking_uri: str = "./mlruns"):
        """
        Initialize MLflow manager.
        
        Args:
            tracking_uri: MLflow tracking URI
        """
        self.tracking_uri = tracking_uri
        self.client = None
        
        logger.info("MLflow manager initialized")
    
    async def initialize(self):
        """
        Initialize MLflow client.
        """
        if mlflow is None:
            logger.warning("MLflow not available. Model versioning will be limited.")
            return
        
        try:
            mlflow.set_tracking_uri(self.tracking_uri)
            self.client = MlflowClient()
            
            logger.info(f"MLflow client initialized with URI: {self.tracking_uri}")
            
        except Exception as e:
            logger.error(f"Error initializing MLflow: {str(e)}")
            raise
    
    async def register_model_version(
        self,
        model_id: str,
        model_artifact_path: str,
        model_metadata: Dict[str, Any],
        training_data_version: Optional[str] = None,
        experiment_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Register a new model version with MLflow.
        
        Args:
            model_id: Model identifier
            model_artifact_path: Path to model artifacts
            model_metadata: Model metadata
            training_data_version: Training data version
            experiment_id: MLflow experiment ID
            
        Returns:
            Version information
        """
        if not self.client:
            logger.warning("MLflow client not available")
            return {'version': '1.0.0', 'run_id': 'unknown'}
        
        try:
            # Create or get experiment
            if experiment_id is None:
                experiment_id = mlflow.create_experiment(f"model_{model_id}")
            
            # Start MLflow run
            with mlflow.start_run(experiment_id=experiment_id) as run:
                # Log model metadata
                for key, value in model_metadata.items():
                    mlflow.log_param(key, value)
                
                if training_data_version:
                    mlflow.log_param("training_data_version", training_data_version)
                
                # Log model artifacts
                mlflow.log_artifacts(model_artifact_path)
                
                # Register model
                model_uri = f"runs:/{run.info.run_id}/model"
                mv = mlflow.register_model(model_uri, model_id)
                
                return {
                    'version': mv.version,
                    'run_id': run.info.run_id,
                    'model_uri': model_uri,
                    'experiment_id': experiment_id
                }
                
        except Exception as e:
            logger.error(f"Error registering model version: {str(e)}")
            raise
    
    async def get_model_versions(self, model_id: str) -> List[Dict[str, Any]]:
        """
        Get all versions of a model.
        
        Args:
            model_id: Model identifier
            
        Returns:
            List of model versions
        """
        if not self.client:
            return []
        
        try:
            versions = self.client.search_model_versions(f"name='{model_id}'")
            
            return [
                {
                    'version': mv.version,
                    'run_id': mv.run_id,
                    'creation_timestamp': mv.creation_timestamp,
                    'last_updated_timestamp': mv.last_updated_timestamp,
                    'current_stage': mv.current_stage,
                    'description': mv.description
                }
                for mv in versions
            ]
            
        except Exception as e:
            logger.error(f"Error getting model versions: {str(e)}")
            return []


# Database models for SQLAlchemy
if sqlalchemy:
    Base = declarative_base()
    
    class AuditRecord(Base):
        __tablename__ = 'audit_records'
        
        audit_id = Column(String, primary_key=True)
        model_id = Column(String, nullable=False, index=True)
        model_version = Column(String)
        instance_id = Column(String)
        timestamp = Column(DateTime, nullable=False, index=True)
        input_data = Column(Text)
        prediction = Column(Text)
        explanation_data = Column(Text)
        confidence_score = Column(Float)
        user_id = Column(String, index=True)
        session_id = Column(String)
        compliance_context = Column(Text)
        data_hash = Column(String)
else:
    Base = None
    AuditRecord = None
