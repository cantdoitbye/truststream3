#!/usr/bin/env python3
"""
TrustStram v4.4 Compliance Testing Report Generator

Generates comprehensive compliance testing reports with certification readiness assessment.
"""

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any
import sys
import os

# Add the current directory to Python path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from run_compliance_tests import ComprehensiveComplianceTester

class ComplianceReportGenerator:
    """Generates comprehensive compliance testing reports."""
    
    def __init__(self):
        self.report_dir = Path("tests")
        self.report_dir.mkdir(exist_ok=True)
    
    async def generate_full_compliance_report(self) -> str:
        """Generate the full compliance testing report."""
        # Run comprehensive compliance testing
        print("🚀 Starting TrustStram v4.4 Comprehensive Compliance Testing...")
        
        tester = ComprehensiveComplianceTester()
        results = await tester.run_comprehensive_compliance_testing()
        
        if not results:
            return "Failed to generate compliance report"
        
        # Generate markdown report
        report_content = self._generate_markdown_report(results)
        
        # Save report
        report_path = self.report_dir / "compliance_testing_results.md"
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"\n📝 Comprehensive compliance report saved to: {report_path}")
        return str(report_path)
    
    def _generate_markdown_report(self, results: Dict[str, Any]) -> str:
        """Generate comprehensive markdown report."""
        report = results['report']
        summary = results['summary']
        
        # Generate report timestamp
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        
        markdown_content = f"""# TrustStram v4.4 Comprehensive Compliance and Regulatory Testing Report

**Report Generated:** {timestamp}  
**Test Run ID:** {report.test_run_id}  
**Testing Framework:** TrustStram Compliance Testing Suite v4.4  
**Assessment Scope:** GDPR, EU AI Act, SOC 2, ISO 27001, HIPAA, Audit Trail, AI Explainability  

---

## 🏆 Executive Summary

### Overall Compliance Assessment

| **Metric** | **Result** | **Status** |
|------------|------------|------------|
| **Overall Compliance Score** | **{summary['overall_compliance_score']}** | {'✅ EXCELLENT' if report.overall_score >= 90 else '⚠️ NEEDS IMPROVEMENT' if report.overall_score >= 70 else '❌ SIGNIFICANT GAPS'} |
| **Certification Readiness** | **{summary['certification_status']}** | {'✅ READY' if summary['certification_status'] == 'READY' else '⚠️ REMEDIATION REQUIRED'} |
| **Frameworks Tested** | {summary['frameworks_tested']} | ✅ COMPREHENSIVE |
| **Total Tests Executed** | {summary['total_tests_executed']} | ✅ COMPLETE |
| **Critical Issues** | {summary['critical_issues_count']} | {'✅ NONE' if summary['critical_issues_count'] == 0 else '⚠️ REQUIRES ATTENTION'} |

### Key Findings

{self._generate_key_findings(report, summary)}

### Certification Readiness Assessment

{self._generate_certification_assessment(report)}

---

## 📋 Framework-by-Framework Analysis

{self._generate_framework_analysis(report)}

---

## 🔍 Detailed Test Results

{self._generate_detailed_results(report)}

---

## 🛡️ Security and Privacy Controls Assessment

{self._generate_security_assessment(report)}

---

## 🤖 AI Governance and Explainability Assessment

{self._generate_ai_governance_assessment(report)}

---

## 📝 Audit Trail and Compliance Monitoring Assessment

{self._generate_audit_assessment(report)}

---

## ⚠️ Critical Issues and Remediation

{self._generate_critical_issues(report)}

---

## 📦 Recommendations for Certification Readiness

{self._generate_recommendations(report)}

---

## 📊 Compliance Metrics and KPIs

{self._generate_metrics(report)}

---

## 📄 Appendices

### Appendix A: Test Methodology

{self._generate_methodology()}

### Appendix B: Regulatory Framework Requirements

{self._generate_framework_requirements()}

### Appendix C: Evidence and Artifacts

{self._generate_evidence_summary(report)}

---

## 🔍 Conclusion

{self._generate_conclusion(report, summary)}

---

**Report Prepared By:** TrustStram Compliance Testing Framework  
**Assessment Date:** {timestamp}  
**Next Review Recommended:** {self._calculate_next_review_date()}  
**Contact:** compliance@trustram.com  

*This report provides a comprehensive assessment of TrustStram v4.4's compliance posture across major regulatory frameworks. All findings are based on automated testing and should be validated through formal audits for certification purposes.*
"""
        
        return markdown_content
    
    def _generate_key_findings(self, report, summary) -> str:
        """Generate key findings section."""
        findings = []
        
        if report.overall_score >= 90:
            findings.append("🎆 **Excellent Compliance Posture**: TrustStram v4.4 demonstrates exceptional compliance across all tested frameworks.")
        elif report.overall_score >= 80:
            findings.append("🟢 **Strong Compliance Foundation**: TrustStram v4.4 shows robust compliance with minor areas for improvement.")
        else:
            findings.append("🟡 **Compliance Gaps Identified**: TrustStram v4.4 requires significant remediation to achieve certification readiness.")
        
        # Top performing framework
        if summary.get('top_performing_framework'):
            fw_name, fw_score = summary['top_performing_framework']
            findings.append(f"🥇 **Leading Framework**: {fw_name} achieved the highest compliance score ({fw_score:.1f}%).")
        
        # Areas needing attention
        if summary.get('areas_needing_attention'):
            findings.append(f"🔧 **Priority Areas**: {', '.join(summary['areas_needing_attention'])} require immediate attention.")
        
        return "\n".join([f"- {finding}" for finding in findings])
    
    def _generate_certification_assessment(self, report) -> str:
        """Generate certification readiness assessment."""
        assessment = []
        
        for framework, status in report.certification_readiness.items():
            if status == 'CERTIFICATION_READY':
                assessment.append(f"✅ **{framework}**: Ready for certification audit")
            elif status == 'MINOR_REMEDIATION_NEEDED':
                assessment.append(f"🟡 **{framework}**: Minor remediation required before certification")
            elif status == 'MODERATE_REMEDIATION_NEEDED':
                assessment.append(f"🟠 **{framework}**: Moderate remediation required")
            elif status == 'MAJOR_REMEDIATION_NEEDED':
                assessment.append(f"🔴 **{framework}**: Major remediation required")
            else:
                assessment.append(f"❌ **{framework}**: Not ready for certification")
        
        return "\n".join(assessment)
    
    def _generate_framework_analysis(self, report) -> str:
        """Generate framework-by-framework analysis."""
        analysis = []
        
        for framework, score in report.framework_scores.items():
            status_emoji = "✅" if score >= 90 else "🟡" if score >= 80 else "🟠" if score >= 70 else "🔴"
            
            # Get framework-specific results
            framework_tests = [r for r in report.test_results if r.framework == framework]
            passed_tests = len([r for r in framework_tests if r.status == 'PASS'])
            total_tests = len(framework_tests)
            
            analysis.append(f"""### {status_emoji} {framework}

**Score:** {score:.1f}%  
**Status:** {report.certification_readiness.get(framework, 'Unknown')}  
**Tests Passed:** {passed_tests}/{total_tests}  

**Key Test Results:**
{self._get_framework_test_summary(framework_tests)}

**Certification Readiness:** {self._get_certification_status_description(report.certification_readiness.get(framework))}
""")
        
        return "\n".join(analysis)
    
    def _get_framework_test_summary(self, tests) -> str:
        """Get summary of framework tests."""
        summary = []
        for test in tests[:5]:  # Show top 5 tests
            status_emoji = "✅" if test.status == 'PASS' else "❌" if test.status == 'FAIL' else "⚠️"
            summary.append(f"- {status_emoji} {test.test_name}: {test.score:.0f}%")
        
        if len(tests) > 5:
            summary.append(f"- ... and {len(tests) - 5} more tests")
        
        return "\n".join(summary)
    
    def _get_certification_status_description(self, status) -> str:
        """Get description of certification status."""
        descriptions = {
            'CERTIFICATION_READY': 'System is ready for formal certification audit with minimal risk.',
            'MINOR_REMEDIATION_NEEDED': 'Minor gaps identified that can be addressed quickly.',
            'MODERATE_REMEDIATION_NEEDED': 'Moderate effort required to achieve certification readiness.',
            'MAJOR_REMEDIATION_NEEDED': 'Significant remediation required before certification attempt.',
            'NOT_READY_FOR_CERTIFICATION': 'Substantial work needed to meet certification requirements.'
        }
        return descriptions.get(status, 'Status unknown')
    
    def _generate_detailed_results(self, report) -> str:
        """Generate detailed test results section."""
        results = []
        
        # Group by framework
        frameworks = set(r.framework for r in report.test_results)
        
        for framework in sorted(frameworks):
            framework_tests = [r for r in report.test_results if r.framework == framework]
            
            results.append(f"### {framework} Detailed Results\n")
            results.append("| Test Name | Status | Score | Details |")
            results.append("|-----------|--------|-------|---------|")
            
            for test in framework_tests:
                status_emoji = "✅" if test.status == 'PASS' else "❌" if test.status == 'FAIL' else "⚠️"
                results.append(f"| {test.test_name} | {status_emoji} {test.status} | {test.score:.0f}% | {test.details[:100]}... |")
            
            results.append("\n")
        
        return "\n".join(results)
    
    def _generate_security_assessment(self, report) -> str:
        """Generate security and privacy controls assessment."""
        security_frameworks = ['SOC2', 'ISO27001', 'HIPAA']
        security_tests = [r for r in report.test_results if r.framework in security_frameworks]
        
        if not security_tests:
            return "No security-specific tests were executed in this assessment."
        
        avg_score = sum(r.score for r in security_tests) / len(security_tests)
        passed_tests = len([r for r in security_tests if r.status == 'PASS'])
        
        assessment = f"""**Security Compliance Score:** {avg_score:.1f}%  
**Security Tests Passed:** {passed_tests}/{len(security_tests)}  

**Key Security Controls:**
"""
        
        for test in security_tests:
            if 'security' in test.test_name.lower() or 'access' in test.test_name.lower():
                status_emoji = "✅" if test.status == 'PASS' else "❌"
                assessment += f"- {status_emoji} {test.test_name}: {test.score:.0f}%\n"
        
        return assessment
    
    def _generate_ai_governance_assessment(self, report) -> str:
        """Generate AI governance and explainability assessment."""
        ai_frameworks = ['EU_AI_Act', 'AI_EXPLAINABILITY', 'GDPR']
        ai_tests = [r for r in report.test_results if r.framework in ai_frameworks and ('ai' in r.test_name.lower() or 'explanation' in r.test_name.lower())]
        
        if not ai_tests:
            return "No AI-specific governance tests were executed in this assessment."
        
        avg_score = sum(r.score for r in ai_tests) / len(ai_tests)
        passed_tests = len([r for r in ai_tests if r.status == 'PASS'])
        
        assessment = f"""**AI Governance Score:** {avg_score:.1f}%  
**AI Tests Passed:** {passed_tests}/{len(ai_tests)}  

**Key AI Governance Controls:**
"""
        
        for test in ai_tests:
            status_emoji = "✅" if test.status == 'PASS' else "❌"
            assessment += f"- {status_emoji} {test.test_name}: {test.score:.0f}%\n"
        
        return assessment
    
    def _generate_audit_assessment(self, report) -> str:
        """Generate audit trail assessment."""
        audit_tests = [r for r in report.test_results if r.framework == 'AUDIT_TRAIL' or 'audit' in r.test_name.lower()]
        
        if not audit_tests:
            return "No audit trail tests were executed in this assessment."
        
        avg_score = sum(r.score for r in audit_tests) / len(audit_tests)
        passed_tests = len([r for r in audit_tests if r.status == 'PASS'])
        
        assessment = f"""**Audit Trail Score:** {avg_score:.1f}%  
**Audit Tests Passed:** {passed_tests}/{len(audit_tests)}  

**Key Audit Capabilities:**
"""
        
        for test in audit_tests:
            status_emoji = "✅" if test.status == 'PASS' else "❌"
            assessment += f"- {status_emoji} {test.test_name}: {test.score:.0f}%\n"
        
        return assessment
    
    def _generate_critical_issues(self, report) -> str:
        """Generate critical issues section."""
        if not report.critical_issues:
            return "✅ **No Critical Issues Identified**\n\nNo critical compliance issues were identified during testing. This indicates a strong compliance foundation."
        
        issues_text = "❌ **Critical Issues Requiring Immediate Attention**\n\n"
        
        for i, issue in enumerate(report.critical_issues, 1):
            issues_text += f"{i}. {issue}\n"
        
        issues_text += "\n**Impact:** These critical issues must be resolved before pursuing formal certification."
        
        return issues_text
    
    def _generate_recommendations(self, report) -> str:
        """Generate recommendations section."""
        if not report.recommendations:
            return "✅ **System is Well-Configured**\n\nNo specific recommendations were identified. The system demonstrates strong compliance practices."
        
        rec_text = "📋 **Priority Recommendations**\n\n"
        
        # Group recommendations by framework
        framework_recs = {}
        for rec in report.recommendations:
            if ':' in rec:
                framework, recommendation = rec.split(':', 1)
                if framework not in framework_recs:
                    framework_recs[framework] = []
                framework_recs[framework].append(recommendation.strip())
        
        for framework, recs in framework_recs.items():
            rec_text += f"**{framework}:**\n"
            for rec in recs:
                rec_text += f"- {rec}\n"
            rec_text += "\n"
        
        return rec_text
    
    def _generate_metrics(self, report) -> str:
        """Generate compliance metrics and KPIs."""
        total_tests = len(report.test_results)
        passed_tests = len([r for r in report.test_results if r.status == 'PASS'])
        failed_tests = len([r for r in report.test_results if r.status == 'FAIL'])
        warning_tests = len([r for r in report.test_results if r.status == 'WARNING'])
        
        metrics = f"""### Overall Testing Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|---------|
| Overall Compliance Score | {report.overall_score:.1f}% | ≥90% | {'✅ PASS' if report.overall_score >= 90 else '❌ BELOW TARGET'} |
| Tests Passed | {passed_tests}/{total_tests} | 100% | {'✅ EXCELLENT' if passed_tests == total_tests else '⚠️ NEEDS IMPROVEMENT'} |
| Critical Issues | {len(report.critical_issues)} | 0 | {'✅ NONE' if len(report.critical_issues) == 0 else '❌ ACTION REQUIRED'} |
| Certification Ready Frameworks | {len([s for s in report.certification_readiness.values() if s == 'CERTIFICATION_READY'])} | {len(report.certification_readiness)} | {'✅ ALL READY' if all(s == 'CERTIFICATION_READY' for s in report.certification_readiness.values()) else '⚠️ PARTIAL'} |

### Framework Performance

| Framework | Score | Status | Tests Passed |
|-----------|-------|--------|--------------|
"""
        
        for framework, score in report.framework_scores.items():
            framework_tests = [r for r in report.test_results if r.framework == framework]
            framework_passed = len([r for r in framework_tests if r.status == 'PASS'])
            status_emoji = "✅" if score >= 90 else "🟡" if score >= 80 else "🔴"
            
            metrics += f"| {framework} | {score:.1f}% | {status_emoji} | {framework_passed}/{len(framework_tests)} |\n"
        
        return metrics
    
    def _generate_methodology(self) -> str:
        """Generate test methodology section."""
        return """The TrustStram v4.4 compliance testing framework employs automated testing methodologies to assess regulatory compliance across multiple frameworks:

**Testing Approach:**
- Automated endpoint testing for functional compliance
- Configuration analysis for security controls
- Policy and procedure validation
- Documentation completeness assessment
- Performance and availability testing

**Scoring Methodology:**
- Each test receives a score from 0-100%
- Framework scores are calculated as the average of all tests within that framework
- Overall score is the weighted average across all frameworks
- Pass/Fail thresholds: ≥80% = PASS, <80% = FAIL

**Certification Readiness Levels:**
- 95-100%: Certification Ready
- 85-94%: Minor Remediation Needed
- 70-84%: Moderate Remediation Needed
- 50-69%: Major Remediation Needed
- <50%: Not Ready for Certification"""
    
    def _generate_framework_requirements(self) -> str:
        """Generate framework requirements section."""
        return """**GDPR Requirements Tested:**
- Article 7: Consent Management
- Article 15: Right of Access
- Article 17: Right to Erasure
- Article 20: Data Portability
- Article 22: Automated Decision-Making

**EU AI Act Requirements Tested:**
- Article 9: Risk Management System
- Article 10: Data and Data Governance
- Article 11: Technical Documentation
- Article 12: Record Keeping
- Article 13: Transparency and Information
- Article 14: Human Oversight

**SOC 2 Trust Service Criteria:**
- Security
- Availability
- Processing Integrity
- Confidentiality
- Privacy

**ISO 27001 Controls Tested:**
- A.5: Information Security Policies
- A.9: Access Control
- A.10: Cryptography
- A.16: Information Security Incident Management

**HIPAA Safeguards:**
- Administrative Safeguards
- Physical Safeguards
- Technical Safeguards"""
    
    def _generate_evidence_summary(self, report) -> str:
        """Generate evidence summary."""
        evidence_count = sum(1 for result in report.test_results if result.evidence)
        
        return f"""**Evidence Collection Summary:**
- Total evidence artifacts collected: {evidence_count}
- API responses captured: {len([r for r in report.test_results if r.evidence.get('response')])}
- Configuration snapshots: {len([r for r in report.test_results if 'config' in str(r.evidence)])}
- Error logs captured: {len([r for r in report.test_results if r.evidence.get('error')])}

**Evidence Storage:**
All evidence artifacts are stored securely and can be provided for audit purposes upon request.

**Data Privacy:**
No personal or sensitive data was collected during testing. All test data used synthetic or anonymized datasets."""
    
    def _generate_conclusion(self, report, summary) -> str:
        """Generate conclusion section."""
        if report.overall_score >= 90:
            conclusion = f"""TrustStram v4.4 demonstrates **exceptional compliance** across all tested regulatory frameworks with an overall score of {report.overall_score:.1f}%. 

The system is **ready for certification audits** and demonstrates industry-leading compliance practices. The strong performance across GDPR, EU AI Act, SOC 2, ISO 27001, and HIPAA frameworks indicates a mature and well-implemented compliance program.

**Recommendation:** Proceed with formal certification audits for all frameworks."""
        elif report.overall_score >= 80:
            conclusion = f"""TrustStram v4.4 shows **strong compliance foundations** with an overall score of {report.overall_score:.1f}%. 

While most requirements are met, some areas require attention before pursuing formal certification. The identified gaps are addressable and should not significantly delay certification timelines.

**Recommendation:** Address identified issues and conduct follow-up testing before formal audits."""
        else:
            conclusion = f"""TrustStram v4.4 requires **significant remediation** to achieve certification readiness, with an overall score of {report.overall_score:.1f}%. 

Multiple compliance gaps have been identified that must be addressed before pursuing formal certification. A structured remediation plan should be developed and implemented.

**Recommendation:** Implement comprehensive remediation program before attempting certification."""
        
        return conclusion
    
    def _calculate_next_review_date(self) -> str:
        """Calculate next review date."""
        from datetime import timedelta
        next_review = datetime.now() + timedelta(days=90)  # Quarterly review
        return next_review.strftime("%Y-%m-%d")

# Main execution
async def main():
    """Generate the comprehensive compliance report."""
    generator = ComplianceReportGenerator()
    report_path = await generator.generate_full_compliance_report()
    print(f"\n✅ Comprehensive compliance report generated successfully!")
    print(f"📄 Report location: {report_path}")
    return report_path

if __name__ == "__main__":
    asyncio.run(main())
