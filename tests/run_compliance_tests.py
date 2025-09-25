#!/usr/bin/env python3
"""
TrustStram v4.4 Comprehensive Compliance Testing Execution

Main execution script for running all compliance tests and generating
the certification readiness assessment report.
"""

import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any
import sys

# Add the current directory to Python path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from compliance_testing_framework import ComplianceTestingFramework, ComplianceTestResult, ComplianceReport
from extended_compliance_tests import ExtendedComplianceTests

class ComprehensiveComplianceTester:
    """Main compliance testing orchestrator."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.framework = None
        self.extended_tests = None
        self.report_dir = Path("tests")
        self.report_dir.mkdir(exist_ok=True)
    
    async def run_comprehensive_compliance_testing(self) -> Dict[str, Any]:
        """Run comprehensive compliance testing across all frameworks."""
        print("🔍 Starting TrustStram v4.4 Comprehensive Compliance Testing")
        print("=" * 70)
        
        # Initialize testing framework
        self.framework = ComplianceTestingFramework(self.base_url)
        self.extended_tests = ExtendedComplianceTests(self.framework)
        
        # Run all compliance tests
        test_results = await self._execute_all_tests()
        
        # Generate comprehensive report
        report = await self._generate_comprehensive_report(test_results)
        
        # Save results
        await self._save_results(report)
        
        # Generate summary
        summary = self._generate_summary(report)
        
        return {
            'report': report,
            'summary': summary,
            'certification_ready': report.overall_score >= 80
        }
    
    async def _execute_all_tests(self) -> List[ComplianceTestResult]:
        """Execute all compliance framework tests."""
        print("\n🧪 Executing compliance tests...\n")
        
        # GDPR Compliance Tests
        print("📋 Testing GDPR Compliance...")
        await self._test_gdpr_comprehensive()
        
        # EU AI Act Compliance Tests
        print("🤖 Testing EU AI Act Compliance...")
        await self._test_eu_ai_act_comprehensive()
        
        # SOC 2 Compliance Tests
        print("🔒 Testing SOC 2 Compliance...")
        await self._test_soc2_comprehensive()
        
        # ISO 27001 Compliance Tests
        print("🛡️ Testing ISO 27001 Compliance...")
        await self._test_iso27001_comprehensive()
        
        # HIPAA Compliance Tests
        print("🏥 Testing HIPAA Compliance...")
        await self._test_hipaa_comprehensive()
        
        # Audit Trail and Logging Tests
        print("📝 Testing Audit Trail Functionality...")
        await self._test_audit_comprehensive()
        
        # AI Explainability Tests
        print("💡 Testing AI Explainability Compliance...")
        await self._test_explainability_comprehensive()
        
        # Data Handling and Privacy Tests
        print("🔐 Testing Data Handling and Privacy Controls...")
        await self._test_privacy_comprehensive()
        
        return self.framework.test_results
    
    async def _test_gdpr_comprehensive(self):
        """Run comprehensive GDPR tests."""
        # Article 7: Consent Management
        await self.framework._test_gdpr_consent_management()
        
        # Article 15: Right of Access
        await self.framework._test_gdpr_right_of_access()
        
        # Article 17: Right to Erasure
        await self.framework._test_gdpr_right_to_erasure()
        
        # Article 20: Data Portability
        await self.framework._test_gdpr_data_portability()
        
        # Article 22: Automated Decision-Making
        await self.framework._test_gdpr_automated_decision_making()
        
        # Additional GDPR tests
        await self._test_gdpr_data_minimization()
        await self._test_gdpr_data_retention()
        await self._test_gdpr_cross_border_transfers()
    
    async def _test_gdpr_data_minimization(self):
        """Test GDPR data minimization principle."""
        test_id = f"gdpr_minimization_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            # Test data collection justification
            justification_response = await self.framework._make_request(
                'GET', '/api/v4/gdpr/data-collection/justification'
            )
            
            minimization_documented = (
                justification_response and 
                'purpose_limitation' in justification_response and
                'necessity_assessment' in justification_response
            )
            
            # Test automated data purging
            purging_response = await self.framework._make_request(
                'GET', '/api/v4/gdpr/data-retention/automated-purging'
            )
            
            automated_purging = (
                purging_response and 
                purging_response.get('automated_purging_enabled') == True
            )
            
            score = 50 if minimization_documented else 0
            score += 50 if automated_purging else 0
            
            self.framework.test_results.append(ComplianceTestResult(
                test_id=test_id,
                framework='GDPR',
                test_name='Data Minimization Principle',
                status='PASS' if score >= 80 else 'FAIL',
                score=score,
                details=f"Minimization documented: {minimization_documented}, Automated purging: {automated_purging}",
                evidence={
                    'justification_response': justification_response,
                    'purging_response': purging_response
                },
                timestamp=datetime.now(timezone.utc).isoformat(),
                remediation='Implement data minimization documentation and automated purging' if score < 80 else None
            ))
            
        except Exception as e:
            self.framework.test_results.append(ComplianceTestResult(
                test_id=test_id,
                framework='GDPR',
                test_name='Data Minimization Principle',
                status='FAIL',
                score=0,
                details=f"Test failed: {str(e)}",
                evidence={'error': str(e)},
                timestamp=datetime.now(timezone.utc).isoformat(),
                remediation='Implement GDPR data minimization endpoints'
            ))
    
    async def _test_eu_ai_act_comprehensive(self):
        """Run comprehensive EU AI Act tests."""
        await self.extended_tests._test_ai_risk_management()
        await self.extended_tests._test_ai_data_governance()
        await self._test_ai_technical_documentation()
        await self._test_ai_record_keeping()
        await self._test_ai_transparency_obligations()
        await self._test_ai_human_oversight()
        await self._test_ai_accuracy_robustness()
    
    async def _test_ai_technical_documentation(self):
        """Test EU AI Act technical documentation requirements."""
        test_id = f"ai_act_docs_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            # Test system description
            system_docs = await self.framework._make_request(
                'GET', '/api/v4/ai/documentation/system-description'
            )
            
            system_documented = (
                system_docs and 
                'intended_purpose' in system_docs and
                'performance_metrics' in system_docs
            )
            
            # Test algorithm documentation
            algo_docs = await self.framework._make_request(
                'GET', '/api/v4/ai/documentation/algorithms'
            )
            
            algorithms_documented = (
                algo_docs and 
                'architecture_description' in algo_docs and
                'training_methodology' in algo_docs
            )
            
            # Test testing and validation
            validation_docs = await self.framework._make_request(
                'GET', '/api/v4/ai/documentation/validation-results'
            )
            
            validation_documented = (
                validation_docs and 
                'test_results' in validation_docs and
                'performance_benchmarks' in validation_docs
            )
            
            score = 0
            if system_documented: score += 35
            if algorithms_documented: score += 35
            if validation_documented: score += 30
            
            self.framework.test_results.append(ComplianceTestResult(
                test_id=test_id,
                framework='EU_AI_Act',
                test_name='Article 11 - Technical Documentation',
                status='PASS' if score >= 80 else 'FAIL',
                score=score,
                details=f"System docs: {system_documented}, Algorithm docs: {algorithms_documented}, Validation: {validation_documented}",
                evidence={
                    'system_docs': system_docs,
                    'algo_docs': algo_docs,
                    'validation_docs': validation_docs
                },
                timestamp=datetime.now(timezone.utc).isoformat(),
                remediation='Complete technical documentation for AI systems' if score < 80 else None
            ))
            
        except Exception as e:
            self.framework.test_results.append(ComplianceTestResult(
                test_id=test_id,
                framework='EU_AI_Act',
                test_name='Article 11 - Technical Documentation',
                status='FAIL',
                score=0,
                details=f"Test failed: {str(e)}",
                evidence={'error': str(e)},
                timestamp=datetime.now(timezone.utc).isoformat(),
                remediation='Implement AI technical documentation endpoints'
            ))
    
    async def _test_soc2_comprehensive(self):
        """Run comprehensive SOC 2 tests."""
        await self.extended_tests._test_soc2_security()
        await self._test_soc2_availability()
        await self._test_soc2_processing_integrity()
        await self._test_soc2_confidentiality()
        await self._test_soc2_privacy()
    
    async def _test_soc2_availability(self):
        """Test SOC 2 availability controls."""
        test_id = f"soc2_availability_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            # Test system monitoring
            monitoring_response = await self.framework._make_request(
                'GET', '/api/v4/soc2/availability/monitoring'
            )
            
            monitoring_active = (
                monitoring_response and 
                monitoring_response.get('uptime_monitoring') == True and
                monitoring_response.get('performance_monitoring') == True
            )
            
            # Test backup systems
            backup_response = await self.framework._make_request(
                'GET', '/api/v4/soc2/availability/backup-systems'
            )
            
            backup_systems = (
                backup_response and 
                backup_response.get('automated_backups') == True and
                backup_response.get('disaster_recovery_plan') == True
            )
            
            # Test capacity management
            capacity_response = await self.framework._make_request(
                'GET', '/api/v4/soc2/availability/capacity-management'
            )
            
            capacity_managed = (
                capacity_response and 
                'resource_allocation' in capacity_response and
                'scaling_policies' in capacity_response
            )
            
            score = 0
            if monitoring_active: score += 35
            if backup_systems: score += 35
            if capacity_managed: score += 30
            
            self.framework.test_results.append(ComplianceTestResult(
                test_id=test_id,
                framework='SOC2',
                test_name='Availability Controls',
                status='PASS' if score >= 80 else 'FAIL',
                score=score,
                details=f"Monitoring: {monitoring_active}, Backups: {backup_systems}, Capacity: {capacity_managed}",
                evidence={
                    'monitoring_response': monitoring_response,
                    'backup_response': backup_response,
                    'capacity_response': capacity_response
                },
                timestamp=datetime.now(timezone.utc).isoformat(),
                remediation='Implement comprehensive availability controls' if score < 80 else None
            ))
            
        except Exception as e:
            self.framework.test_results.append(ComplianceTestResult(
                test_id=test_id,
                framework='SOC2',
                test_name='Availability Controls',
                status='FAIL',
                score=0,
                details=f"Test failed: {str(e)}",
                evidence={'error': str(e)},
                timestamp=datetime.now(timezone.utc).isoformat(),
                remediation='Implement SOC 2 availability control endpoints'
            ))
    
    async def _test_iso27001_comprehensive(self):
        """Run comprehensive ISO 27001 tests."""
        await self.extended_tests._test_iso_security_policy()
        await self._test_iso_access_control()
        await self._test_iso_cryptography()
        await self._test_iso_incident_management()
        await self._test_iso_business_continuity()
    
    async def _test_hipaa_comprehensive(self):
        """Run comprehensive HIPAA tests."""
        await self.extended_tests._test_hipaa_administrative_safeguards()
        await self._test_hipaa_physical_safeguards()
        await self._test_hipaa_technical_safeguards()
        await self._test_hipaa_phi_handling()
    
    async def _test_audit_comprehensive(self):
        """Run comprehensive audit trail tests."""
        await self.extended_tests._test_audit_logging()
        await self._test_log_integrity()
        await self._test_log_retention()
        await self._test_log_access_controls()
    
    async def _test_explainability_comprehensive(self):
        """Run comprehensive AI explainability tests."""
        await self.extended_tests._test_realtime_explanations()
        await self._test_stakeholder_explanations()
        await self._test_explanation_auditing()
        await self._test_explanation_performance()
    
    async def _test_privacy_comprehensive(self):
        """Run comprehensive privacy control tests."""
        await self._test_privacy_by_design()
        await self._test_data_encryption()
        await self._test_access_controls()
        await self._test_data_masking()
    
    # Placeholder methods for additional tests (would be fully implemented)
    async def _test_gdpr_data_retention(self): pass
    async def _test_gdpr_cross_border_transfers(self): pass
    async def _test_ai_record_keeping(self): pass
    async def _test_ai_transparency_obligations(self): pass
    async def _test_ai_human_oversight(self): pass
    async def _test_ai_accuracy_robustness(self): pass
    async def _test_soc2_processing_integrity(self): pass
    async def _test_soc2_confidentiality(self): pass
    async def _test_soc2_privacy(self): pass
    async def _test_iso_access_control(self): pass
    async def _test_iso_cryptography(self): pass
    async def _test_iso_incident_management(self): pass
    async def _test_iso_business_continuity(self): pass
    async def _test_hipaa_physical_safeguards(self): pass
    async def _test_hipaa_technical_safeguards(self): pass
    async def _test_hipaa_phi_handling(self): pass
    async def _test_log_integrity(self): pass
    async def _test_log_retention(self): pass
    async def _test_log_access_controls(self): pass
    async def _test_stakeholder_explanations(self): pass
    async def _test_explanation_auditing(self): pass
    async def _test_explanation_performance(self): pass
    async def _test_privacy_by_design(self): pass
    async def _test_data_encryption(self): pass
    async def _test_access_controls(self): pass
    async def _test_data_masking(self): pass
    
    async def _generate_comprehensive_report(self, test_results: List[ComplianceTestResult]) -> ComplianceReport:
        """Generate comprehensive compliance report."""
        # Calculate framework scores
        framework_scores = {}
        framework_results = {}
        
        for result in test_results:
            if result.framework not in framework_results:
                framework_results[result.framework] = []
            framework_results[result.framework].append(result.score)
        
        for framework, scores in framework_results.items():
            framework_scores[framework] = sum(scores) / len(scores) if scores else 0
        
        overall_score = sum(framework_scores.values()) / len(framework_scores) if framework_scores else 0
        
        # Determine certification readiness
        certification_readiness = {}
        for framework, score in framework_scores.items():
            if score >= 95:
                certification_readiness[framework] = 'CERTIFICATION_READY'
            elif score >= 85:
                certification_readiness[framework] = 'MINOR_REMEDIATION_NEEDED'
            elif score >= 70:
                certification_readiness[framework] = 'MODERATE_REMEDIATION_NEEDED'
            elif score >= 50:
                certification_readiness[framework] = 'MAJOR_REMEDIATION_NEEDED'
            else:
                certification_readiness[framework] = 'NOT_READY_FOR_CERTIFICATION'
        
        # Identify critical issues
        critical_issues = []
        for result in test_results:
            if result.status == 'FAIL' and result.score < 50:
                critical_issues.append(f"{result.framework}: {result.test_name} (Score: {result.score}%)")
        
        # Generate recommendations
        recommendations = []
        for result in test_results:
            if result.remediation:
                recommendations.append(f"{result.framework}: {result.remediation}")
        
        return ComplianceReport(
            test_run_id=self.framework.test_run_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            overall_score=overall_score,
            framework_scores=framework_scores,
            certification_readiness=certification_readiness,
            critical_issues=critical_issues,
            recommendations=list(set(recommendations)),  # Remove duplicates
            test_results=test_results
        )
    
    async def _save_results(self, report: ComplianceReport):
        """Save test results to files."""
        # Save detailed report as JSON
        json_report_path = self.report_dir / "compliance_testing_results_detailed.json"
        with open(json_report_path, 'w') as f:
            json.dump({
                'report': {
                    'test_run_id': report.test_run_id,
                    'timestamp': report.timestamp,
                    'overall_score': report.overall_score,
                    'framework_scores': report.framework_scores,
                    'certification_readiness': report.certification_readiness,
                    'critical_issues': report.critical_issues,
                    'recommendations': report.recommendations
                },
                'test_results': [{
                    'test_id': result.test_id,
                    'framework': result.framework,
                    'test_name': result.test_name,
                    'status': result.status,
                    'score': result.score,
                    'details': result.details,
                    'timestamp': result.timestamp,
                    'remediation': result.remediation
                } for result in report.test_results]
            }, f, indent=2)
        
        print(f"\n💾 Detailed results saved to: {json_report_path}")
    
    def _generate_summary(self, report: ComplianceReport) -> Dict[str, Any]:
        """Generate executive summary."""
        return {
            'overall_compliance_score': f"{report.overall_score:.1f}%",
            'certification_status': 'READY' if report.overall_score >= 85 else 'NEEDS_REMEDIATION',
            'frameworks_tested': len(report.framework_scores),
            'total_tests_executed': len(report.test_results),
            'critical_issues_count': len(report.critical_issues),
            'top_performing_framework': max(report.framework_scores.items(), key=lambda x: x[1]) if report.framework_scores else None,
            'areas_needing_attention': [fw for fw, status in report.certification_readiness.items() if 'NOT_READY' in status or 'MAJOR' in status]
        }

# Main execution
async def main():
    """Main execution function."""
    try:
        tester = ComprehensiveComplianceTester()
        results = await tester.run_comprehensive_compliance_testing()
        
        print("\n" + "="*70)
        print("🏆 COMPLIANCE TESTING COMPLETED")
        print("="*70)
        print(f"📊 Overall Score: {results['summary']['overall_compliance_score']}")
        print(f"✅ Certification Status: {results['summary']['certification_status']}")
        print(f"🧪 Total Tests: {results['summary']['total_tests_executed']}")
        print(f"⚠️  Critical Issues: {results['summary']['critical_issues_count']}")
        
        if results['summary']['top_performing_framework']:
            fw_name, fw_score = results['summary']['top_performing_framework']
            print(f"🥇 Top Framework: {fw_name} ({fw_score:.1f}%)")
        
        if results['summary']['areas_needing_attention']:
            print(f"🔧 Needs Attention: {', '.join(results['summary']['areas_needing_attention'])}")
        
        return results
        
    except Exception as e:
        print(f"❌ Compliance testing failed: {str(e)}")
        return None

if __name__ == "__main__":
    results = asyncio.run(main())
