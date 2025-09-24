/**
 * Utility functions for AI Leader Innovation Agent
 */

import { 
  InnovationMetrics, 
  InnovationInitiative, 
  ImpactAssessment,
  InnovationCategory,
  Priority,
  InitiativeStatus 
} from './interfaces';

export class InnovationAgentUtils {
  
  /**
   * Calculate innovation score based on various metrics
   */
  calculateInnovationScore(metrics: InnovationMetrics): number {
    const weights = {
      innovationIndex: 0.3,
      transformationProgress: 0.25,
      creativityScore: 0.25,
      disruptionLevel: 0.2
    };

    return (
      metrics.innovationIndex * weights.innovationIndex +
      metrics.transformationProgress * weights.transformationProgress +
      metrics.creativityScore * weights.creativityScore +
      metrics.disruptionLevel * weights.disruptionLevel
    );
  }

  /**
   * Assess impact of innovation initiative
   */
  assessImpact(initiative: InnovationInitiative): ImpactAssessment {
    const categoryMultipliers = {
      [InnovationCategory.STRATEGIC]: 1.5,
      [InnovationCategory.TECHNOLOGY]: 1.3,
      [InnovationCategory.PRODUCT]: 1.2,
      [InnovationCategory.SERVICE]: 1.1,
      [InnovationCategory.PROCESS]: 1.0
    };

    const priorityMultipliers = {
      [Priority.CRITICAL]: 2.0,
      [Priority.HIGH]: 1.5,
      [Priority.MEDIUM]: 1.0,
      [Priority.LOW]: 0.7
    };

    const baseBusiness = 0.5;
    const baseRisk = 0.3;
    const baseResource = 0.4;
    const baseTimeToValue = 6; // months

    const categoryMultiplier = categoryMultipliers[initiative.category];
    const priorityMultiplier = priorityMultipliers[initiative.priority];

    return {
      businessValue: Math.min(baseBusiness * categoryMultiplier * priorityMultiplier, 1.0),
      riskLevel: Math.min(baseRisk * categoryMultiplier, 1.0),
      resourceRequirement: Math.min(baseResource * categoryMultiplier, 1.0),
      timeToValue: Math.max(baseTimeToValue / priorityMultiplier, 1)
    };
  }

  /**
   * Generate unique initiative ID
   */
  generateInitiativeId(category: InnovationCategory, title: string): string {
    const timestamp = Date.now();
    const categoryPrefix = category.substring(0, 3).toUpperCase();
    const titleHash = this.hashString(title);
    return `INNOV-${categoryPrefix}-${timestamp}-${titleHash}`;
  }

  /**
   * Validate innovation initiative
   */
  validateInitiative(initiative: InnovationInitiative): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!initiative.id || initiative.id.trim() === '') {
      errors.push('Initiative ID is required');
    }

    if (!initiative.title || initiative.title.trim() === '') {
      errors.push('Initiative title is required');
    }

    if (!initiative.description || initiative.description.trim() === '') {
      errors.push('Initiative description is required');
    }

    if (!Object.values(InnovationCategory).includes(initiative.category)) {
      errors.push('Invalid innovation category');
    }

    if (!Object.values(Priority).includes(initiative.priority)) {
      errors.push('Invalid priority level');
    }

    if (!Object.values(InitiativeStatus).includes(initiative.status)) {
      errors.push('Invalid initiative status');
    }

    if (initiative.timeline.startDate >= initiative.timeline.endDate) {
      errors.push('End date must be after start date');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate progress percentage for initiative
   */
  calculateProgressPercentage(initiative: InnovationInitiative): number {
    const totalMilestones = initiative.timeline.milestones.length;
    
    if (totalMilestones === 0) {
      // Base progress on status if no milestones
      const statusProgress = {
        [InitiativeStatus.IDEATION]: 10,
        [InitiativeStatus.PLANNING]: 25,
        [InitiativeStatus.DEVELOPMENT]: 50,
        [InitiativeStatus.TESTING]: 75,
        [InitiativeStatus.IMPLEMENTATION]: 90,
        [InitiativeStatus.COMPLETED]: 100
      };
      
      return statusProgress[initiative.status] || 0;
    }

    const completedMilestones = initiative.timeline.milestones.filter(m => m.completed).length;
    return Math.round((completedMilestones / totalMilestones) * 100);
  }

  /**
   * Prioritize initiatives based on impact and urgency
   */
  prioritizeInitiatives(initiatives: InnovationInitiative[]): InnovationInitiative[] {
    return initiatives.sort((a, b) => {
      const aScore = this.calculatePriorityScore(a);
      const bScore = this.calculatePriorityScore(b);
      return bScore - aScore; // Higher score first
    });
  }

  /**
   * Calculate priority score for sorting
   */
  private calculatePriorityScore(initiative: InnovationInitiative): number {
    const priorityScores = {
      [Priority.CRITICAL]: 4,
      [Priority.HIGH]: 3,
      [Priority.MEDIUM]: 2,
      [Priority.LOW]: 1
    };

    const statusScores = {
      [InitiativeStatus.IDEATION]: 1,
      [InitiativeStatus.PLANNING]: 2,
      [InitiativeStatus.DEVELOPMENT]: 3,
      [InitiativeStatus.TESTING]: 4,
      [InitiativeStatus.IMPLEMENTATION]: 5,
      [InitiativeStatus.COMPLETED]: 0 // Completed items get lowest priority
    };

    const priorityScore = priorityScores[initiative.priority] || 1;
    const statusScore = statusScores[initiative.status] || 1;
    const impactScore = initiative.impact.businessValue * 10;

    return priorityScore * 0.4 + statusScore * 0.3 + impactScore * 0.3;
  }

  /**
   * Format metrics for display
   */
  formatMetrics(metrics: InnovationMetrics): string {
    return `Innovation Index: ${(metrics.innovationIndex * 100).toFixed(1)}%\n` +
           `Transformation Progress: ${(metrics.transformationProgress * 100).toFixed(1)}%\n` +
           `Creativity Score: ${(metrics.creativityScore * 100).toFixed(1)}%\n` +
           `Disruption Level: ${(metrics.disruptionLevel * 100).toFixed(1)}%`;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 6);
  }

  /**
   * Log innovation activities
   */
  logActivity(agentId: string, activity: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      agentId,
      activity,
      data: data || {}
    };
    
    console.log(`[${timestamp}] Innovation Agent ${agentId}: ${activity}`, data);
  }
}

export default InnovationAgentUtils;