"""
EU AI Act compliance framework

Implements transparency requirements for high-risk AI systems
with comprehensive documentation and human oversight capabilities.
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union, Tuple
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class AISystemRiskLevel(Enum):
    """AI system risk classification under EU AI Act."""
    PROHIBITED = "prohibited"
    HIGH_RISK = "high_risk"
    LIMITED_RISK = "limited_risk"
    MINIMAL_RISK = "minimal_risk"

class AIActRequirement(Enum):
    """Specific requirements under EU AI Act."""
    TRANSPARENCY_DOCUMENTATION = "transparency_documentation"
    HUMAN_OVERSIGHT = "human_oversight"
    ACCURACY_ROBUSTNESS = "accuracy_robustness"
    CYBERSECURITY = "cybersecurity"
    DATA_GOVERNANCE = "data_governance"
    RISK_MANAGEMENT = "risk_management"
    CONFORMITY_ASSESSMENT = "conformity_assessment"
    POST_MARKET_MONITORING = "post_market_monitoring"

class HighRiskUseCase(Enum):
    """High-risk use cases under EU AI Act Annex III."""
    EDUCATION_TRAINING = "education_training"
    EMPLOYMENT = "employment"
    ESSENTIAL_SERVICES = "essential_services"
    LAW_ENFORCEMENT = "law_enforcement"
    MIGRATION_ASYLUM = "migration_asylum"
    ADMINISTRATION_JUSTICE = "administration_justice"
    DEMOCRATIC_PROCESSES = "democratic_processes"
    BIOMETRIC_IDENTIFICATION = "biometric_identification"
    CRITICAL_INFRASTRUCTURE = "critical_infrastructure"

class HumanOversightLevel(Enum):
    """Levels of human oversight required."""
    HUMAN_IN_THE_LOOP = "human_in_the_loop"
    HUMAN_ON_THE_LOOP = "human_on_the_loop"
    HUMAN_IN_COMMAND = "human_in_command"

class AIActComplianceRecord:
    """
    Represents an AI Act compliance record for a specific AI system.
    """
    
    def __init__(self, system_id: str, system_name: str, risk_level: AISystemRiskLevel,
                 use_cases: List[HighRiskUseCase], provider_info: Dict[str, Any]):
        """
        Initialize AI Act compliance record.
        
        Args:
            system_id: Unique system identifier
            system_name: Human-readable system name
            risk_level: Risk classification
            use_cases: Applicable use cases
            provider_info: Provider organization information
        """
        self.system_id = system_id
        self.system_name = system_name
        self.risk_level = risk_level
        self.use_cases = use_cases
        self.provider_info = provider_info
        self.created_at = datetime.now()
        self.last_updated = datetime.now()
        
        # Compliance documentation
        self.transparency_documentation = {}
        self.technical_documentation = {}
        self.risk_management_documentation = {}
        self.quality_management_documentation = {}
        
        # Oversight and monitoring
        self.human_oversight_measures = {}
        self.monitoring_logs = []
        self.incident_reports = []
        
        # Performance tracking
        self.performance_metrics = {}
        self.accuracy_assessments = []
        self.bias_assessments = []
        
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert compliance record to dictionary.
        
        Returns:
            Dictionary representation
        """
        return {
            'system_id': self.system_id,
            'system_name': self.system_name,
            'risk_level': self.risk_level.value,
            'use_cases': [uc.value for uc in self.use_cases],
            'provider_info': self.provider_info,
            'created_at': self.created_at.isoformat(),
            'last_updated': self.last_updated.isoformat(),
            'transparency_documentation': self.transparency_documentation,
            'technical_documentation': self.technical_documentation,
            'risk_management_documentation': self.risk_management_documentation,
            'human_oversight_measures': self.human_oversight_measures,
            'performance_metrics': self.performance_metrics
        }

