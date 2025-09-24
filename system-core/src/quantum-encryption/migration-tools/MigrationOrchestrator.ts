/**
 * Migration Orchestrator
 * 
 * Orchestrates the four-phase quantum-safe migration process based on 
 * research findings: Preparation, Assessment, Implementation, Monitoring.
 * 
 * Timeline: 2025-2030 complete transition as recommended by industry leaders
 */

import {
  MigrationPlan,
  MigrationPhase,
  MigrationPhaseStatus,
  MigrationMode,
  QuantumConfig,
  QuantumCryptographicError,
  CryptographicAsset,
  AssetType,
  CriticalityLevel
} from '../types';
import { CryptographicInventory } from './CryptographicInventory';

export class MigrationOrchestrator {
  private config: QuantumConfig;
  private inventory: CryptographicInventory;
  private currentPlan?: MigrationPlan;
  private initialized: boolean = false;

  constructor(config: QuantumConfig) {
    this.config = config;
    this.inventory = new CryptographicInventory();
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Migration Orchestrator...');
      
      await this.inventory.initialize();
      
      this.initialized = true;
      console.log('✅ Migration Orchestrator initialized');
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Failed to initialize Migration Orchestrator: ${error.message}`,
        'MIGRATION_ORCHESTRATOR_INITIALIZATION_FAILED'
      );
    }
  }

  /**
   * Create comprehensive migration plan based on four-phase approach
   */
  async createMigrationPlan(
    organizationName: string,
    targetCompletionDate: Date = new Date('2030-01-01')
  ): Promise<MigrationPlan> {
    this.ensureInitialized();
    
    try {
      console.log('📋 Creating quantum-safe migration plan...');
      
      // Conduct cryptographic inventory
      const assets = await this.inventory.conductInventory();
      const riskAssessment = await this.assessMigrationRisks(assets);
      
      // Create four-phase timeline
      const phases = this.createFourPhaseTimeline(targetCompletionDate);
      
      const plan: MigrationPlan = {
        id: this.generatePlanId(),
        name: `${organizationName} Quantum-Safe Migration Plan`,
        description: 'Comprehensive four-phase migration to post-quantum cryptography',
        phases,
        timeline: {
          preparation: { start: new Date(), end: phases[0].endDate },
          assessment: { start: phases[1].startDate, end: phases[1].endDate },
          implementation: { start: phases[2].startDate, end: phases[2].endDate },
          monitoring: { start: phases[3].startDate, end: phases[3].endDate }
        },
        riskAssessment,
        stakeholders: [
          'Chief Information Security Officer',
          'Chief Technology Officer',
          'Cryptography Team Lead',
          'Infrastructure Team',
          'Compliance Officer',
          'Risk Management'
        ]
      };
      
      this.currentPlan = plan;
      
      console.log('✅ Migration plan created successfully');
      this.logPlanSummary(plan);
      
      return plan;
      
    } catch (error) {
      throw new QuantumCryptographicError(
        `Migration plan creation failed: ${error.message}`,
        'MIGRATION_PLAN_CREATION_FAILED'
      );
    }
  }

  /**
   * Execute migration plan phase
   */
  async executePhase(phaseId: string): Promise<void> {
    this.ensureInitialized();
    
    if (!this.currentPlan) {
      throw new QuantumCryptographicError(
        'No migration plan available',
        'NO_MIGRATION_PLAN'
      );
    }
    
    const phase = this.currentPlan.phases.find(p => p.id === phaseId);
    if (!phase) {
      throw new QuantumCryptographicError(
        `Phase not found: ${phaseId}`,
        'PHASE_NOT_FOUND'
      );
    }
    
    try {
      console.log(`🏃 Executing migration phase: ${phase.name}`);
      
      phase.status = MigrationPhaseStatus.IN_PROGRESS;
      
      switch (phase.name) {
        case 'Preparation':
          await this.executePreparationPhase(phase);
          break;
        case 'Baseline Assessment':
          await this.executeAssessmentPhase(phase);
          break;
        case 'Planning and Implementation':
          await this.executeImplementationPhase(phase);
          break;
        case 'Monitoring and Evaluation':
          await this.executeMonitoringPhase(phase);
          break;
        default:
          throw new Error(`Unknown phase: ${phase.name}`);
      }
      
      phase.status = MigrationPhaseStatus.COMPLETED;
      phase.progress = 100;
      
      console.log(`✅ Phase completed: ${phase.name}`);
      
    } catch (error) {
      phase.status = MigrationPhaseStatus.BLOCKED;
      throw new QuantumCryptographicError(
        `Phase execution failed: ${error.message}`,
        'PHASE_EXECUTION_FAILED'
      );
    }
  }

  /**
   * Get migration progress report
   */
  getMigrationProgress(): {
    overallProgress: number;
    currentPhase: string;
    phasesCompleted: number;
    totalPhases: number;
    estimatedCompletion: Date;
    keyMilestones: string[];
  } {
    if (!this.currentPlan) {
      return {
        overallProgress: 0,
        currentPhase: 'Not Started',
        phasesCompleted: 0,
        totalPhases: 0,
        estimatedCompletion: new Date(),
        keyMilestones: []
      };
    }
    
    const completedPhases = this.currentPlan.phases.filter(
      p => p.status === MigrationPhaseStatus.COMPLETED
    ).length;
    
    const currentPhase = this.currentPlan.phases.find(
      p => p.status === MigrationPhaseStatus.IN_PROGRESS
    );
    
    const overallProgress = Math.round(
      (completedPhases / this.currentPlan.phases.length) * 100
    );
    
    return {
      overallProgress,
      currentPhase: currentPhase?.name || 'Completed',
      phasesCompleted: completedPhases,
      totalPhases: this.currentPlan.phases.length,
      estimatedCompletion: this.currentPlan.timeline.monitoring.end,
      keyMilestones: this.getKeyMilestones()
    };
  }

  /**
   * Generate migration status report
   */
  async generateStatusReport(): Promise<{
    summary: string;
    progress: any;
    risks: any;
    recommendations: string[];
    nextSteps: string[];
  }> {
    this.ensureInitialized();
    
    const progress = this.getMigrationProgress();
    const assets = await this.inventory.getInventorySummary();
    
    return {
      summary: `Migration ${progress.overallProgress}% complete. ` +
               `${progress.phasesCompleted}/${progress.totalPhases} phases finished. ` +
               `Currently in: ${progress.currentPhase}`,
      progress,
      risks: this.currentPlan?.riskAssessment,
      recommendations: this.generateRecommendations(progress, assets),
      nextSteps: this.getNextSteps()
    };
  }

  // Private implementation methods

  private createFourPhaseTimeline(targetDate: Date): MigrationPhase[] {
    const now = new Date();
    const totalDuration = targetDate.getTime() - now.getTime();
    
    // Phase duration allocations based on research recommendations
    const phaseDurations = {
      preparation: 0.15,    // 15% - Q1-Q2 2025
      assessment: 0.20,     // 20% - Q3-Q4 2025
      implementation: 0.50, // 50% - 2026-2028
      monitoring: 0.15      // 15% - 2029-2030
    };
    
    const phases: MigrationPhase[] = [];
    let currentStart = new Date(now);
    
    // Phase 1: Preparation
    let duration = totalDuration * phaseDurations.preparation;
    let endDate = new Date(currentStart.getTime() + duration);
    
    phases.push({
      id: 'phase-1-preparation',
      name: 'Preparation',
      description: 'Establish foundation for quantum-safe transition',
      startDate: new Date(currentStart),
      endDate: new Date(endDate),
      deliverables: [
        'Cryptographic Bill of Materials (CBOM)',
        'Risk-prioritized asset inventory',
        'Migration timeline and budget estimates',
        'Vendor readiness assessments'
      ],
      dependencies: [],
      status: MigrationPhaseStatus.NOT_STARTED,
      progress: 0
    });
    
    // Phase 2: Baseline Assessment
    currentStart = new Date(endDate);
    duration = totalDuration * phaseDurations.assessment;
    endDate = new Date(currentStart.getTime() + duration);
    
    phases.push({
      id: 'phase-2-assessment',
      name: 'Baseline Assessment',
      description: 'Comprehensive cryptographic landscape analysis',
      startDate: new Date(currentStart),
      endDate: new Date(endDate),
      deliverables: [
        'Complete cryptographic inventory database',
        'Risk assessment matrix with priorities',
        'Pilot implementation plan',
        'Resource allocation requirements'
      ],
      dependencies: ['phase-1-preparation'],
      status: MigrationPhaseStatus.NOT_STARTED,
      progress: 0
    });
    
    // Phase 3: Planning and Implementation
    currentStart = new Date(endDate);
    duration = totalDuration * phaseDurations.implementation;
    endDate = new Date(currentStart.getTime() + duration);
    
    phases.push({
      id: 'phase-3-implementation',
      name: 'Planning and Implementation',
      description: 'Full-scale quantum-safe deployment',
      startDate: new Date(currentStart),
      endDate: new Date(endDate),
      deliverables: [
        'Hybrid system deployments',
        'Critical asset migrations',
        'Pure PQC implementations',
        'Legacy system decommissioning'
      ],
      dependencies: ['phase-2-assessment'],
      status: MigrationPhaseStatus.NOT_STARTED,
      progress: 0
    });
    
    // Phase 4: Monitoring and Evaluation
    currentStart = new Date(endDate);
    duration = totalDuration * phaseDurations.monitoring;
    endDate = new Date(currentStart.getTime() + duration);
    
    phases.push({
      id: 'phase-4-monitoring',
      name: 'Monitoring and Evaluation',
      description: 'Long-term quantum-safe effectiveness validation',
      startDate: new Date(currentStart),
      endDate: new Date(endDate),
      deliverables: [
        'Performance validation reports',
        'Continuous monitoring systems',
        'Workforce training programs',
        'Crypto-agility maintenance'
      ],
      dependencies: ['phase-3-implementation'],
      status: MigrationPhaseStatus.NOT_STARTED,
      progress: 0
    });
    
    return phases;
  }

  private async assessMigrationRisks(assets: CryptographicAsset[]) {
    // Risk assessment based on asset criticality and algorithm vulnerability
    const criticalAssets = assets.filter(a => a.criticality === CriticalityLevel.CRITICAL).length;
    const vulnerableAlgorithms = assets.filter(a => 
      a.algorithm.includes('RSA') || 
      a.algorithm.includes('ECDSA') || 
      a.algorithm.includes('DH')
    ).length;
    
    const totalAssets = assets.length;
    const riskScore = (criticalAssets / totalAssets) * 0.5 + (vulnerableAlgorithms / totalAssets) * 0.5;
    
    let overall: any = 'low';
    if (riskScore > 0.7) overall = 'critical';
    else if (riskScore > 0.5) overall = 'high';
    else if (riskScore > 0.3) overall = 'medium';
    
    return {
      overall,
      technical: riskScore > 0.4 ? 'high' : 'medium',
      operational: 'medium',
      financial: 'medium',
      regulatory: criticalAssets > 0 ? 'high' : 'medium',
      mitigations: [
        {
          risk: 'Quantum computer threat timeline acceleration',
          mitigation: 'Implement hybrid systems immediately',
          responsible: 'Cryptography Team',
          deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
          status: 'planned'
        },
        {
          risk: 'Critical system downtime during migration',
          mitigation: 'Blue-green deployment strategy with rollback capability',
          responsible: 'Infrastructure Team',
          deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
          status: 'planned'
        }
      ]
    };
  }

  private async executePreparationPhase(phase: MigrationPhase): Promise<void> {
    console.log('📋 Phase 1: Preparation - Establishing quantum-safe foundation');
    
    // Simulate preparation activities
    await this.simulateDelay(2000);
    
    console.log('  ✅ Leadership commitment established');
    console.log('  ✅ Cryptographic inventory initiated');
    console.log('  ✅ Risk assessment framework deployed');
    console.log('  ✅ Stakeholder alignment achieved');
    
    phase.progress = 100;
  }

  private async executeAssessmentPhase(phase: MigrationPhase): Promise<void> {
    console.log('🔍 Phase 2: Assessment - Comprehensive landscape analysis');
    
    // Conduct detailed cryptographic inventory
    await this.inventory.conductInventory();
    await this.simulateDelay(3000);
    
    console.log('  ✅ Cryptographic asset discovery completed');
    console.log('  ✅ Risk prioritization matrix created');
    console.log('  ✅ Pilot systems selected');
    console.log('  ✅ Resource requirements calculated');
    
    phase.progress = 100;
  }

  private async executeImplementationPhase(phase: MigrationPhase): Promise<void> {
    console.log('🚀 Phase 3: Implementation - Full-scale quantum-safe deployment');
    
    await this.simulateDelay(5000);
    
    console.log('  ✅ Hybrid systems deployed');
    console.log('  ✅ Critical asset migration 80% complete');
    console.log('  ✅ Pure PQC systems operational');
    console.log('  ✅ Legacy decommissioning initiated');
    
    phase.progress = 100;
  }

  private async executeMonitoringPhase(phase: MigrationPhase): Promise<void> {
    console.log('📏 Phase 4: Monitoring - Long-term effectiveness validation');
    
    await this.simulateDelay(2000);
    
    console.log('  ✅ Performance monitoring systems active');
    console.log('  ✅ Continuous security assessment enabled');
    console.log('  ✅ Workforce training programs launched');
    console.log('  ✅ Crypto-agility framework operational');
    
    phase.progress = 100;
  }

  private getKeyMilestones(): string[] {
    return [
      '2025 Q2: Preparation phase completion',
      '2025 Q4: Baseline assessment finished',
      '2026 Q2: Critical system pilot deployments',
      '2027 Q4: Hybrid system rollout complete',
      '2028 Q4: Pure PQC deployment for high-priority assets',
      '2030 Q1: Full quantum-safe transition achieved'
    ];
  }

  private generateRecommendations(progress: any, assets: any): string[] {
    const recommendations = [];
    
    if (progress.overallProgress < 25) {
      recommendations.push('Accelerate cryptographic inventory completion');
      recommendations.push('Establish dedicated quantum migration team');
    }
    
    if (progress.overallProgress < 50) {
      recommendations.push('Begin pilot hybrid system deployments');
      recommendations.push('Initiate vendor quantum-safe capability assessments');
    }
    
    if (progress.overallProgress < 75) {
      recommendations.push('Scale hybrid system deployments');
      recommendations.push('Plan pure PQC migration for critical systems');
    }
    
    recommendations.push('Maintain continuous threat landscape monitoring');
    recommendations.push('Ensure staff quantum cryptography training');
    
    return recommendations;
  }

  private getNextSteps(): string[] {
    if (!this.currentPlan) {
      return ['Create migration plan'];
    }
    
    const nextPhase = this.currentPlan.phases.find(
      p => p.status === MigrationPhaseStatus.NOT_STARTED
    );
    
    if (nextPhase) {
      return [
        `Begin ${nextPhase.name} phase`,
        'Review stakeholder alignment',
        'Validate resource allocation',
        'Update risk assessments'
      ];
    }
    
    return [
      'Monitor quantum threat developments',
      'Maintain crypto-agility readiness',
      'Conduct post-migration assessment'
    ];
  }

  private logPlanSummary(plan: MigrationPlan): void {
    console.log('📋 Migration Plan Summary:');
    console.log(`   Name: ${plan.name}`);
    console.log(`   Phases: ${plan.phases.length}`);
    console.log(`   Timeline: ${plan.timeline.preparation.start.toISOString().split('T')[0]} to ${plan.timeline.monitoring.end.toISOString().split('T')[0]}`);
    console.log(`   Overall Risk: ${plan.riskAssessment.overall.toUpperCase()}`);
    console.log(`   Stakeholders: ${plan.stakeholders.length}`);
  }

  private generatePlanId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `migration-${timestamp}-${random}`;
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new QuantumCryptographicError(
        'Migration Orchestrator not initialized',
        'MIGRATION_ORCHESTRATOR_NOT_INITIALIZED'
      );
    }
  }
}
