/**
 * AI Leader Quality Agent - Utility Functions
 * 
 * Helper functions and utilities for the Quality Agent following
 * the orchestration-first architecture patterns.
 */

import { 
  QualityMetrics,
  QualityScore,
  QualityThresholds,
  QualityIssue,
  QualityContext,
  TrendAnalysis,
  QualityDeviation
} from './interfaces';

/**
 * Calculate overall quality score from individual metrics
 */
export function calculateQualityScore(metrics: QualityMetrics): number {
  try {
    // Validate input
    if (!metrics || typeof metrics !== 'object') {
      console.warn('Invalid metrics provided to calculateQualityScore, using default');
      return 0.75; // Default score
    }

    // Weighted average of quality metrics
    const weights = {
      accuracy: 0.25,      // Highest weight for accuracy
      relevance: 0.20,     // High weight for relevance
      completeness: 0.18,  // Important for comprehensive responses
      clarity: 0.15,       // Important for user understanding
      consistency: 0.12,   // Consistency with standards
      timeliness: 0.10     // Speed of response
    };

    // Safely extract metrics with fallbacks
    const safeMetrics = {
      accuracy: (typeof metrics.accuracy === 'number' && !isNaN(metrics.accuracy)) ? metrics.accuracy : 0.75,
      relevance: (typeof metrics.relevance === 'number' && !isNaN(metrics.relevance)) ? metrics.relevance : 0.75,
      completeness: (typeof metrics.completeness === 'number' && !isNaN(metrics.completeness)) ? metrics.completeness : 0.75,
      clarity: (typeof metrics.clarity === 'number' && !isNaN(metrics.clarity)) ? metrics.clarity : 0.75,
      consistency: (typeof metrics.consistency === 'number' && !isNaN(metrics.consistency)) ? metrics.consistency : 0.75,
      timeliness: (typeof metrics.timeliness === 'number' && !isNaN(metrics.timeliness)) ? metrics.timeliness : 0.75
    };

    const weightedScore = 
      safeMetrics.accuracy * weights.accuracy +
      safeMetrics.relevance * weights.relevance +
      safeMetrics.completeness * weights.completeness +
      safeMetrics.clarity * weights.clarity +
      safeMetrics.consistency * weights.consistency +
      safeMetrics.timeliness * weights.timeliness;

    // Ensure score is between 0 and 1
    const finalScore = Math.max(0, Math.min(1, weightedScore));
    
    if (isNaN(finalScore)) {
      console.warn('Calculated quality score is NaN, returning default');
      return 0.75;
    }
    
    return finalScore;
  } catch (error) {
    console.error('Error calculating quality score:', error);
    return 0.75; // Default score on error
  }
}

/**
 * Identify quality issues based on score and thresholds
 */