class AIActComplianceFramework:
    """
    EU AI Act compliance framework for high-risk AI systems.
    
    Implements comprehensive transparency, human oversight, and
    documentation requirements for AI Act compliance.
    """
    
    def __init__(self, organization_name: str, organization_address: str,
                 authorized_representative: str, technical_contact: str):
        """
        Initialize AI Act compliance framework.
        
        Args:
            organization_name: Name of AI system provider
            organization_address: Provider address
            authorized_representative: Authorized representative contact
            technical_contact: Technical documentation contact
        """
        self.organization_name = organization_name
        self.organization_address = organization_address
        self.authorized_representative = authorized_representative
        self.technical_contact = technical_contact
        
        # Compliance records storage
        self.compliance_records = {}  # system_id -> AIActComplianceRecord
        self.audit_logs = []  # Audit trail for compliance activities
        self.conformity_assessments = {}  # system_id -> conformity assessment
        
        logger.info(f"Initialized AI Act compliance framework for {organization_name}")
    
    def register_ai_system(self, system_name: str, intended_purpose: str,
                          deployment_context: str, use_cases: List[str],
                          system_capabilities: Dict[str, Any]) -> str:
        """
        Register AI system for AI Act compliance.
        
        Args:
            system_name: Name of AI system
            intended_purpose: Intended purpose description
            deployment_context: Deployment context
            use_cases: List of use case strings
            system_capabilities: System capabilities description
            
        Returns:
            System ID
        """
        try:
            # Generate system ID
            system_id = f"ai_system_{int(datetime.now().timestamp() * 1000)}"
            
            # Assess risk level
            risk_level = self._assess_risk_level(use_cases, deployment_context)
            
            # Convert use cases to enum
            use_case_enums = self._map_use_cases_to_enums(use_cases)
            
            # Create provider info
            provider_info = {
                'name': self.organization_name,
                'address': self.organization_address,
                'authorized_representative': self.authorized_representative,
                'technical_contact': self.technical_contact,
                'registration_date': datetime.now().isoformat()
            }
            
            # Create compliance record
            compliance_record = AIActComplianceRecord(
                system_id=system_id,
                system_name=system_name,
                risk_level=risk_level,
                use_cases=use_case_enums,
                provider_info=provider_info
            )
            
            # Generate initial documentation
            self._generate_initial_documentation(compliance_record, intended_purpose,
                                               deployment_context, system_capabilities)
            
            # Store record
            self.compliance_records[system_id] = compliance_record
            
            # Log registration
            self._log_compliance_activity(
                system_id, "system_registration",
                f"Registered AI system: {system_name} with risk level: {risk_level.value}"
            )
            
            logger.info(f"Registered AI system {system_id}: {system_name} (Risk: {risk_level.value})")
            return system_id
            
        except Exception as e:
            logger.error(f"Error registering AI system: {str(e)}")
            raise
    
    def _assess_risk_level(self, use_cases: List[str], deployment_context: str) -> AISystemRiskLevel:
        """
        Assess AI system risk level according to AI Act.
        
        Args:
            use_cases: List of use cases
            deployment_context: Deployment context
            
        Returns:
            Risk level classification
        """
        # High-risk use case keywords
        high_risk_keywords = [
            'employment', 'recruitment', 'hiring', 'education', 'training',
            'credit', 'insurance', 'loan', 'financing', 'healthcare',
            'law enforcement', 'border control', 'asylum', 'migration',
            'court', 'judicial', 'democratic', 'election', 'voting',
            'biometric', 'identification', 'authentication',
            'critical infrastructure', 'safety', 'transportation'
        ]
        
        # Check for high-risk indicators
        combined_text = ' '.join(use_cases + [deployment_context]).lower()
        
        high_risk_score = sum(1 for keyword in high_risk_keywords if keyword in combined_text)
        
        if high_risk_score >= 2 or any(keyword in combined_text for keyword in 
                                      ['employment', 'credit', 'healthcare', 'law enforcement']):
            return AISystemRiskLevel.HIGH_RISK
        elif high_risk_score >= 1:
            return AISystemRiskLevel.LIMITED_RISK
        else:
            return AISystemRiskLevel.MINIMAL_RISK
    
    def _map_use_cases_to_enums(self, use_cases: List[str]) -> List[HighRiskUseCase]:
        """
        Map use case strings to enum values.
        
        Args:
            use_cases: List of use case strings
            
        Returns:
            List of use case enums
        """
        use_case_mapping = {
            'education': HighRiskUseCase.EDUCATION_TRAINING,
            'training': HighRiskUseCase.EDUCATION_TRAINING,
            'employment': HighRiskUseCase.EMPLOYMENT,
            'recruitment': HighRiskUseCase.EMPLOYMENT,
            'hiring': HighRiskUseCase.EMPLOYMENT,
            'credit': HighRiskUseCase.ESSENTIAL_SERVICES,
            'insurance': HighRiskUseCase.ESSENTIAL_SERVICES,
            'healthcare': HighRiskUseCase.ESSENTIAL_SERVICES,
            'law enforcement': HighRiskUseCase.LAW_ENFORCEMENT,
            'police': HighRiskUseCase.LAW_ENFORCEMENT,
            'migration': HighRiskUseCase.MIGRATION_ASYLUM,
            'asylum': HighRiskUseCase.MIGRATION_ASYLUM,
            'border': HighRiskUseCase.MIGRATION_ASYLUM,
            'court': HighRiskUseCase.ADMINISTRATION_JUSTICE,
            'judicial': HighRiskUseCase.ADMINISTRATION_JUSTICE,
            'justice': HighRiskUseCase.ADMINISTRATION_JUSTICE,
            'election': HighRiskUseCase.DEMOCRATIC_PROCESSES,
            'voting': HighRiskUseCase.DEMOCRATIC_PROCESSES,
            'biometric': HighRiskUseCase.BIOMETRIC_IDENTIFICATION,
            'identification': HighRiskUseCase.BIOMETRIC_IDENTIFICATION
        }
        
        mapped_enums = []
        combined_text = ' '.join(use_cases).lower()
        
        for keyword, enum_value in use_case_mapping.items():
            if keyword in combined_text and enum_value not in mapped_enums:
                mapped_enums.append(enum_value)
        
        return mapped_enums or [HighRiskUseCase.ESSENTIAL_SERVICES]  # Default
    
    def _generate_initial_documentation(self, record: AIActComplianceRecord,
                                      intended_purpose: str, deployment_context: str,
                                      system_capabilities: Dict[str, Any]):
        """
        Generate initial compliance documentation.
        
        Args:
            record: Compliance record to update
            intended_purpose: System intended purpose
            deployment_context: Deployment context
            system_capabilities: System capabilities
        """
        # Generate transparency documentation
        record.transparency_documentation = self._generate_transparency_documentation(
            record, intended_purpose, deployment_context, system_capabilities
        )
        
        # Generate technical documentation
        record.technical_documentation = self._generate_technical_documentation(
            record, system_capabilities
        )
        
        # Generate risk management documentation
        record.risk_management_documentation = self._generate_risk_management_documentation(
            record
        )
        
        # Set up human oversight measures
        record.human_oversight_measures = self._setup_human_oversight_measures(
            record.risk_level
        )
    
    def _generate_transparency_documentation(self, record: AIActComplianceRecord,
                                           intended_purpose: str, deployment_context: str,
                                           system_capabilities: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate transparency documentation (Article 13).
        
        Args:
            record: Compliance record
            intended_purpose: System intended purpose
            deployment_context: Deployment context
            system_capabilities: System capabilities
            
        Returns:
            Transparency documentation
        """
        return {
            'system_identification': {
                'name': record.system_name,
                'version': '1.0.0',  # Would be actual version
                'provider': record.provider_info['name'],
                'system_id': record.system_id,
                'unique_identifier': f"EU_AI_{record.system_id}"
            },
            'intended_purpose': {
                'description': intended_purpose,
                'deployment_context': deployment_context,
                'target_users': "End users, business operators, technical administrators",
                'use_cases': [uc.value for uc in record.use_cases],
                'geographical_scope': "European Union"
            },
            'capabilities_and_limitations': {
                'capabilities': system_capabilities,
                'known_limitations': self._document_known_limitations(),
                'conditions_of_use': self._document_conditions_of_use(),
                'reasonably_foreseeable_misuse': self._document_foreseeable_misuse()
            },
            'accuracy_performance': {
                'accuracy_metrics': "Accuracy, precision, recall, F1-score",
                'performance_benchmarks': "Industry standard benchmarks",
                'testing_procedures': "Comprehensive validation testing",
                'performance_monitoring': "Continuous performance monitoring"
            },
            'data_governance': {
                'training_data_description': self._describe_training_data(),
                'data_quality_measures': self._document_data_quality_measures(),
                'bias_testing_results': "Regular bias testing conducted",
                'data_minimization': "Data minimization principles applied"
            },
            'human_oversight': {
                'oversight_measures': record.human_oversight_measures,
                'human_intervention_capabilities': self._document_intervention_capabilities(),
                'competence_requirements': "Trained personnel required for oversight"
            },
            'cybersecurity_measures': {
                'security_controls': "Industry-standard security controls implemented",
                'vulnerability_management': "Regular security assessments",
                'incident_response': "Incident response procedures in place",
                'data_protection': "End-to-end data protection measures"
            }
        }
    
    def _document_known_limitations(self) -> List[str]:
        """
        Document known system limitations.
        
        Returns:
            List of known limitations
        """
        return [
            "Performance may vary with data distribution changes",
            "Requires sufficient training data for optimal performance",
            "May exhibit reduced accuracy on edge cases",
            "Dependent on data quality and preprocessing",
            "Limited to specific domain and use cases"
        ]
    
    def _document_conditions_of_use(self) -> List[str]:
        """
        Document appropriate conditions of use.
        
        Returns:
            List of use conditions
        """
        return [
            "Should be used only for intended purposes",
            "Requires appropriate technical infrastructure",
            "Personnel must be trained on system operation",
            "Regular monitoring and maintenance required",
            "Compliance with applicable laws and regulations"
        ]
    
    def _document_foreseeable_misuse(self) -> List[str]:
        """
        Document reasonably foreseeable misuse.
        
        Returns:
            List of potential misuse scenarios
        """
        return [
            "Use outside intended domain or purpose",
            "Application to inappropriate data types",
            "Deployment without proper oversight",
            "Ignoring system confidence indicators",
            "Use without adequate technical safeguards"
        ]
    
    def _describe_training_data(self) -> Dict[str, Any]:
        """
        Describe training data characteristics.
        
        Returns:
            Training data description
        """
        return {
            'data_sources': "Curated datasets from reliable sources",
            'data_volume': "Sufficient volume for robust training",
            'data_quality': "High-quality, validated datasets",
            'data_diversity': "Representative and diverse data samples",
            'data_preprocessing': "Standardized preprocessing procedures",
            'bias_mitigation': "Bias detection and mitigation measures applied"
        }
    
    def _document_data_quality_measures(self) -> List[str]:
        """
        Document data quality measures.
        
        Returns:
            List of data quality measures
        """
        return [
            "Data validation and verification procedures",
            "Outlier detection and handling",
            "Missing data imputation strategies",
            "Data consistency checks",
            "Regular data quality audits",
            "Data lineage tracking"
        ]
    
    def _document_intervention_capabilities(self) -> List[str]:
        """
        Document human intervention capabilities.
        
        Returns:
            List of intervention capabilities
        """
        return [
            "Manual override of system decisions",
            "Review and validation of outputs",
            "Adjustment of system parameters",
            "Escalation to human experts",
            "System pause and restart capabilities",
            "Audit trail of all interventions"
        ]
    
    def _generate_technical_documentation(self, record: AIActComplianceRecord,
                                        system_capabilities: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate technical documentation (Article 11).
        
        Args:
            record: Compliance record
            system_capabilities: System capabilities
            
        Returns:
            Technical documentation
        """
        return {
            'system_architecture': {
                'overall_architecture': "Microservices-based AI system architecture",
                'components': [
                    "Data processing pipeline",
                    "Model inference engine",
                    "Explanation generation service",
                    "Human oversight interface",
                    "Monitoring and logging system"
                ],
                'integration_points': "API-based integration with external systems",
                'scalability_design': "Horizontally scalable cloud-native design"
            },
            'algorithm_design': {
                'algorithm_type': "Machine learning algorithm",
                'training_methodology': "Supervised learning with validation",
                'model_architecture': "Neural network / ensemble model",
                'optimization_criteria': "Accuracy, fairness, and robustness",
                'validation_approach': "Cross-validation and holdout testing"
            },
            'data_requirements': {
                'input_data_format': "Structured/unstructured data formats",
                'data_preprocessing': "Standardized preprocessing pipeline",
                'data_validation': "Input validation and sanitization",
                'data_storage': "Secure encrypted data storage"
            },
            'performance_characteristics': {
                'computational_requirements': "Standard cloud computing resources",
                'response_time': "Sub-second response times",
                'throughput': "High-throughput processing capabilities",
                'resource_utilization': "Optimized resource usage"
            },
            'testing_validation': {
                'testing_procedures': self._document_testing_procedures(),
                'validation_datasets': "Independent validation datasets",
                'performance_benchmarks': "Industry standard benchmarks",
                'robustness_testing': "Adversarial and stress testing"
            }
        }
    
    def _document_testing_procedures(self) -> List[str]:
        """
        Document testing procedures.
        
        Returns:
            List of testing procedures
        """
        return [
            "Unit testing of individual components",
            "Integration testing of system components",
            "End-to-end system testing",
            "Performance and load testing",
            "Security penetration testing",
            "Bias and fairness testing",
            "User acceptance testing",
            "Regression testing for updates"
        ]
    
    def _generate_risk_management_documentation(self, record: AIActComplianceRecord) -> Dict[str, Any]:
        """
        Generate risk management documentation (Article 9).
        
        Args:
            record: Compliance record
            
        Returns:
            Risk management documentation
        """
        return {
            'risk_management_system': {
                'framework': "Comprehensive risk management framework",
                'procedures': "Systematic risk identification and assessment",
                'continuous_improvement': "Iterative risk management process",
                'documentation': "Complete risk documentation and tracking"
            },
            'risk_identification': {
                'risk_categories': [
                    "Accuracy and performance risks",
                    "Bias and discrimination risks",
                    "Cybersecurity risks",
                    "Privacy and data protection risks",
                    "Human oversight risks",
                    "Societal and ethical risks"
                ],
                'risk_assessment_methodology': "Qualitative and quantitative risk assessment",
                'risk_matrix': "Risk probability and impact assessment"
            },
            'risk_mitigation': {
                'mitigation_strategies': self._document_mitigation_strategies(),
                'residual_risk_assessment': "Assessment of remaining risks after mitigation",
                'risk_monitoring': "Continuous risk monitoring and alerting",
                'incident_response': "Risk incident response procedures"
            },
            'risk_governance': {
                'roles_responsibilities': "Clear roles and responsibilities for risk management",
                'escalation_procedures': "Risk escalation and decision-making procedures",
                'reporting_requirements': "Regular risk reporting to management",
                'training_requirements': "Risk management training for personnel"
            }
        }
    
    def _document_mitigation_strategies(self) -> List[str]:
        """
        Document risk mitigation strategies.
        
        Returns:
            List of mitigation strategies
        """
        return [
            "Robust testing and validation procedures",
            "Bias detection and mitigation measures",
            "Security controls and monitoring",
            "Human oversight and intervention capabilities",
            "Data quality assurance measures",
            "Regular model retraining and updates",
            "Incident response and recovery procedures",
            "Continuous monitoring and alerting systems"
        ]
    
    def _setup_human_oversight_measures(self, risk_level: AISystemRiskLevel) -> Dict[str, Any]:
        """
        Set up human oversight measures based on risk level.
        
        Args:
            risk_level: AI system risk level
            
        Returns:
            Human oversight measures
        """
        if risk_level == AISystemRiskLevel.HIGH_RISK:
            oversight_level = HumanOversightLevel.HUMAN_IN_THE_LOOP
            measures = {
                'oversight_level': oversight_level.value,
                'oversight_requirements': [
                    "Continuous human supervision during operation",
                    "Human validation of critical decisions",
                    "Real-time monitoring by qualified personnel",
                    "Immediate intervention capabilities"
                ],
                'competence_requirements': [
                    "Technical understanding of AI system",
                    "Domain expertise in application area",
                    "Training on oversight procedures",
                    "Understanding of system limitations"
                ],
                'intervention_triggers': [
                    "Low confidence predictions",
                    "Anomalous input patterns",
                    "System performance degradation",
                    "User requests for review"
                ]
            }
        else:
            oversight_level = HumanOversightLevel.HUMAN_ON_THE_LOOP
            measures = {
                'oversight_level': oversight_level.value,
                'oversight_requirements': [
                    "Regular monitoring of system performance",
                    "Periodic review of system outputs",
                    "Escalation procedures for issues"
                ],
                'competence_requirements': [
                    "Basic understanding of AI system",
                    "Training on monitoring procedures"
                ],
                'intervention_triggers': [
                    "Performance alerts",
                    "User complaints",
                    "System errors"
                ]
            }
        
        measures.update({
            'oversight_documentation': "All oversight activities logged",
            'training_programs': "Regular training for oversight personnel",
            'performance_monitoring': "Continuous monitoring of oversight effectiveness"
        })
        
        return measures
    
    def record_human_intervention(self, system_id: str, intervention_type: str,
                                intervention_reason: str, intervention_details: Dict[str, Any],
                                operator_id: str) -> str:
        """
        Record human intervention in AI system operation.
        
        Args:
            system_id: AI system identifier
            intervention_type: Type of intervention
            intervention_reason: Reason for intervention
            intervention_details: Detailed intervention information
            operator_id: ID of human operator
            
        Returns:
            Intervention record ID
        """
        try:
            intervention_id = f"intervention_{int(datetime.now().timestamp() * 1000)}"
            
            intervention_record = {
                'intervention_id': intervention_id,
                'system_id': system_id,
                'intervention_type': intervention_type,
                'intervention_reason': intervention_reason,
                'intervention_details': intervention_details,
                'operator_id': operator_id,
                'timestamp': datetime.now().isoformat(),
                'outcome': intervention_details.get('outcome', 'pending')
            }
            
            # Store in system record
            if system_id in self.compliance_records:
                if 'human_interventions' not in self.compliance_records[system_id].monitoring_logs:
                    self.compliance_records[system_id].monitoring_logs = []
                
                self.compliance_records[system_id].monitoring_logs.append(intervention_record)
            
            # Log compliance activity
            self._log_compliance_activity(
                system_id, "human_intervention",
                f"Human intervention: {intervention_type} by {operator_id}"
            )
            
            logger.info(f"Recorded human intervention {intervention_id} for system {system_id}")
            return intervention_id
            
        except Exception as e:
            logger.error(f"Error recording human intervention: {str(e)}")
            raise
    
    def assess_system_performance(self, system_id: str, performance_data: Dict[str, Any],
                                assessment_period: str) -> Dict[str, Any]:
        """
        Assess AI system performance for compliance monitoring.
        
        Args:
            system_id: AI system identifier
            performance_data: Performance metrics data
            assessment_period: Assessment time period
            
        Returns:
            Performance assessment results
        """
        try:
            assessment_id = f"assessment_{int(datetime.now().timestamp() * 1000)}"
            
            # Analyze performance data
            assessment_results = {
                'assessment_id': assessment_id,
                'system_id': system_id,
                'assessment_period': assessment_period,
                'timestamp': datetime.now().isoformat(),
                'performance_metrics': performance_data,
                'compliance_status': self._assess_compliance_status(performance_data),
                'recommendations': self._generate_performance_recommendations(performance_data),
                'risk_indicators': self._identify_risk_indicators(performance_data)
            }
            
            # Store assessment
            if system_id in self.compliance_records:
                self.compliance_records[system_id].accuracy_assessments.append(assessment_results)
                self.compliance_records[system_id].performance_metrics.update({
                    'latest_assessment': assessment_results,
                    'last_updated': datetime.now().isoformat()
                })
            
            # Log compliance activity
            self._log_compliance_activity(
                system_id, "performance_assessment",
                f"Performance assessment completed: {assessment_id}"
            )
            
            logger.info(f"Completed performance assessment {assessment_id} for system {system_id}")
            return assessment_results
            
        except Exception as e:
            logger.error(f"Error assessing system performance: {str(e)}")
            raise
    
    def _assess_compliance_status(self, performance_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess compliance status based on performance data.
        
        Args:
            performance_data: Performance metrics
            
        Returns:
            Compliance status assessment
        """
        compliance_status = {
            'overall_status': 'compliant',
            'accuracy_compliant': True,
            'robustness_compliant': True,
            'bias_compliant': True,
            'issues_identified': []
        }
        
        # Check accuracy thresholds
        accuracy = performance_data.get('accuracy', 0)
        if accuracy < 0.8:  # Example threshold
            compliance_status['accuracy_compliant'] = False
            compliance_status['issues_identified'].append('Accuracy below threshold')
        
        # Check for bias indicators
        bias_metrics = performance_data.get('bias_metrics', {})
        for metric, value in bias_metrics.items():
            if value > 0.1:  # Example threshold
                compliance_status['bias_compliant'] = False
                compliance_status['issues_identified'].append(f'Bias detected in {metric}')
        
        # Determine overall status
        if compliance_status['issues_identified']:
            compliance_status['overall_status'] = 'non_compliant'
        
        return compliance_status
    
    def _generate_performance_recommendations(self, performance_data: Dict[str, Any]) -> List[str]:
        """
        Generate performance improvement recommendations.
        
        Args:
            performance_data: Performance metrics
            
        Returns:
            List of recommendations
        """
        recommendations = []
        
        # Accuracy recommendations
        accuracy = performance_data.get('accuracy', 0)
        if accuracy < 0.85:
            recommendations.append("Consider model retraining with additional data")
        
        # Bias recommendations
        bias_metrics = performance_data.get('bias_metrics', {})
        if any(value > 0.05 for value in bias_metrics.values()):
            recommendations.append("Implement bias mitigation strategies")
        
        # Performance recommendations
        response_time = performance_data.get('response_time', 0)
        if response_time > 2.0:  # seconds
            recommendations.append("Optimize system performance and response times")
        
        if not recommendations:
            recommendations.append("System performance meets compliance requirements")
        
        return recommendations
    
    def _identify_risk_indicators(self, performance_data: Dict[str, Any]) -> List[str]:
        """
        Identify risk indicators from performance data.
        
        Args:
            performance_data: Performance metrics
            
        Returns:
            List of risk indicators
        """
        risk_indicators = []
        
        # Performance degradation
        if performance_data.get('accuracy', 1) < 0.7:
            risk_indicators.append('Significant accuracy degradation')
        
        # Bias risks
        bias_metrics = performance_data.get('bias_metrics', {})
        if any(value > 0.2 for value in bias_metrics.values()):
            risk_indicators.append('High bias risk detected')
        
        # Error rate risks
        error_rate = performance_data.get('error_rate', 0)
        if error_rate > 0.1:
            risk_indicators.append('High error rate detected')
        
        return risk_indicators
    
    def generate_conformity_assessment(self, system_id: str) -> Dict[str, Any]:
        """
        Generate conformity assessment for AI system.
        
        Args:
            system_id: AI system identifier
            
        Returns:
            Conformity assessment results
        """
        try:
            if system_id not in self.compliance_records:
                raise ValueError(f"System {system_id} not found")
            
            record = self.compliance_records[system_id]
            assessment_id = f"conformity_{int(datetime.now().timestamp() * 1000)}"
            
            # Assess compliance with AI Act requirements
            conformity_results = {
                'assessment_id': assessment_id,
                'system_id': system_id,
                'assessment_date': datetime.now().isoformat(),
                'assessor': self.organization_name,
                'requirements_assessment': self._assess_ai_act_requirements(record),
                'documentation_completeness': self._assess_documentation_completeness(record),
                'technical_compliance': self._assess_technical_compliance(record),
                'overall_conformity': 'compliant',  # Will be determined based on assessments
                'non_conformities': [],
                'recommendations': []
            }
            
            # Determine overall conformity
            non_conformities = []
            for requirement, status in conformity_results['requirements_assessment'].items():
                if not status['compliant']:
                    non_conformities.append(f"{requirement}: {status['issues']}")
            
            conformity_results['non_conformities'] = non_conformities
            conformity_results['overall_conformity'] = 'compliant' if not non_conformities else 'non_compliant'
            
            # Store assessment
            self.conformity_assessments[system_id] = conformity_results
            
            # Log compliance activity
            self._log_compliance_activity(
                system_id, "conformity_assessment",
                f"Conformity assessment completed: {assessment_id}"
            )
            
            logger.info(f"Generated conformity assessment {assessment_id} for system {system_id}")
            return conformity_results
            
        except Exception as e:
            logger.error(f"Error generating conformity assessment: {str(e)}")
            raise
    
    def _assess_ai_act_requirements(self, record: AIActComplianceRecord) -> Dict[str, Any]:
        """
        Assess compliance with specific AI Act requirements.
        
        Args:
            record: Compliance record
            
        Returns:
            Requirements assessment
        """
        requirements_assessment = {}
        
        # Transparency documentation (Article 13)
        requirements_assessment['transparency_documentation'] = {
            'compliant': bool(record.transparency_documentation),
            'issues': [] if record.transparency_documentation else ['Missing transparency documentation']
        }
        
        # Technical documentation (Article 11)
        requirements_assessment['technical_documentation'] = {
            'compliant': bool(record.technical_documentation),
            'issues': [] if record.technical_documentation else ['Missing technical documentation']
        }
        
        # Human oversight (Article 14)
        requirements_assessment['human_oversight'] = {
            'compliant': bool(record.human_oversight_measures),
            'issues': [] if record.human_oversight_measures else ['Missing human oversight measures']
        }
        
        # Risk management (Article 9)
        requirements_assessment['risk_management'] = {
            'compliant': bool(record.risk_management_documentation),
            'issues': [] if record.risk_management_documentation else ['Missing risk management documentation']
        }
        
        return requirements_assessment
    
    def _assess_documentation_completeness(self, record: AIActComplianceRecord) -> Dict[str, Any]:
        """
        Assess completeness of documentation.
        
        Args:
            record: Compliance record
            
        Returns:
            Documentation completeness assessment
        """
        required_sections = [
            'system_identification', 'intended_purpose', 'capabilities_and_limitations',
            'accuracy_performance', 'data_governance', 'human_oversight', 'cybersecurity_measures'
        ]
        
        missing_sections = []
        for section in required_sections:
            if section not in record.transparency_documentation:
                missing_sections.append(section)
        
        return {
            'completeness_percentage': (len(required_sections) - len(missing_sections)) / len(required_sections) * 100,
            'missing_sections': missing_sections,
            'complete': len(missing_sections) == 0
        }
    
    def _assess_technical_compliance(self, record: AIActComplianceRecord) -> Dict[str, Any]:
        """
        Assess technical compliance measures.
        
        Args:
            record: Compliance record
            
        Returns:
            Technical compliance assessment
        """
        technical_measures = [
            'accuracy_monitoring', 'robustness_testing', 'bias_detection',
            'cybersecurity_measures', 'data_quality_controls'
        ]
        
        implemented_measures = []
        if record.performance_metrics:
            implemented_measures.extend(['accuracy_monitoring', 'robustness_testing'])
        if record.bias_assessments:
            implemented_measures.append('bias_detection')
        if 'cybersecurity_measures' in record.transparency_documentation:
            implemented_measures.append('cybersecurity_measures')
        
        return {
            'implemented_measures': implemented_measures,
            'missing_measures': [m for m in technical_measures if m not in implemented_measures],
            'compliance_score': len(implemented_measures) / len(technical_measures) * 100
        }
    
    def _log_compliance_activity(self, system_id: str, activity_type: str, description: str):
        """
        Log compliance activity for audit trail.
        
        Args:
            system_id: AI system identifier
            activity_type: Type of activity
            description: Activity description
        """
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'system_id': system_id,
            'activity_type': activity_type,
            'description': description,
            'operator': 'system'  # Would be actual operator in practice
        }
        
        self.audit_logs.append(log_entry)
    
    def get_compliance_status(self, system_id: str = None) -> Dict[str, Any]:
        """
        Get comprehensive compliance status.
        
        Args:
            system_id: Specific system ID (if None, returns all systems)
            
        Returns:
            Compliance status report
        """
        if system_id:
            if system_id not in self.compliance_records:
                return {'error': f'System {system_id} not found'}
            
            record = self.compliance_records[system_id]
            return {
                'system_id': system_id,
                'system_name': record.system_name,
                'risk_level': record.risk_level.value,
                'compliance_status': self._get_system_compliance_status(record),
                'last_assessment': record.performance_metrics.get('last_updated'),
                'documentation_status': self._get_documentation_status(record),
                'human_oversight_status': bool(record.human_oversight_measures)
            }
        else:
            # Return status for all systems
            all_systems_status = {}
            for sys_id, record in self.compliance_records.items():
                all_systems_status[sys_id] = {
                    'system_name': record.system_name,
                    'risk_level': record.risk_level.value,
                    'compliance_status': self._get_system_compliance_status(record)
                }
            
            return {
                'organization': self.organization_name,
                'total_systems': len(self.compliance_records),
                'systems_status': all_systems_status,
                'overall_compliance': self._calculate_overall_compliance()
            }
    
    def _get_system_compliance_status(self, record: AIActComplianceRecord) -> str:
        """
        Get compliance status for a specific system.
        
        Args:
            record: Compliance record
            
        Returns:
            Compliance status
        """
        required_components = [
            bool(record.transparency_documentation),
            bool(record.technical_documentation),
            bool(record.human_oversight_measures),
            bool(record.risk_management_documentation)
        ]
        
        compliance_score = sum(required_components) / len(required_components)
        
        if compliance_score >= 1.0:
            return 'fully_compliant'
        elif compliance_score >= 0.75:
            return 'mostly_compliant'
        elif compliance_score >= 0.5:
            return 'partially_compliant'
        else:
            return 'non_compliant'
    
    def _get_documentation_status(self, record: AIActComplianceRecord) -> Dict[str, bool]:
        """
        Get documentation status for a system.
        
        Args:
            record: Compliance record
            
        Returns:
            Documentation status
        """
        return {
            'transparency_documentation': bool(record.transparency_documentation),
            'technical_documentation': bool(record.technical_documentation),
            'risk_management_documentation': bool(record.risk_management_documentation),
            'quality_management_documentation': bool(record.quality_management_documentation)
        }
    
    def _calculate_overall_compliance(self) -> str:
        """
        Calculate overall organizational compliance.
        
        Returns:
            Overall compliance status
        """
        if not self.compliance_records:
            return 'no_systems_registered'
        
        compliant_systems = 0
        for record in self.compliance_records.values():
            status = self._get_system_compliance_status(record)
            if status in ['fully_compliant', 'mostly_compliant']:
                compliant_systems += 1
        
        compliance_rate = compliant_systems / len(self.compliance_records)
        
        if compliance_rate >= 0.9:
            return 'excellent'
        elif compliance_rate >= 0.75:
            return 'good'
        elif compliance_rate >= 0.5:
            return 'needs_improvement'
        else:
            return 'poor'
    
    def generate_compliance_report(self) -> Dict[str, Any]:
        """
        Generate comprehensive compliance report.
        
        Returns:
            Compliance report
        """
        return {
            'organization_info': {
                'name': self.organization_name,
                'address': self.organization_address,
                'authorized_representative': self.authorized_representative,
                'technical_contact': self.technical_contact
            },
            'report_metadata': {
                'generated_at': datetime.now().isoformat(),
                'report_period': 'Current status',
                'report_version': '1.0'
            },
            'compliance_summary': {
                'total_ai_systems': len(self.compliance_records),
                'high_risk_systems': len([r for r in self.compliance_records.values() 
                                        if r.risk_level == AISystemRiskLevel.HIGH_RISK]),
                'overall_compliance_status': self._calculate_overall_compliance(),
                'systems_by_risk_level': self._count_systems_by_risk_level()
            },
            'detailed_system_status': self.get_compliance_status(),
            'conformity_assessments': len(self.conformity_assessments),
            'audit_trail_entries': len(self.audit_logs),
            'recommendations': self._generate_compliance_recommendations()
        }
    
    def _count_systems_by_risk_level(self) -> Dict[str, int]:
        """
        Count systems by risk level.
        
        Returns:
            Count by risk level
        """
        counts = {level.value: 0 for level in AISystemRiskLevel}
        
        for record in self.compliance_records.values():
            counts[record.risk_level.value] += 1
        
        return counts
    
    def _generate_compliance_recommendations(self) -> List[str]:
        """
        Generate compliance recommendations.
        
        Returns:
            List of recommendations
        """
        recommendations = []
        
        # Check for incomplete documentation
        incomplete_docs = 0
        for record in self.compliance_records.values():
            if not all([
                record.transparency_documentation,
                record.technical_documentation,
                record.risk_management_documentation
            ]):
                incomplete_docs += 1
        
        if incomplete_docs > 0:
            recommendations.append(
                f"Complete documentation for {incomplete_docs} systems with missing documentation"
            )
        
        # Check for missing conformity assessments
        systems_without_assessment = len(self.compliance_records) - len(self.conformity_assessments)
        if systems_without_assessment > 0:
            recommendations.append(
                f"Conduct conformity assessments for {systems_without_assessment} systems"
            )
        
        # Check for recent performance assessments
        outdated_assessments = 0
        cutoff_date = datetime.now() - timedelta(days=90)
        
        for record in self.compliance_records.values():
            if record.accuracy_assessments:
                last_assessment = record.accuracy_assessments[-1]
                assessment_date = datetime.fromisoformat(last_assessment['timestamp'])
                if assessment_date < cutoff_date:
                    outdated_assessments += 1
            else:
                outdated_assessments += 1
        
        if outdated_assessments > 0:
            recommendations.append(
                f"Update performance assessments for {outdated_assessments} systems"
            )
        
        if not recommendations:
            recommendations.append("AI Act compliance appears satisfactory. Continue regular monitoring.")
        
        return recommendations
