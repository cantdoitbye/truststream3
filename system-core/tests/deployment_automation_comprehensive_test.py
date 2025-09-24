#!/usr/bin/env python3
"""
TrustStream v4.2 Deployment & Automation Comprehensive Testing Suite
Focus: CI/CD, Blue-Green Deployment, Infrastructure Automation

This suite provides comprehensive testing for:
1. Blue-green deployment strategy
2. Rollback procedures
3. CI/CD pipelines (Azure DevOps, GitHub Actions)
4. Infrastructure automation scripts
5. Monitoring and alerting systems
6. Container orchestration (Kubernetes)
7. Deployment verification

Author: MiniMax Agent
Created: 2025-09-21
"""

import json
import time
import requests
import subprocess
import os
import yaml
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import glob

@dataclass
class DeploymentTestResult:
    test_name: str
    category: str
    status: str  # 'passed', 'failed', 'warning'
    execution_time: float
    details: Dict[str, Any]
    error_message: Optional[str] = None

class DeploymentAutomationTestSuite:
    def __init__(self):
        self.test_results: List[DeploymentTestResult] = []
        self.deployment_configs = {
            'kubernetes': {
                'manifests': '/workspace/k8s',
                'deployment_files': ['deployment-blue.yaml', 'deployment-green.yaml', 'services.yaml'],
                'config_files': ['configmaps-secrets.yaml', 'hpa.yaml', 'network-policies.yaml']
            },
            'docker': {
                'dockerfiles': ['/workspace/Dockerfile', '/workspace/docker/Dockerfile.app', '/workspace/docker/Dockerfile.nginx'],
                'compose_files': ['/workspace/deployment/docker-compose/docker-compose.prod.yml']
            },
            'azure': {
                'pipeline_files': ['/workspace/azure-pipelines.yml'],
                'infrastructure': ['/workspace/infrastructure/azure-infrastructure.json'],
                'deployment_scripts': ['/workspace/scripts/azure-deploy.sh']
            },
            'automation_scripts': {
                'deployment': ['/workspace/scripts/deploy.sh', '/workspace/deployment/scripts/deploy.sh'],
                'validation': ['/workspace/scripts/validate-deployment.sh', '/workspace/scripts/verify-deployment.sh'],
                'rollback': ['/workspace/scripts/rollback-deployment.sh']
            }
        }

    def run_comprehensive_deployment_tests(self) -> Dict[str, Any]:
        """Execute comprehensive deployment testing"""
        print("🚀 Starting Comprehensive Deployment & Automation Testing Suite")
        start_time = time.time()
        
        results = {
            'test_summary': {
                'start_time': datetime.now().isoformat(),
                'test_focus': 'Deployment Strategy, CI/CD, and Infrastructure Automation'
            },
            'test_phases': {}
        }
        
        # Phase 1: Kubernetes Configuration Analysis
        print("📋 Phase 1: Kubernetes Configuration Analysis")
        k8s_analysis = self._analyze_kubernetes_configs()
        results['test_phases']['kubernetes_analysis'] = k8s_analysis
        
        # Phase 2: Docker Configuration Testing
        print("📋 Phase 2: Docker Configuration Testing")
        docker_testing = self._test_docker_configurations()
        results['test_phases']['docker_testing'] = docker_testing
        
        # Phase 3: CI/CD Pipeline Analysis
        print("📋 Phase 3: CI/CD Pipeline Analysis")
        cicd_analysis = self._analyze_cicd_pipelines()
        results['test_phases']['cicd_analysis'] = cicd_analysis
        
        # Phase 4: Blue-Green Deployment Testing
        print("📋 Phase 4: Blue-Green Deployment Strategy Testing")
        blue_green_testing = self._test_blue_green_deployment()
        results['test_phases']['blue_green_testing'] = blue_green_testing
        
        # Phase 5: Automation Scripts Testing
        print("📋 Phase 5: Automation Scripts Testing")
        automation_testing = self._test_automation_scripts()
        results['test_phases']['automation_testing'] = automation_testing
        
        # Phase 6: Infrastructure Validation
        print("📋 Phase 6: Infrastructure Validation")
        infrastructure_validation = self._validate_infrastructure_configs()
        results['test_phases']['infrastructure_validation'] = infrastructure_validation
        
        # Phase 7: Monitoring and Alerting
        print("📋 Phase 7: Monitoring and Alerting Systems")
        monitoring_testing = self._test_monitoring_systems()
        results['test_phases']['monitoring_testing'] = monitoring_testing
        
        # Generate comprehensive report
        total_time = time.time() - start_time
        results['test_summary'].update({
            'total_execution_time': total_time,
            'end_time': datetime.now().isoformat(),
            'overall_results': self._generate_summary_metrics()
        })
        
        print(f"✅ Deployment testing completed in {total_time:.2f} seconds")
        return results

    def _analyze_kubernetes_configs(self) -> Dict[str, Any]:
        """Analyze Kubernetes configurations"""
        results = {
            'manifests_analyzed': 0,
            'configuration_analysis': [],
            'deployment_strategy': {},
            'security_analysis': {},
            'validation_issues': []
        }
        
        k8s_path = self.deployment_configs['kubernetes']['manifests']
        if not os.path.exists(k8s_path):
            results['validation_issues'].append('Kubernetes manifests directory not found')
            return results
        
        # Analyze all YAML files in k8s directory
        yaml_files = glob.glob(os.path.join(k8s_path, '*.yaml'))
        yaml_files.extend(glob.glob(os.path.join(k8s_path, '*.yml')))
        
        for yaml_file in yaml_files:
            print(f"  Analyzing {os.path.basename(yaml_file)}...")
            
            try:
                with open(yaml_file, 'r') as f:
                    content = f.read()
                
                # Parse YAML content
                try:
                    yaml_docs = list(yaml.safe_load_all(content))
                except yaml.YAMLError as e:
                    results['validation_issues'].append({
                        'file': os.path.basename(yaml_file),
                        'issue': f'YAML parsing error: {str(e)}'
                    })
                    continue
                
                analysis = {
                    'file': os.path.basename(yaml_file),
                    'size_bytes': len(content),
                    'document_count': len(yaml_docs),
                    'resource_types': [],
                    'deployment_strategy_indicators': {},
                    'security_features': {},
                    'resource_limits': {},
                    'has_blue_green_config': False
                }
                
                for doc in yaml_docs:
                    if doc and isinstance(doc, dict):
                        kind = doc.get('kind', 'Unknown')
                        analysis['resource_types'].append(kind)
                        
                        # Check for blue-green deployment indicators
                        if kind == 'Deployment':
                            metadata = doc.get('metadata', {})
                            name = metadata.get('name', '')
                            if 'blue' in name.lower() or 'green' in name.lower():
                                analysis['has_blue_green_config'] = True
                                analysis['deployment_strategy_indicators'][name] = 'blue-green'
                        
                        # Check for security features
                        spec = doc.get('spec', {})
                        if 'securityContext' in str(doc):
                            analysis['security_features']['securityContext'] = True
                        if 'networkPolicy' in kind.lower():
                            analysis['security_features']['networkPolicies'] = True
                        
                        # Check for resource limits
                        if 'resources' in str(doc):
                            analysis['resource_limits']['defined'] = True
                        
                        # Check for HPA (Horizontal Pod Autoscaler)
                        if kind == 'HorizontalPodAutoscaler':
                            analysis['deployment_strategy_indicators']['autoscaling'] = True
                
                results['configuration_analysis'].append(analysis)
                results['manifests_analyzed'] += 1
                
            except Exception as e:
                results['validation_issues'].append({
                    'file': os.path.basename(yaml_file),
                    'issue': f'Analysis failed: {str(e)}'
                })
        
        # Analyze overall deployment strategy
        blue_green_configs = sum(1 for analysis in results['configuration_analysis'] 
                               if analysis.get('has_blue_green_config', False))
        results['deployment_strategy'] = {
            'blue_green_ready': blue_green_configs >= 2,  # Need at least blue and green deployments
            'autoscaling_configured': any(analysis.get('deployment_strategy_indicators', {}).get('autoscaling') 
                                        for analysis in results['configuration_analysis']),
            'network_policies_present': any(analysis.get('security_features', {}).get('networkPolicies') 
                                          for analysis in results['configuration_analysis'])
        }
        
        return results

    def _test_docker_configurations(self) -> Dict[str, Any]:
        """Test Docker configurations and multi-stage builds"""
        results = {
            'dockerfiles_analyzed': 0,
            'dockerfile_analysis': [],
            'build_optimization': {},
            'security_analysis': {},
            'docker_issues': []
        }
        
        dockerfiles = [
            '/workspace/Dockerfile',
            '/workspace/docker/Dockerfile.app',
            '/workspace/docker/Dockerfile.nginx',
            '/workspace/docker/Dockerfile.worker'
        ]
        
        for dockerfile_path in dockerfiles:
            if not os.path.exists(dockerfile_path):
                continue
                
            print(f"  Analyzing {os.path.basename(dockerfile_path)}...")
            
            try:
                with open(dockerfile_path, 'r') as f:
                    content = f.read()
                
                analysis = {
                    'file': os.path.basename(dockerfile_path),
                    'size_bytes': len(content),
                    'line_count': len(content.splitlines()),
                    'multi_stage_build': False,
                    'base_images': [],
                    'security_features': {},
                    'optimization_features': {},
                    'build_practices': {}
                }
                
                lines = content.splitlines()
                
                # Count FROM statements (indicates multi-stage)
                from_statements = [line for line in lines if line.strip().upper().startswith('FROM')]
                analysis['multi_stage_build'] = len(from_statements) > 1
                analysis['base_images'] = [line.split()[1] for line in from_statements if len(line.split()) > 1]
                
                # Security analysis
                content_upper = content.upper()
                analysis['security_features'] = {
                    'non_root_user': 'USER ' in content_upper and 'USER ROOT' not in content_upper,
                    'no_sudo': 'SUDO' not in content_upper,
                    'minimal_packages': any(keyword in content_upper for keyword in ['ALPINE', 'SLIM', 'MINIMAL']),
                    'package_cleanup': any(keyword in content_upper for keyword in ['RM -RF', 'CLEAN', 'AUTOREMOVE'])
                }
                
                # Build optimization analysis
                analysis['optimization_features'] = {
                    'layer_caching': '.dockerignore' in content or 'COPY' in content_upper,
                    'multi_stage': analysis['multi_stage_build'],
                    'build_args': 'ARG ' in content_upper,
                    'health_check': 'HEALTHCHECK' in content_upper
                }
                
                # Best practices
                analysis['build_practices'] = {
                    'workdir_set': 'WORKDIR' in content_upper,
                    'expose_ports': 'EXPOSE' in content_upper,
                    'entrypoint_defined': 'ENTRYPOINT' in content_upper or 'CMD' in content_upper,
                    'labels_used': 'LABEL' in content_upper
                }
                
                results['dockerfile_analysis'].append(analysis)
                results['dockerfiles_analyzed'] += 1
                
            except Exception as e:
                results['docker_issues'].append({
                    'file': os.path.basename(dockerfile_path),
                    'issue': str(e)
                })
        
        # Calculate overall scores
        if results['dockerfile_analysis']:
            total_files = len(results['dockerfile_analysis'])
            
            results['build_optimization'] = {
                'multi_stage_usage': sum(1 for a in results['dockerfile_analysis'] if a['multi_stage_build']) / total_files,
                'security_score': sum(
                    sum(a['security_features'].values()) for a in results['dockerfile_analysis']
                ) / (total_files * 4),  # 4 security features checked
                'optimization_score': sum(
                    sum(a['optimization_features'].values()) for a in results['dockerfile_analysis']
                ) / (total_files * 4)  # 4 optimization features checked
            }
        
        return results

    def _analyze_cicd_pipelines(self) -> Dict[str, Any]:
        """Analyze CI/CD pipeline configurations"""
        results = {
            'pipelines_analyzed': 0,
            'pipeline_analysis': [],
            'automation_coverage': {},
            'pipeline_issues': []
        }
        
        # Azure Pipelines
        azure_pipeline = '/workspace/azure-pipelines.yml'
        if os.path.exists(azure_pipeline):
            print(f"  Analyzing Azure pipeline...")
            
            try:
                with open(azure_pipeline, 'r') as f:
                    content = f.read()
                
                pipeline_analysis = {
                    'type': 'Azure DevOps',
                    'file': 'azure-pipelines.yml',
                    'size_bytes': len(content),
                    'stages': [],
                    'triggers': {},
                    'testing_stages': False,
                    'deployment_stages': False,
                    'security_scanning': False
                }
                
                # Parse YAML content
                try:
                    pipeline_config = yaml.safe_load(content)
                    
                    # Analyze stages
                    if 'stages' in pipeline_config:
                        stages = pipeline_config['stages']
                        pipeline_analysis['stages'] = [stage.get('stage', 'unnamed') for stage in stages]
                        
                        stage_names = str(stages).lower()
                        pipeline_analysis['testing_stages'] = any(keyword in stage_names for keyword in ['test', 'qa', 'quality'])
                        pipeline_analysis['deployment_stages'] = any(keyword in stage_names for keyword in ['deploy', 'release', 'production'])
                        pipeline_analysis['security_scanning'] = any(keyword in stage_names for keyword in ['security', 'scan', 'vulnerability'])
                    
                    # Analyze triggers
                    if 'trigger' in pipeline_config:
                        pipeline_analysis['triggers']['push'] = True
                    if 'pr' in pipeline_config:
                        pipeline_analysis['triggers']['pull_request'] = True
                    
                except yaml.YAMLError as e:
                    pipeline_analysis['parse_error'] = str(e)
                
                results['pipeline_analysis'].append(pipeline_analysis)
                results['pipelines_analyzed'] += 1
                
            except Exception as e:
                results['pipeline_issues'].append({
                    'file': 'azure-pipelines.yml',
                    'issue': str(e)
                })
        
        # Check for GitHub Actions
        github_actions_path = '/workspace/.github/workflows'
        if os.path.exists(github_actions_path):
            workflow_files = glob.glob(os.path.join(github_actions_path, '*.yml'))
            workflow_files.extend(glob.glob(os.path.join(github_actions_path, '*.yaml')))
            
            for workflow_file in workflow_files:
                print(f"  Analyzing GitHub Actions workflow: {os.path.basename(workflow_file)}")
                
                try:
                    with open(workflow_file, 'r') as f:
                        content = f.read()
                    
                    workflow_analysis = {
                        'type': 'GitHub Actions',
                        'file': os.path.basename(workflow_file),
                        'size_bytes': len(content),
                        'jobs': [],
                        'triggers': {},
                        'matrix_builds': False,
                        'caching_used': False
                    }
                    
                    try:
                        workflow_config = yaml.safe_load(content)
                        
                        # Analyze jobs
                        if 'jobs' in workflow_config:
                            workflow_analysis['jobs'] = list(workflow_config['jobs'].keys())
                        
                        # Analyze triggers
                        if 'on' in workflow_config:
                            triggers = workflow_config['on']
                            if isinstance(triggers, dict):
                                workflow_analysis['triggers'] = list(triggers.keys())
                            elif isinstance(triggers, list):
                                workflow_analysis['triggers'] = triggers
                        
                        # Check for advanced features
                        content_str = str(workflow_config).lower()
                        workflow_analysis['matrix_builds'] = 'matrix' in content_str
                        workflow_analysis['caching_used'] = 'cache' in content_str
                        
                    except yaml.YAMLError as e:
                        workflow_analysis['parse_error'] = str(e)
                    
                    results['pipeline_analysis'].append(workflow_analysis)
                    results['pipelines_analyzed'] += 1
                    
                except Exception as e:
                    results['pipeline_issues'].append({
                        'file': os.path.basename(workflow_file),
                        'issue': str(e)
                    })
        
        # Calculate automation coverage
        if results['pipeline_analysis']:
            has_testing = any(p.get('testing_stages', False) for p in results['pipeline_analysis'])
            has_deployment = any(p.get('deployment_stages', False) for p in results['pipeline_analysis'])
            has_security = any(p.get('security_scanning', False) for p in results['pipeline_analysis'])
            
            results['automation_coverage'] = {
                'testing_automated': has_testing,
                'deployment_automated': has_deployment,
                'security_scanning_automated': has_security,
                'overall_coverage_score': sum([has_testing, has_deployment, has_security]) / 3
            }
        
        return results

    def _test_blue_green_deployment(self) -> Dict[str, Any]:
        """Test blue-green deployment strategy"""
        results = {
            'blue_green_readiness': False,
            'deployment_configs': [],
            'service_configs': [],
            'traffic_management': {},
            'rollback_capability': {},
            'configuration_issues': []
        }
        
        k8s_path = '/workspace/k8s'
        if not os.path.exists(k8s_path):
            results['configuration_issues'].append('Kubernetes directory not found')
            return results
        
        # Look for blue and green deployment configurations
        deployment_files = ['deployment-blue.yaml', 'deployment-green.yaml']
        
        for deployment_file in deployment_files:
            file_path = os.path.join(k8s_path, deployment_file)
            
            if os.path.exists(file_path):
                print(f"  Analyzing {deployment_file}...")
                
                try:
                    with open(file_path, 'r') as f:
                        content = f.read()
                    
                    try:
                        deployment_config = yaml.safe_load(content)
                        
                        config_analysis = {
                            'file': deployment_file,
                            'environment': 'blue' if 'blue' in deployment_file else 'green',
                            'valid_yaml': True,
                            'has_deployment': False,
                            'replica_count': 0,
                            'labels': {},
                            'strategy': {}
                        }
                        
                        if deployment_config and deployment_config.get('kind') == 'Deployment':
                            config_analysis['has_deployment'] = True
                            
                            spec = deployment_config.get('spec', {})
                            config_analysis['replica_count'] = spec.get('replicas', 0)
                            
                            # Check labels for environment identification
                            metadata = deployment_config.get('metadata', {})
                            config_analysis['labels'] = metadata.get('labels', {})
                            
                            # Check deployment strategy
                            strategy = spec.get('strategy', {})
                            config_analysis['strategy'] = {
                                'type': strategy.get('type', 'RollingUpdate'),
                                'has_strategy_config': len(strategy) > 0
                            }
                        
                        results['deployment_configs'].append(config_analysis)
                        
                    except yaml.YAMLError as e:
                        results['configuration_issues'].append({
                            'file': deployment_file,
                            'issue': f'YAML parsing error: {str(e)}'
                        })
                        
                except Exception as e:
                    results['configuration_issues'].append({
                        'file': deployment_file,
                        'issue': f'File reading error: {str(e)}'
                    })
        
        # Check for service configuration
        services_file = os.path.join(k8s_path, 'services.yaml')
        if os.path.exists(services_file):
            print(f"  Analyzing services configuration...")
            
            try:
                with open(services_file, 'r') as f:
                    content = f.read()
                
                try:
                    services_docs = list(yaml.safe_load_all(content))
                    
                    for doc in services_docs:
                        if doc and doc.get('kind') == 'Service':
                            service_analysis = {
                                'name': doc.get('metadata', {}).get('name', 'unnamed'),
                                'type': doc.get('spec', {}).get('type', 'ClusterIP'),
                                'selector': doc.get('spec', {}).get('selector', {}),
                                'ports': len(doc.get('spec', {}).get('ports', []))
                            }
                            results['service_configs'].append(service_analysis)
                    
                except yaml.YAMLError as e:
                    results['configuration_issues'].append({
                        'file': 'services.yaml',
                        'issue': f'YAML parsing error: {str(e)}'
                    })
                    
            except Exception as e:
                results['configuration_issues'].append({
                    'file': 'services.yaml',
                    'issue': f'File reading error: {str(e)}'
                })
        
        # Evaluate blue-green readiness
        blue_configs = [c for c in results['deployment_configs'] if c['environment'] == 'blue']
        green_configs = [c for c in results['deployment_configs'] if c['environment'] == 'green']
        
        results['blue_green_readiness'] = (
            len(blue_configs) > 0 and 
            len(green_configs) > 0 and
            len(results['service_configs']) > 0
        )
        
        # Traffic management analysis
        results['traffic_management'] = {
            'service_selectors_configured': len(results['service_configs']) > 0,
            'label_based_routing': any(
                len(config.get('labels', {})) > 0 for config in results['deployment_configs']
            ),
            'ingress_configured': False  # Would need to check for ingress configurations
        }
        
        # Rollback capability
        results['rollback_capability'] = {
            'multiple_environments': results['blue_green_readiness'],
            'deployment_strategy_configured': any(
                config.get('strategy', {}).get('has_strategy_config', False) 
                for config in results['deployment_configs']
            ),
            'rollback_scripts_present': os.path.exists('/workspace/scripts/rollback-deployment.sh')
        }
        
        return results

    def _test_automation_scripts(self) -> Dict[str, Any]:
        """Test automation scripts"""
        results = {
            'scripts_analyzed': 0,
            'script_analysis': [],
            'automation_coverage': {},
            'script_issues': []
        }
        
        script_categories = {
            'deployment': ['/workspace/scripts/deploy.sh', '/workspace/deployment/scripts/deploy.sh'],
            'validation': ['/workspace/scripts/validate-deployment.sh', '/workspace/scripts/verify-deployment.sh'],
            'rollback': ['/workspace/scripts/rollback-deployment.sh'],
            'setup': ['/workspace/scripts/setup-environment.sh'],
            'health_check': ['/workspace/scripts/health-check.sh']
        }
        
        for category, script_paths in script_categories.items():
            for script_path in script_paths:
                if os.path.exists(script_path):
                    print(f"  Analyzing {category} script: {os.path.basename(script_path)}")
                    
                    try:
                        with open(script_path, 'r') as f:
                            content = f.read()
                        
                        analysis = {
                            'script': os.path.basename(script_path),
                            'category': category,
                            'size_bytes': len(content),
                            'line_count': len(content.splitlines()),
                            'executable': os.access(script_path, os.X_OK),
                            'has_error_handling': False,
                            'has_logging': False,
                            'has_validation': False,
                            'uses_environment_vars': False,
                            'has_help_text': False
                        }
                        
                        content_lower = content.lower()
                        
                        # Analyze script features
                        analysis['has_error_handling'] = any(keyword in content_lower for keyword in 
                                                           ['set -e', 'trap', 'exit 1', 'error', 'fail'])
                        analysis['has_logging'] = any(keyword in content_lower for keyword in 
                                                    ['echo', 'log', 'printf', 'logger'])
                        analysis['has_validation'] = any(keyword in content_lower for keyword in 
                                                       ['if [', 'test', 'validate', 'check'])
                        analysis['uses_environment_vars'] = '$' in content and any(keyword in content for keyword in 
                                                                                 ['$HOME', '$USER', '$PATH', '${'])
                        analysis['has_help_text'] = any(keyword in content_lower for keyword in 
                                                      ['usage', 'help', '--help', '-h'])
                        
                        # Calculate quality score
                        quality_factors = [
                            analysis['executable'],
                            analysis['has_error_handling'],
                            analysis['has_logging'],
                            analysis['has_validation'],
                            analysis['has_help_text']
                        ]
                        analysis['quality_score'] = (sum(quality_factors) / len(quality_factors)) * 100
                        
                        results['script_analysis'].append(analysis)
                        results['scripts_analyzed'] += 1
                        
                    except Exception as e:
                        results['script_issues'].append({
                            'script': os.path.basename(script_path),
                            'category': category,
                            'issue': str(e)
                        })
        
        # Calculate automation coverage
        categories_with_scripts = set(analysis['category'] for analysis in results['script_analysis'])
        total_categories = len(script_categories)
        
        results['automation_coverage'] = {
            'categories_covered': len(categories_with_scripts),
            'total_categories': total_categories,
            'coverage_percentage': (len(categories_with_scripts) / total_categories) * 100,
            'average_quality_score': sum(analysis['quality_score'] for analysis in results['script_analysis']) 
                                   / len(results['script_analysis']) if results['script_analysis'] else 0
        }
        
        return results

    def _validate_infrastructure_configs(self) -> Dict[str, Any]:
        """Validate infrastructure configurations"""
        results = {
            'infrastructure_analysis': [],
            'validation_results': {},
            'security_assessment': {},
            'compliance_check': {}
        }
        
        # Azure infrastructure
        azure_config = '/workspace/infrastructure/azure-infrastructure.json'
        if os.path.exists(azure_config):
            print(f"  Validating Azure infrastructure configuration...")
            
            try:
                with open(azure_config, 'r') as f:
                    azure_content = f.read()
                
                try:
                    azure_config_data = json.loads(azure_content)
                    
                    analysis = {
                        'type': 'Azure Resource Manager',
                        'file': 'azure-infrastructure.json',
                        'valid_json': True,
                        'resource_count': 0,
                        'resource_types': [],
                        'security_features': {},
                        'best_practices': {}
                    }
                    
                    # Analyze resources
                    if 'resources' in azure_config_data:
                        resources = azure_config_data['resources']
                        analysis['resource_count'] = len(resources)
                        analysis['resource_types'] = list(set(resource.get('type', 'unknown') for resource in resources))
                    
                    # Security analysis
                    config_str = str(azure_config_data).lower()
                    analysis['security_features'] = {
                        'encryption_configured': 'encrypt' in config_str,
                        'access_control': any(keyword in config_str for keyword in ['rbac', 'role', 'permission']),
                        'network_security': any(keyword in config_str for keyword in ['firewall', 'nsg', 'security']),
                        'monitoring_enabled': any(keyword in config_str for keyword in ['monitor', 'log', 'diagnostic'])
                    }
                    
                    # Best practices
                    analysis['best_practices'] = {
                        'tags_used': 'tags' in config_str,
                        'parameters_defined': 'parameters' in azure_config_data,
                        'outputs_defined': 'outputs' in azure_config_data,
                        'variables_used': 'variables' in azure_config_data
                    }
                    
                    results['infrastructure_analysis'].append(analysis)
                    
                except json.JSONDecodeError as e:
                    results['infrastructure_analysis'].append({
                        'type': 'Azure Resource Manager',
                        'file': 'azure-infrastructure.json',
                        'valid_json': False,
                        'parse_error': str(e)
                    })
                    
            except Exception as e:
                results['infrastructure_analysis'].append({
                    'type': 'Azure Resource Manager',
                    'error': str(e)
                })
        
        # Calculate validation scores
        if results['infrastructure_analysis']:
            for analysis in results['infrastructure_analysis']:
                if analysis.get('valid_json', False):
                    security_score = sum(analysis.get('security_features', {}).values()) / 4 * 100
                    best_practices_score = sum(analysis.get('best_practices', {}).values()) / 4 * 100
                    
                    results['validation_results'][analysis['file']] = {
                        'security_score': security_score,
                        'best_practices_score': best_practices_score,
                        'overall_score': (security_score + best_practices_score) / 2
                    }
        
        return results

    def _test_monitoring_systems(self) -> Dict[str, Any]:
        """Test monitoring and alerting configurations"""
        results = {
            'monitoring_configs': [],
            'alerting_setup': {},
            'observability_score': 0,
            'monitoring_issues': []
        }
        
        # Look for monitoring configurations
        monitoring_paths = [
            '/workspace/deployment/config/pipeline-config.yaml',
            '/workspace/k8s/configmaps-secrets.yaml'
        ]
        
        for config_path in monitoring_paths:
            if os.path.exists(config_path):
                print(f"  Analyzing monitoring config: {os.path.basename(config_path)}")
                
                try:
                    with open(config_path, 'r') as f:
                        content = f.read()
                    
                    monitoring_analysis = {
                        'file': os.path.basename(config_path),
                        'has_health_checks': False,
                        'has_metrics': False,
                        'has_logging': False,
                        'has_alerting': False,
                        'observability_features': []
                    }
                    
                    content_lower = content.lower()
                    
                    # Check for monitoring features
                    if any(keyword in content_lower for keyword in ['health', 'readiness', 'liveness']):
                        monitoring_analysis['has_health_checks'] = True
                        monitoring_analysis['observability_features'].append('health_checks')
                    
                    if any(keyword in content_lower for keyword in ['metrics', 'prometheus', 'grafana']):
                        monitoring_analysis['has_metrics'] = True
                        monitoring_analysis['observability_features'].append('metrics')
                    
                    if any(keyword in content_lower for keyword in ['log', 'logging', 'fluentd', 'elasticsearch']):
                        monitoring_analysis['has_logging'] = True
                        monitoring_analysis['observability_features'].append('logging')
                    
                    if any(keyword in content_lower for keyword in ['alert', 'notification', 'webhook']):
                        monitoring_analysis['has_alerting'] = True
                        monitoring_analysis['observability_features'].append('alerting')
                    
                    results['monitoring_configs'].append(monitoring_analysis)
                    
                except Exception as e:
                    results['monitoring_issues'].append({
                        'file': os.path.basename(config_path),
                        'issue': str(e)
                    })
        
        # Calculate observability score
        if results['monitoring_configs']:
            total_features = 0
            present_features = 0
            
            for config in results['monitoring_configs']:
                features = ['has_health_checks', 'has_metrics', 'has_logging', 'has_alerting']
                total_features += len(features)
                present_features += sum(config.get(feature, False) for feature in features)
            
            results['observability_score'] = (present_features / total_features) * 100 if total_features > 0 else 0
        
        # Alerting setup analysis
        results['alerting_setup'] = {
            'health_monitoring': any(config.get('has_health_checks', False) for config in results['monitoring_configs']),
            'metrics_collection': any(config.get('has_metrics', False) for config in results['monitoring_configs']),
            'log_aggregation': any(config.get('has_logging', False) for config in results['monitoring_configs']),
            'alert_notifications': any(config.get('has_alerting', False) for config in results['monitoring_configs'])
        }
        
        return results

    def _generate_summary_metrics(self) -> Dict[str, Any]:
        """Generate overall summary metrics"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r.status == 'passed'])
        failed_tests = len([r for r in self.test_results if r.status == 'failed'])
        
        return {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'success_rate': (passed_tests / total_tests) * 100 if total_tests > 0 else 0,
            'overall_health': 'good' if passed_tests > failed_tests else 'needs_attention'
        }

def main():
    """Main function to run deployment testing"""
    tester = DeploymentAutomationTestSuite()
    results = tester.run_comprehensive_deployment_tests()
    
    # Save results to file
    results_file = '/workspace/tests/deployment_automation_test_results.json'
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\nDetailed results saved to: {results_file}")
    
    # Print summary
    print("\n" + "="*80)
    print("DEPLOYMENT & AUTOMATION TESTING SUMMARY")
    print("="*80)
    
    for phase, data in results['test_phases'].items():
        print(f"\n📋 {phase.upper().replace('_', ' ')}:")
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, (int, float, bool, str)):
                    print(f"   {key}: {value}")
    
    return results

if __name__ == "__main__":
    main()