export async function identifyQualityIssues(
  qualityScore: QualityScore,
  thresholds: QualityThresholds
): Promise<QualityIssue[]> {
  try {
    const issues: QualityIssue[] = [];
    
    // Validate inputs
    if (!qualityScore || typeof qualityScore !== 'object') {
      console.warn('Invalid qualityScore provided to identifyQualityIssues');
      return issues;
    }
    
    if (!thresholds || typeof thresholds !== 'object') {
      console.warn('Invalid thresholds provided to identifyQualityIssues');
      return issues;
    }
    
    const metrics = qualityScore.metrics;
    if (!metrics || typeof metrics !== 'object') {
      console.warn('Invalid metrics in qualityScore');
      return issues;
    }

    // Define default thresholds if not provided
    const defaultThresholds = {
      accuracy: { poor: 0.6, acceptable: 0.75, good: 0.85 },
      relevance: { poor: 0.6, acceptable: 0.75, good: 0.85 },
      completeness: { poor: 0.6, acceptable: 0.75, good: 0.85 },
      clarity: { poor: 0.6, acceptable: 0.75, good: 0.85 },
      consistency: { poor: 0.6, acceptable: 0.75, good: 0.85 },
      timeliness: { poor: 0.6, acceptable: 0.75, good: 0.85 },
      overall: { poor: 0.6, acceptable: 0.75, good: 0.85 }
    };

    // Check each metric against thresholds
    Object.entries(metrics).forEach(([metricName, value]) => {
      try {
        if (typeof value !== 'number' || isNaN(value)) {
          console.warn(`Invalid metric value for ${metricName}:`, value);
          return;
        }

        const threshold = thresholds[metricName as keyof QualityThresholds] || defaultThresholds[metricName];
        if (!threshold || typeof threshold !== 'object') {
          console.warn(`No threshold defined for metric: ${metricName}`);
          return;
        }

        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        let description = '';
        let suggestion = '';

        if (value <= threshold.poor) {
          severity = 'critical';
          description = `${metricName} is critically low (${value.toFixed(2)})`;
          suggestion = `Immediate action required to improve ${metricName}`;
        } else if (value <= threshold.acceptable) {
          severity = 'high';
          description = `${metricName} is below acceptable level (${value.toFixed(2)})`;
          suggestion = `Focus on improving ${metricName} in the next iteration`;
        } else if (value <= threshold.good) {
          severity = 'medium';
          description = `${metricName} could be improved (${value.toFixed(2)})`;
          suggestion = `Consider optimizing ${metricName} when possible`;
        }

        if (severity !== 'low') {
          issues.push({
            issueId: generateIssueId(),
            type: metricName as any,
            severity,
            description,
            location: qualityScore.context?.sourceAgent || 'unknown',
            suggestion,
            impact: calculateImpact(value, threshold, severity)
          });
        }
      } catch (metricError) {
        console.error(`Error processing metric ${metricName}:`, metricError);
      }
    });

    // Check overall score
    try {
      const overallThreshold = thresholds.overall || defaultThresholds.overall;
      const overallScore = qualityScore.overallScore;
      
      if (typeof overallScore === 'number' && !isNaN(overallScore) && overallScore <= overallThreshold.poor) {
        issues.push({
          issueId: generateIssueId(),
          type: 'accuracy', // Default to accuracy for overall issues
          severity: 'critical',
          description: `Overall quality is critically low (${overallScore.toFixed(2)})`,
          location: qualityScore.context?.sourceAgent || 'unknown',
          suggestion: 'Comprehensive quality review and improvement needed',
          impact: 0.9
        });
      }
    } catch (overallError) {
      console.error('Error checking overall score:', overallError);
    }

    return issues;
  } catch (error) {
    console.error('Error identifying quality issues:', error);
    return [];
  }
}

/**
 * Generate quality recommendations based on score analysis
 */
export async function generateQualityRecommendations(
  qualityScore: QualityScore
): Promise<string[]> {
  try {
    const recommendations: string[] = [];
    
    // Validate input
    if (!qualityScore || typeof qualityScore !== 'object') {
      console.warn('Invalid qualityScore provided to generateQualityRecommendations');
      return recommendations;
    }
    
    const metrics = qualityScore.metrics;
    const context = qualityScore.context;
    
    if (!metrics || typeof metrics !== 'object') {
      console.warn('Invalid metrics in qualityScore');
      return recommendations;
    }

    // Accuracy recommendations
    if (typeof metrics.accuracy === 'number' && metrics.accuracy < 0.8) {
      recommendations.push('Implement fact-checking mechanisms and validation processes');
      recommendations.push('Add multiple source verification for factual claims');
      recommendations.push('Implement confidence scoring for uncertain information');
    }

    // Relevance recommendations
    if (typeof metrics.relevance === 'number' && metrics.relevance < 0.8) {
      recommendations.push('Improve context understanding and intent recognition');
      recommendations.push('Implement better user need analysis');
      recommendations.push('Add relevance scoring based on user feedback');
    }

    // Completeness recommendations
    if (typeof metrics.completeness === 'number' && metrics.completeness < 0.8) {
      recommendations.push('Implement comprehensive information gathering processes');
      recommendations.push('Add requirement analysis to ensure all aspects are covered');
      recommendations.push('Create checklists for common request types');
    }

    // Clarity recommendations
    if (typeof metrics.clarity === 'number' && metrics.clarity < 0.8) {
      recommendations.push('Simplify language and improve readability');
      recommendations.push('Add examples and concrete illustrations');
      recommendations.push('Implement structured response formatting');
    }

    // Consistency recommendations
    if (typeof metrics.consistency === 'number' && metrics.consistency < 0.8) {
      recommendations.push('Standardize response formats and terminology');
      recommendations.push('Implement style guides and response templates');
      recommendations.push('Add consistency checking against previous responses');
    }

    // Timeliness recommendations
    if (typeof metrics.timeliness === 'number' && metrics.timeliness < 0.8) {
      recommendations.push('Optimize response generation processes');
      recommendations.push('Implement caching for common requests');
      recommendations.push('Add performance monitoring and optimization');
    }

    // Context-specific recommendations
    if (context && typeof context === 'object') {
      if (context.priority === 'critical' && typeof qualityScore.overallScore === 'number' && qualityScore.overallScore < 0.9) {
        recommendations.push('Implement special handling for critical priority requests');
        recommendations.push('Add additional quality checks for high-priority items');
      }

      if (context.userContext?.userType === 'premium' && typeof qualityScore.overallScore === 'number' && qualityScore.overallScore < 0.85) {
        recommendations.push('Enhance quality standards for premium users');
        recommendations.push('Implement premium user feedback mechanisms');
      }
    }

    return recommendations;
  } catch (error) {
    console.error('Error generating quality recommendations:', error);
    return [];
  }
}

