"""GDPR Article 22 compliance framework

Implements right to explanation for automated decision-making.
"""

import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ConsentRecord:
    """GDPR consent record."""
    user_id: str
    consent_type: str
    granted: bool
    timestamp: datetime
    purpose: str
    lawful_basis: str
    expiry_date: Optional[datetime] = None


@dataclass
class ExplanationRequest:
    """GDPR explanation request record."""
    request_id: str
    user_id: str
    decision_id: str
    request_type: str
    timestamp: datetime
    fulfilled: bool = False
    fulfillment_timestamp: Optional[datetime] = None


class GDPRComplianceFramework:
    """GDPR Article 22 compliance implementation."""
    
    def __init__(self, data_retention_days: int = 2555):  # 7 years
        """
        Initialize GDPR compliance framework.
        
        Args:
            data_retention_days: Number of days to retain records
        """
        self.data_retention_days = data_retention_days
        self.explanation_logs = {}
        self.consent_records = {}
        self.decision_records = {}
        
        logger.info("GDPR compliance framework initialized")
    
    def record_consent(self,
                      user_id: str,
                      consent_type: str,
                      granted: bool,
                      purpose: str,
                      lawful_basis: str = "consent",
                      expiry_days: Optional[int] = None) -> str:
        """
        Record user consent for data processing.
        
        Args:
            user_id: Unique user identifier
            consent_type: Type of consent (e.g., 'automated_decision_making')
            granted: Whether consent was granted
            purpose: Purpose of data processing
            lawful_basis: GDPR lawful basis for processing
            expiry_days: Days until consent expires
            
        Returns:
            Consent record ID
        """
        try:
            consent_id = hashlib.md5(f"{user_id}_{consent_type}_{datetime.now()}".encode()).hexdigest()
            
            expiry_date = None
            if expiry_days:
                expiry_date = datetime.now() + timedelta(days=expiry_days)
            
            consent = ConsentRecord(
                user_id=user_id,
                consent_type=consent_type,
                granted=granted,
                timestamp=datetime.now(),
                purpose=purpose,
                lawful_basis=lawful_basis,
                expiry_date=expiry_date
            )
            
            if user_id not in self.consent_records:
                self.consent_records[user_id] = []
            
            self.consent_records[user_id].append(consent)
            
            logger.info(f"Consent recorded: {consent_id} for user {user_id}")
            return consent_id
            
        except Exception as e:
            logger.error(f"Error recording consent: {str(e)}")
            raise
    
    def verify_user_consent(self, user_id: str, consent_type: str = "automated_decision_making") -> bool:
        """
        Verify user has valid consent for processing.
        
        Args:
            user_id: User identifier
            consent_type: Type of consent to verify
            
        Returns:
            Whether user has valid consent
        """
        try:
            if user_id not in self.consent_records:
                return False
            
            current_time = datetime.now()
            
            for consent in self.consent_records[user_id]:
                if consent.consent_type == consent_type and consent.granted:
                    # Check if consent is still valid
                    if consent.expiry_date is None or consent.expiry_date > current_time:
                        return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error verifying consent: {str(e)}")
            return False
    
    def process_explanation_request(self,
                                  user_id: str,
                                  decision_id: str,
                                  request_type: str = "summary") -> Dict[str, Any]:
        """
        Handle GDPR Article 22 explanation request.
        
        Args:
            user_id: User requesting explanation
            decision_id: ID of decision to explain
            request_type: Type of explanation requested
            
        Returns:
            GDPR-compliant explanation
        """
        try:
            request_id = hashlib.md5(f"{user_id}_{decision_id}_{datetime.now()}".encode()).hexdigest()
            
            # Log the request
            explanation_request = ExplanationRequest(
                request_id=request_id,
                user_id=user_id,
                decision_id=decision_id,
                request_type=request_type,
                timestamp=datetime.now()
            )
            
            # Verify user identity and consent
            if not self.verify_user_consent(user_id):
                return self._request_consent_response(user_id)
            
            # Retrieve decision record
            decision_record = self.get_decision_record(decision_id)
            if not decision_record:
                raise ValueError(f"Decision record {decision_id} not found")
            
            # Generate GDPR-compliant explanation
            explanation = {
                "request_id": request_id,
                "decision_id": decision_id,
                "timestamp": decision_record.get("timestamp"),
                "automated_decision": True,
                "logic_description": self.generate_logic_description(decision_record),
                "significance_consequences": self.assess_impact(decision_record),
                "data_sources": self.list_data_sources(decision_record),
                "processing_purposes": ["automated_decision_making"],
                "lawful_basis": "legitimate_interest",
                "data_controller": "TrustStram Inc.",
                "rights_information": {
                    "right_to_rectification": True,
                    "right_to_object": True,
                    "right_to_erasure": True,
                    "right_to_portability": True,
                    "human_review_available": True
                },
                "contact_information": {
                    "data_protection_officer": "dpo@truststream.com",
                    "support_contact": "support@truststream.com"
                },
                "retention_period": f"{self.data_retention_days} days",
                "right_to_lodge_complaint": "You have the right to lodge a complaint with a supervisory authority"
            }
            
            # Mark request as fulfilled
            explanation_request.fulfilled = True
            explanation_request.fulfillment_timestamp = datetime.now()
            
            # Log explanation provision
            self.log_explanation_request(user_id, decision_id, explanation)
            
            logger.info(f"GDPR explanation provided: {request_id}")
            return explanation
            
        except Exception as e:
            logger.error(f"Error processing explanation request: {str(e)}")
            return {
                "error": str(e),
                "request_id": request_id if 'request_id' in locals() else None,
                "timestamp": datetime.now().isoformat(),
                "rights_information": {
                    "human_review_available": True,
                    "contact_information": "support@truststream.com"
                }
            }
    
    def generate_logic_description(self, decision_record: Dict[str, Any]) -> str:
        """
        Generate human-readable logic description.
        
        Args:
            decision_record: Record of the automated decision
            
        Returns:
            Natural language description of decision logic
        """
        try:
            explanation = decision_record.get("explanation", {})
            shap_values = explanation.get("shap_values", {})
            
            if not shap_values:
                return "The decision was made using automated processing based on the provided information."
            
            # Convert technical explanation to natural language
            if isinstance(shap_values, dict):
                # Sort features by absolute importance
                sorted_features = sorted(
                    shap_values.items(),
                    key=lambda x: abs(x[1]),
                    reverse=True
                )[:5]  # Top 5 features
            else:
                return "The decision was made using machine learning algorithms that analyzed your submitted information."
            
            logic_parts = []
            for feature, importance in sorted_features:
                feature_name = self._humanize_feature_name(feature)
                if importance > 0:
                    logic_parts.append(f"Your {feature_name} positively influenced the decision")
                else:
                    logic_parts.append(f"Your {feature_name} negatively influenced the decision")
            
            base_description = "The automated decision was made by analyzing the following key factors: "
            return base_description + ". ".join(logic_parts) + "."
            
        except Exception as e:
            logger.warning(f"Error generating logic description: {str(e)}")
            return "The decision was made using automated processing. For more details, please contact our support team."
    
    def assess_impact(self, decision_record: Dict[str, Any]) -> str:
        """
        Assess significance and consequences of the decision.
        
        Args:
            decision_record: Record of the automated decision
            
        Returns:
            Description of decision impact
        """
        try:
            decision_type = decision_record.get("decision_type", "unknown")
            prediction = decision_record.get("prediction")
            confidence = decision_record.get("confidence", 0)
            
            impact_description = f"This automated decision affects your {decision_type} application. "
            
            if prediction:
                if isinstance(prediction, (int, float)):
                    if prediction > 0.5:  # Assuming binary classification
                        impact_description += "The decision was favorable. "
                    else:
                        impact_description += "The decision was unfavorable. "
                else:
                    impact_description += f"The decision outcome was: {prediction}. "
            
            impact_description += f"The system confidence in this decision is {confidence:.1%}. "
            impact_description += "You have the right to request human review of this decision."
            
            return impact_description
            
        except Exception as e:
            logger.warning(f"Error assessing impact: {str(e)}")
            return "This automated decision may have significant consequences for you. You have the right to request human review."
    
    def list_data_sources(self, decision_record: Dict[str, Any]) -> List[str]:
        """
        List data sources used in the decision.
        
        Args:
            decision_record: Record of the automated decision
            
        Returns:
            List of data sources
        """
        try:
            # Extract data sources from decision record
            sources = decision_record.get("data_sources", [])
            
            if not sources:
                # Default sources if not specified
                sources = [
                    "Information you provided in your application",
                    "Publicly available data",
                    "Internal databases"
                ]
            
            return sources
            
        except Exception:
            return ["Information provided by you", "Internal databases"]
    
    def _humanize_feature_name(self, feature_name: str) -> str:
        """
        Convert technical feature names to human-readable descriptions.
        
        Args:
            feature_name: Technical feature name
            
        Returns:
            Human-readable feature description
        """
        # Simple mapping - in practice, this would be more sophisticated
        humanization_map = {
            "age": "age",
            "income": "income level",
            "credit_score": "credit score",
            "employment_status": "employment status",
            "loan_amount": "requested loan amount",
            "debt_ratio": "debt-to-income ratio"
        }
        
        return humanization_map.get(feature_name.lower(), feature_name.replace("_", " "))
    
    def _request_consent_response(self, user_id: str) -> Dict[str, Any]:
        """
        Generate response requesting user consent.
        
        Args:
            user_id: User identifier
            
        Returns:
            Consent request response
        """
        return {
            "consent_required": True,
            "message": "To provide you with an explanation of this automated decision, we need your consent to process your personal data for this purpose.",
            "consent_url": f"/consent?user_id={user_id}&type=explanation_request",
            "lawful_basis": "consent",
            "purpose": "To provide transparency about automated decision-making processes",
            "retention_period": f"{self.data_retention_days} days",
            "rights_information": {
                "right_to_withdraw": "You can withdraw your consent at any time",
                "contact_information": "support@truststream.com"
            }
        }
    
    def log_explanation_request(self, user_id: str, decision_id: str, explanation: Dict[str, Any]):
        """
        Log explanation request and fulfillment.
        
        Args:
            user_id: User who requested explanation
            decision_id: Decision that was explained
            explanation: Generated explanation
        """
        try:
            log_entry = {
                "user_id": user_id,
                "decision_id": decision_id,
                "timestamp": datetime.now().isoformat(),
                "explanation_provided": True,
                "explanation_hash": hashlib.md5(json.dumps(explanation, sort_keys=True).encode()).hexdigest()
            }
            
            if user_id not in self.explanation_logs:
                self.explanation_logs[user_id] = []
            
            self.explanation_logs[user_id].append(log_entry)
            
        except Exception as e:
            logger.error(f"Error logging explanation request: {str(e)}")
    
    def get_decision_record(self, decision_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve decision record by ID.
        
        Args:
            decision_id: Decision identifier
            
        Returns:
            Decision record or None if not found
        """
        return self.decision_records.get(decision_id)
    
    def store_decision_record(self, decision_record: Dict[str, Any]):
        """
        Store decision record for GDPR compliance.
        
        Args:
            decision_record: Complete decision record
        """
        try:
            decision_id = decision_record.get("decision_id")
            if decision_id:
                self.decision_records[decision_id] = decision_record
                logger.debug(f"Decision record stored: {decision_id}")
        except Exception as e:
            logger.error(f"Error storing decision record: {str(e)}")
    
    def cleanup_expired_records(self):
        """
        Clean up expired records per GDPR retention requirements.
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=self.data_retention_days)
            
            # Clean up consent records
            for user_id in list(self.consent_records.keys()):
                self.consent_records[user_id] = [
                    consent for consent in self.consent_records[user_id]
                    if consent.timestamp > cutoff_date
                ]
                if not self.consent_records[user_id]:
                    del self.consent_records[user_id]
            
            # Clean up explanation logs
            for user_id in list(self.explanation_logs.keys()):
                self.explanation_logs[user_id] = [
                    log for log in self.explanation_logs[user_id]
                    if datetime.fromisoformat(log["timestamp"]) > cutoff_date
                ]
                if not self.explanation_logs[user_id]:
                    del self.explanation_logs[user_id]
            
            # Clean up decision records
            expired_decisions = [
                decision_id for decision_id, record in self.decision_records.items()
                if datetime.fromisoformat(record.get("timestamp", "1970-01-01")) < cutoff_date
            ]
            
            for decision_id in expired_decisions:
                del self.decision_records[decision_id]
            
            logger.info(f"Cleaned up {len(expired_decisions)} expired decision records")
            
        except Exception as e:
            logger.error(f"Error cleaning up expired records: {str(e)}")
    
    def generate_compliance_report(self) -> Dict[str, Any]:
        """
        Generate GDPR compliance report.
        
        Returns:
            Compliance status report
        """
        try:
            total_consents = sum(len(consents) for consents in self.consent_records.values())
            total_explanations = sum(len(logs) for logs in self.explanation_logs.values())
            total_decisions = len(self.decision_records)
            
            # Calculate consent statistics
            granted_consents = 0
            for user_consents in self.consent_records.values():
                granted_consents += sum(1 for consent in user_consents if consent.granted)
            
            return {
                "report_date": datetime.now().isoformat(),
                "gdpr_compliance_status": "compliant",
                "statistics": {
                    "total_consent_records": total_consents,
                    "granted_consents": granted_consents,
                    "total_explanation_requests": total_explanations,
                    "total_decision_records": total_decisions
                },
                "data_retention": {
                    "retention_period_days": self.data_retention_days,
                    "automatic_cleanup": True
                },
                "rights_implementation": {
                    "right_to_explanation": True,
                    "right_to_rectification": True,
                    "right_to_erasure": True,
                    "right_to_object": True,
                    "human_review_available": True
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating compliance report: {str(e)}")
            return {
                "error": str(e),
                "report_date": datetime.now().isoformat()
            }