/**
 * Validate quality metrics for correctness
 */
export function validateQualityMetrics(
  metrics: QualityMetrics | QualityThresholds
): boolean {
  try {
    // Check if metrics is valid object
    if (!metrics || typeof metrics !== 'object') {
      console.warn('Invalid metrics object provided to validateQualityMetrics');
      return false;
    }

    // Handle QualityThresholds (nested structure)
    if (typeof metrics.accuracy === 'object') {
      const values = Object.values(metrics).flatMap(m => {
        if (typeof m === 'object' && m !== null) {
          return Object.values(m);
        }
        return [m];
      });
      
      return values.every(value => 
        typeof value === 'number' && 
        value >= 0 && 
        value <= 1 && 
        !isNaN(value)
      );
    }
    
    // Handle QualityMetrics (flat structure)
    const values = Object.values(metrics);
    return values.every(value => 
      typeof value === 'number' && 
      value >= 0 && 
      value <= 1 && 
      !isNaN(value)
    );
  } catch (error) {
    console.error('Error validating quality metrics:', error);
    return false;
  }
}

/**
 * Calculate quality trend analysis
 */
export function calculateQualityTrend(
  scores: QualityScore[],
  metric: keyof QualityMetrics
): TrendAnalysis {
  if (scores.length < 2) {
    return {
      direction: 'stable',
      magnitude: 0,
      confidence: 0,
      timeframe: 0,
      inflectionPoints: []
    };
  }

  const values = scores.map(score => score.metrics[metric]);
  const timePoints = scores.map(score => score.timestamp.getTime());
  
  // Calculate linear regression
  const { slope, confidence } = calculateLinearRegression(
    values.map((value, index) => ({ x: index, y: value }))
  );

  // Determine trend direction
  let direction: 'improving' | 'stable' | 'degrading' = 'stable';
  const threshold = 0.01; // 1% change threshold
  
  if (Math.abs(slope) > threshold) {
    direction = slope > 0 ? 'improving' : 'degrading';
  }

  // Find inflection points
  const inflectionPoints = findInflectionPoints(values, timePoints);

  return {
    direction,
    magnitude: Math.abs(slope),
    confidence,
    timeframe: timePoints[timePoints.length - 1] - timePoints[0],
    inflectionPoints
  };
}

/**
 * Detect quality deviations from normal patterns
 */
export function detectQualityDeviation(
  currentScore: QualityScore,
  historicalScores: QualityScore[],
  deviationThreshold: number = 2.0 // Standard deviations
): QualityDeviation | null {
  if (historicalScores.length < 10) {
    return null; // Need sufficient historical data
  }

  const historicalValues = historicalScores.map(score => score.overallScore);
  const mean = calculateMean(historicalValues);
  const stdDev = calculateStandardDeviation(historicalValues, mean);
  
  const currentValue = currentScore.overallScore;
  const zScore = Math.abs((currentValue - mean) / stdDev);
  
  if (zScore > deviationThreshold) {
    const deviationType = currentValue < mean ? 'sudden-drop' : 'anomaly';
    const severity = determineSeverity(zScore);
    
    return {
      deviationId: generateDeviationId(),
      timestamp: currentScore.timestamp,
      type: deviationType,
      metric: 'overall',
      severity,
      currentValue,
      expectedValue: mean,
      deviation: Math.abs(currentValue - mean),
      duration: 0, // Will be updated as deviation persists
      impact: {
        userExperience: calculateUserExperienceImpact(zScore),
        systemPerformance: calculateSystemPerformanceImpact(zScore),
        businessMetrics: calculateBusinessMetricsImpact(zScore),
        compliance: calculateComplianceImpact(zScore),
        overallRisk: severity
      },
      status: 'active'
    };
  }

  return null;
}

/**
 * Generate quality improvement suggestions
 */
export function generateImprovementSuggestions(
  qualityTrends: Record<string, TrendAnalysis>,
  currentMetrics: QualityMetrics
): string[] {
  const suggestions: string[] = [];

  // Analyze trends for each metric
  Object.entries(qualityTrends).forEach(([metric, trend]) => {
    if (trend.direction === 'degrading' && trend.confidence > 0.7) {
      switch (metric) {
        case 'accuracy':
          suggestions.push('Implement additional fact-checking processes');
          suggestions.push('Add human review for accuracy-critical responses');
          break;
        case 'relevance':
          suggestions.push('Improve context analysis and intent detection');
          suggestions.push('Add user feedback mechanisms for relevance');
          break;
        case 'completeness':
          suggestions.push('Develop comprehensive response checklists');
          suggestions.push('Add follow-up question mechanisms');
          break;
        case 'clarity':
          suggestions.push('Simplify language and improve structure');
          suggestions.push('Add examples and visual aids where appropriate');
          break;
        case 'consistency':
          suggestions.push('Standardize response templates and terminology');
          suggestions.push('Implement style guide enforcement');
          break;
        case 'timeliness':
          suggestions.push('Optimize response generation algorithms');
          suggestions.push('Implement intelligent caching strategies');
          break;
      }
    }
  });

  // Add general suggestions based on overall performance
  const overallScore = calculateQualityScore(currentMetrics);
  if (overallScore < 0.8) {
    suggestions.push('Conduct comprehensive quality audit');
    suggestions.push('Implement quality monitoring dashboard');
    suggestions.push('Establish quality feedback loops with users');
  }

  return suggestions;
}

/**
 * Compare quality metrics against benchmarks
 */
export function compareAgainstBenchmarks(
  metrics: QualityMetrics,
  benchmarks: Record<string, any>
): Record<string, any> {
  const comparisons: Record<string, any> = {};

  Object.entries(metrics).forEach(([metric, value]) => {
    const benchmark = benchmarks[metric];
    if (benchmark) {
      comparisons[metric] = {
        current: value,
        industryAverage: benchmark.industryAverage,
        topQuartile: benchmark.topQuartile,
        bestInClass: benchmark.bestInClass,
        percentileRanking: calculatePercentileRanking(value, benchmark),
        gap: {
          toAverage: benchmark.industryAverage - value,
          toTopQuartile: benchmark.topQuartile - value,
          toBestInClass: benchmark.bestInClass - value
        },
        status: determineStatus(value, benchmark)
      };
    }
  });

  return comparisons;
}

/**
 * Calculate quality consistency score
 */
export function calculateConsistencyScore(
  scores: QualityScore[],
  windowSize: number = 20
): number {
  if (scores.length < 2) return 1;

  const recentScores = scores.slice(-windowSize);
  const values = recentScores.map(score => score.overallScore);
  
  const mean = calculateMean(values);
  const variance = calculateVariance(values, mean);
  
  // Convert variance to consistency score (lower variance = higher consistency)
  // Use exponential decay to map variance to 0-1 scale
  return Math.exp(-variance * 10);
}

/**
 * Format quality score for display
 */
export function formatQualityScore(
  score: number,
  format: 'percentage' | 'decimal' | 'letter' = 'percentage'
): string {
  switch (format) {
    case 'percentage':
      return `${(score * 100).toFixed(1)}%`;
    case 'decimal':
      return score.toFixed(3);
    case 'letter':
      if (score >= 0.9) return 'A+';
      if (score >= 0.85) return 'A';
      if (score >= 0.8) return 'B+';
      if (score >= 0.75) return 'B';
      if (score >= 0.7) return 'C+';
      if (score >= 0.65) return 'C';
      if (score >= 0.6) return 'D';
      return 'F';
    default:
      return score.toString();
  }
}

/**
 * Generate quality report summary
 */
export function generateQualityReportSummary(
  scores: QualityScore[],
  period: { start: Date; end: Date }
): any {
  if (scores.length === 0) {
    return {
      totalAssessments: 0,
      averageQuality: null,
      qualityDistribution: { excellent: 0, good: 0, acceptable: 0, poor: 0 },
      topIssues: [],
      achievements: [],
      keyInsights: ['No data available for the specified period']
    };
  }

  const totalAssessments = scores.length;
  const overallScores = scores.map(score => score.overallScore);
  
  // Calculate average quality metrics
  const averageQuality: QualityMetrics = {
    accuracy: calculateMean(scores.map(s => s.metrics.accuracy)),
    relevance: calculateMean(scores.map(s => s.metrics.relevance)),
    completeness: calculateMean(scores.map(s => s.metrics.completeness)),
    clarity: calculateMean(scores.map(s => s.metrics.clarity)),
    consistency: calculateMean(scores.map(s => s.metrics.consistency)),
    timeliness: calculateMean(scores.map(s => s.metrics.timeliness))
  };

  // Calculate quality distribution
  const distribution = { excellent: 0, good: 0, acceptable: 0, poor: 0 };
  overallScores.forEach(score => {
    if (score >= 0.9) distribution.excellent++;
    else if (score >= 0.8) distribution.good++;
    else if (score >= 0.7) distribution.acceptable++;
    else distribution.poor++;
  });

  // Get top issues
  const allIssues = scores.flatMap(score => score.issues);
  const issueFrequency: Record<string, number> = {};
  allIssues.forEach(issue => {
    issueFrequency[issue.type] = (issueFrequency[issue.type] || 0) + 1;
  });
  
  const topIssues = Object.entries(issueFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count, frequency: count / totalAssessments }));

  // Generate key insights
  const keyInsights: string[] = [];
  const averageOverall = calculateMean(overallScores);
  
  keyInsights.push(`Average quality score: ${formatQualityScore(averageOverall)}`);
  
  if (distribution.excellent / totalAssessments > 0.5) {
    keyInsights.push('Over 50% of responses achieved excellent quality');
  } else if (distribution.poor / totalAssessments > 0.2) {
    keyInsights.push('Quality improvement needed - 20%+ responses below acceptable');
  }
  
  const lowestMetric = Object.entries(averageQuality)
    .sort(([, a], [, b]) => a - b)[0];
  keyInsights.push(`Lowest performing metric: ${lowestMetric[0]} (${formatQualityScore(lowestMetric[1])})`);

  return {
    totalAssessments,
    averageQuality,
    qualityDistribution: distribution,
    topIssues,
    achievements: [], // Would be populated with specific achievements
    keyInsights
  };
}

// Helper functions
function generateIssueId(): string {
  return `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateDeviationId(): string {
  return `deviation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateImpact(
  value: number,
  threshold: any,
  severity: string
): number {
  const gap = threshold.good - value;
  const maxGap = threshold.good - threshold.poor;
  const normalizedGap = Math.max(0, gap / maxGap);
  
  const severityMultiplier = {
    low: 0.2,
    medium: 0.4,
    high: 0.7,
    critical: 1.0
  };
  
  return normalizedGap * (severityMultiplier[severity as keyof typeof severityMultiplier] || 0.5);
}

function calculateLinearRegression(
  points: { x: number; y: number }[]
): { slope: number; confidence: number } {
  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  // Calculate R-squared for confidence
  const meanY = sumY / n;
  const ssRes = points.reduce((sum, p) => {
    const predicted = slope * p.x + (sumY - slope * sumX) / n;
    return sum + Math.pow(p.y - predicted, 2);
  }, 0);
  const ssTot = points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
  const confidence = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
  
  return { slope, confidence };
}

function findInflectionPoints(
  values: number[],
  timePoints: number[]
): Date[] {
  const inflectionPoints: Date[] = [];
  
  for (let i = 1; i < values.length - 1; i++) {
    const prev = values[i - 1];
    const curr = values[i];
    const next = values[i + 1];
    
    // Check for local maxima or minima
    if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
      inflectionPoints.push(new Date(timePoints[i]));
    }
  }
  
  return inflectionPoints;
}

function calculateMean(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
}

function calculateVariance(values: number[], mean?: number): number {
  if (values.length === 0) return 0;
  const avg = mean ?? calculateMean(values);
  return values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
}

function calculateStandardDeviation(values: number[], mean?: number): number {
  return Math.sqrt(calculateVariance(values, mean));
}

function determineSeverity(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (zScore > 3) return 'critical';
  if (zScore > 2.5) return 'high';
  if (zScore > 2) return 'medium';
  return 'low';
}

function calculateUserExperienceImpact(zScore: number): number {
  return Math.min(1, zScore / 3);
}

function calculateSystemPerformanceImpact(zScore: number): number {
  return Math.min(1, zScore / 4);
}

function calculateBusinessMetricsImpact(zScore: number): number {
  return Math.min(1, zScore / 3.5);
}

function calculateComplianceImpact(zScore: number): number {
  return Math.min(1, zScore / 2.5);
}

function calculatePercentileRanking(
  value: number,
  benchmark: any
): number {
  // Simplified percentile calculation
  if (value >= benchmark.bestInClass) return 95;
  if (value >= benchmark.topQuartile) return 75;
  if (value >= benchmark.industryAverage) return 50;
  return 25;
}

function determineStatus(
  value: number,
  benchmark: any
): 'leading' | 'meeting' | 'lagging' | 'poor' {
  if (value >= benchmark.topQuartile) return 'leading';
  if (value >= benchmark.industryAverage) return 'meeting';
  if (value >= benchmark.minimumAcceptable) return 'lagging';
  return 'poor';
}
