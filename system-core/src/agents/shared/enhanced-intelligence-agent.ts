/**
 * Enhanced Intelligence Agent Base
 * Advanced base class with local LLM integration and enhanced reasoning capabilities
 */

import { EnhancedGovernanceAgent } from './enhanced-base-agent';
import { HybridAIService, HybridAIRequest, HybridAIResponse, createHybridAIService } from '../../abstractions/ai-service/HybridAIService';
import { AgentConfig } from './types';

export interface IntelligenceCapabilities {
  reasoning: {
    causalAnalysis: boolean;
    logicalDeduction: boolean;
    probabilisticReasoning: boolean;
    counterargumentGeneration: boolean;
  };
  learning: {
    patternRecognition: boolean;
    adaptiveDecisionMaking: boolean;
    contextualMemory: boolean;
    feedbackIntegration: boolean;
  };
  creativity: {
    solutionGeneration: boolean;
    alternativeApproaches: boolean;
    innovativeThinking: boolean;
    strategicPlanning: boolean;
  };
  analysis: {
    dataInterpretation: boolean;
    trendAnalysis: boolean;
    riskAssessment: boolean;
    impactEvaluation: boolean;
  };
}

export interface ReasoningContext {
  domain: string;
  complexity: 'low' | 'medium' | 'high';
  stakeholders: string[];
  constraints: string[];
  objectives: string[];
  timeframe: string;
  riskTolerance: 'low' | 'medium' | 'high';
}

export interface IntelligentDecision {
  decision: any;
  reasoning: {
    rationale: string;
    assumptions: string[];
    alternatives: string[];
    riskFactors: string[];
    confidence: number;
    evidenceBase: string[];
  };
  implementation: {
    steps: string[];
    resources: string[];
    timeline: string;
    successMetrics: string[];
    contingencyPlans: string[];
  };
  metadata: {
    reasoningMethod: string;
    intelligenceProvider: 'local' | 'external' | 'hybrid';
    processingTime: number;
    complexity: number;
  };
}

export abstract class EnhancedIntelligenceAgent extends EnhancedGovernanceAgent {
  protected hybridAI?: HybridAIService;
  protected capabilities: IntelligenceCapabilities;
  private aiServiceEnabled: boolean = true;
  
  constructor(config: AgentConfig & { capabilities?: Partial<IntelligenceCapabilities> }) {
    super(config);
    
    // Default capabilities - can be overridden by subclasses
    this.capabilities = {
      reasoning: {
        causalAnalysis: true,
        logicalDeduction: true,
        probabilisticReasoning: true,
        counterargumentGeneration: true
      },
      learning: {
        patternRecognition: true,
        adaptiveDecisionMaking: true,
        contextualMemory: true,
        feedbackIntegration: true
      },
      creativity: {
        solutionGeneration: true,
        alternativeApproaches: true,
        innovativeThinking: true,
        strategicPlanning: true
      },
      analysis: {
        dataInterpretation: true,
        trendAnalysis: true,
        riskAssessment: true,
        impactEvaluation: true
      },
      ...config.capabilities
    };
  }
  
  /**
   * Initialize the enhanced intelligence agent
   */
  public async initialize(): Promise<void> {
    await super.initialize();
    
    // Initialize hybrid AI service
    if (this.aiServiceEnabled) {
      try {
        this.hybridAI = await createHybridAIService({
          preferLocal: true,
          localFallback: true,
          externalFallback: true,
          performanceThresholds: {
            maxLocalLatency: 15000,
            minLocalConfidence: 0.7,
            maxExternalCost: 0.1
          },
          routingRules: {
            sensitiveData: 'local',
            complexTasks: 'both',
            realTimeRequests: 'local'
          }
        });
        this.logger.info('Hybrid AI service initialized successfully');
      } catch (error) {
        this.logger.warn('Failed to initialize hybrid AI service, falling back to external LLM only:', error);
        this.aiServiceEnabled = false;
      }
    }
  }
  
  /**
   * Make an intelligent request with enhanced reasoning
   */
  protected async makeIntelligentRequest(
    prompt: string,
    context: ReasoningContext,
    options: {
      requireLocalProcessing?: boolean;
      maxCost?: number;
      maxLatency?: number;
      reasoningMethod?: 'analytical' | 'creative' | 'strategic' | 'ethical';
      includeAlternatives?: boolean;
      riskAnalysis?: boolean;
    } = {}
  ): Promise<HybridAIResponse> {
    if (!this.hybridAI && !this.llmNexus) {
      throw new Error('No AI service available');
    }
    
    // Enhance prompt with reasoning context
    const enhancedPrompt = this.buildIntelligentPrompt(prompt, context, options);
    
    if (this.hybridAI) {
      const request: HybridAIRequest = {
        prompt: enhancedPrompt,
        context: {
          agentType: this.agentId,
          governanceType: this.getGovernanceType(),
          priority: this.determinePriority(context),
          sessionId: this.generateSessionId(),
          sensitiveData: options.requireLocalProcessing || context.domain.includes('sensitive'),
          realTime: options.maxLatency ? options.maxLatency < 5000 : false,
          complexity: context.complexity
        },
        preferences: {
          preferLocal: options.requireLocalProcessing,
          maxCost: options.maxCost,
          maxLatency: options.maxLatency,
          minConfidence: 0.8,
          requiredCapabilities: this.getRequiredCapabilities(options.reasoningMethod)
        }
      };
      
      return await this.hybridAI.generateResponse(request);
    } else {
      // Fallback to external LLM
      const response = await this.makeLLMRequest(
        enhancedPrompt,
        this.getGovernanceType(),
        {
          priority: this.determinePriority(context),
          maxCost: options.maxCost,
          maxLatency: options.maxLatency || 10000,
          minTrustScore: 0.8,
          requiredCapabilities: this.getRequiredCapabilities(options.reasoningMethod)
        }
      );
      
      return {
        response: response.response,
        provider: 'external',
        model: response.provider,
        executionTimeMs: response.executionTimeMs,
        cost: response.cost,
        confidence: response.trustScore,
        metadata: {
          routingDecision: {
            reason: 'local AI not available, using external fallback',
            factors: { fallback: true }
          }
        }
      };
    }
  }
  
  /**
   * Generate intelligent decision with comprehensive reasoning
   */
  protected async generateIntelligentDecision(
    question: string,
    context: ReasoningContext,
    options: {
      requireConsensus?: boolean;
      includeRiskAnalysis?: boolean;
      generateAlternatives?: boolean;
      strategicPlanning?: boolean;
    } = {}
  ): Promise<IntelligentDecision> {
    const startTime = Date.now();
    
    // Build comprehensive decision prompt
    const decisionPrompt = this.buildDecisionPrompt(question, context, options);
    
    const response = await this.makeIntelligentRequest(
      decisionPrompt,
      context,
      {
        reasoningMethod: 'strategic',
        includeAlternatives: options.generateAlternatives,
        riskAnalysis: options.includeRiskAnalysis,
        maxLatency: 20000 // Allow more time for complex decisions
      }
    );
    
    // Parse and structure the intelligent response
    const decision = this.parseIntelligentResponse(response.response, context);
    
    return {
      ...decision,
      metadata: {
        reasoningMethod: 'enhanced_ai_reasoning',
        intelligenceProvider: response.provider,
        processingTime: Date.now() - startTime,
        complexity: this.calculateComplexityScore(context)
      }
    };
  }
  
  /**
   * Perform deep analysis with multiple reasoning approaches
   */
  protected async performDeepAnalysis(
    subject: any,
    analysisType: 'causal' | 'trend' | 'risk' | 'impact' | 'comparative',
    context: ReasoningContext
  ): Promise<{
    analysis: any;
    insights: string[];
    recommendations: string[];
    confidence: number;
    methodology: string;
  }> {
    const analysisPrompt = this.buildAnalysisPrompt(subject, analysisType, context);
    
    const response = await this.makeIntelligentRequest(
      analysisPrompt,
      context,
      {
        reasoningMethod: 'analytical',
        riskAnalysis: analysisType === 'risk',
        maxLatency: 15000
      }
    );
    
    return this.parseAnalysisResponse(response.response, analysisType);
  }
  
  /**
   * Generate creative solutions with innovative thinking
   */
  protected async generateCreativeSolutions(
    problem: string,
    constraints: string[],
    context: ReasoningContext,
    count: number = 3
  ): Promise<{
    solutions: Array<{
      solution: string;
      feasibility: number;
      innovation: number;
      implementation: string[];
      risks: string[];
    }>;
    emergentInsights: string[];
  }> {
    const creativityPrompt = this.buildCreativityPrompt(problem, constraints, context, count);
    
    const response = await this.makeIntelligentRequest(
      creativityPrompt,
      context,
      {
        reasoningMethod: 'creative',
        includeAlternatives: true,
        maxLatency: 18000
      }
    );
    
    return this.parseCreativeResponse(response.response);
  }
  
  /**
   * Learn from feedback and adapt decision-making
   */
  protected async adaptFromFeedback(
    decision: IntelligentDecision,
    feedback: {
      outcome: 'successful' | 'partial' | 'failed';
      actualResults: any;
      lessons: string[];
      improvements: string[];
    }
  ): Promise<{
    learnings: string[];
    adaptations: string[];
    futurePriorities: string[];
  }> {
    if (!this.capabilities.learning.feedbackIntegration) {
      return {
        learnings: ['Feedback integration not enabled'],
        adaptations: [],
        futurePriorities: []
      };
    }
    
    const learningPrompt = this.buildLearningPrompt(decision, feedback);
    
    const response = await this.makeIntelligentRequest(
      learningPrompt,
      {
        domain: 'learning',
        complexity: 'medium',
        stakeholders: ['agent'],
        constraints: ['maintain consistency', 'improve performance'],
        objectives: ['continuous improvement', 'adaptive learning'],
        timeframe: 'ongoing',
        riskTolerance: 'low'
      },
      {
        reasoningMethod: 'analytical',
        requireLocalProcessing: true // Keep learning data local
      }
    );
    
    return this.parseLearningResponse(response.response);
  }
  
  /**
   * Get AI service health status
   */
  protected async getAIServiceHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    if (this.hybridAI) {
      return await this.hybridAI.getHealthStatus();
    } else {
      const llmHealth = await this.checkLLMNexusHealth();
      return {
        status: llmHealth.status as 'healthy' | 'degraded' | 'unhealthy',
        details: { external: llmHealth.details, local: 'unavailable' }
      };
    }
  }
  
  /**
   * Shutdown the enhanced intelligence agent
   */
  public async shutdown(): Promise<void> {
    if (this.hybridAI) {
      await this.hybridAI.shutdown();
    }
    await super.shutdown();
  }
  
  // Private helper methods
  
  private buildIntelligentPrompt(
    prompt: string,
    context: ReasoningContext,
    options: any
  ): string {
    let enhancedPrompt = `# Intelligent Analysis Request\n\n`;
    enhancedPrompt += `**Context:**\n`;
    enhancedPrompt += `- Domain: ${context.domain}\n`;
    enhancedPrompt += `- Complexity: ${context.complexity}\n`;
    enhancedPrompt += `- Stakeholders: ${context.stakeholders.join(', ')}\n`;
    enhancedPrompt += `- Constraints: ${context.constraints.join(', ')}\n`;
    enhancedPrompt += `- Objectives: ${context.objectives.join(', ')}\n`;
    enhancedPrompt += `- Timeframe: ${context.timeframe}\n`;
    enhancedPrompt += `- Risk Tolerance: ${context.riskTolerance}\n\n`;
    
    enhancedPrompt += `**Request:**\n${prompt}\n\n`;
    
    enhancedPrompt += `**Reasoning Requirements:**\n`;
    if (options.reasoningMethod) {
      enhancedPrompt += `- Use ${options.reasoningMethod} reasoning approach\n`;
    }
    if (options.includeAlternatives) {
      enhancedPrompt += `- Generate multiple alternative approaches\n`;
    }
    if (options.riskAnalysis) {
      enhancedPrompt += `- Include comprehensive risk analysis\n`;
    }
    
    enhancedPrompt += `\nPlease provide a thorough, well-reasoned response that considers all contextual factors.`;
    
    return enhancedPrompt;
  }
  
  private buildDecisionPrompt(
    question: string,
    context: ReasoningContext,
    options: any
  ): string {
    let prompt = `# Strategic Decision Analysis\n\n`;
    prompt += `**Decision Question:** ${question}\n\n`;
    prompt += this.buildContextSection(context);
    
    prompt += `**Required Analysis:**\n`;
    prompt += `1. Provide a clear recommendation with rationale\n`;
    prompt += `2. List key assumptions underlying your reasoning\n`;
    
    if (options.generateAlternatives) {
      prompt += `3. Generate 2-3 alternative approaches\n`;
    }
    if (options.includeRiskAnalysis) {
      prompt += `4. Identify and assess risk factors\n`;
    }
    if (options.strategicPlanning) {
      prompt += `5. Provide implementation steps and timeline\n`;
      prompt += `6. Define success metrics and contingency plans\n`;
    }
    
    prompt += `\nStructure your response as JSON with the following format:\n`;
    prompt += `{\n`;
    prompt += `  "decision": "your recommendation",\n`;
    prompt += `  "rationale": "detailed reasoning",\n`;
    prompt += `  "assumptions": ["list of assumptions"],\n`;
    prompt += `  "alternatives": ["alternative approaches"],\n`;
    prompt += `  "riskFactors": ["identified risks"],\n`;
    prompt += `  "confidence": 0.85,\n`;
    prompt += `  "evidenceBase": ["supporting evidence"],\n`;
    prompt += `  "steps": ["implementation steps"],\n`;
    prompt += `  "resources": ["required resources"],\n`;
    prompt += `  "timeline": "implementation timeline",\n`;
    prompt += `  "successMetrics": ["success measures"],\n`;
    prompt += `  "contingencyPlans": ["backup plans"]\n`;
    prompt += `}`;
    
    return prompt;
  }
  
  private buildAnalysisPrompt(
    subject: any,
    analysisType: string,
    context: ReasoningContext
  ): string {
    let prompt = `# Deep ${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} Analysis\n\n`;
    prompt += `**Subject:** ${JSON.stringify(subject, null, 2)}\n\n`;
    prompt += this.buildContextSection(context);
    
    switch (analysisType) {
      case 'causal':
        prompt += `Analyze the causal relationships, root causes, and contributing factors.`;
        break;
      case 'trend':
        prompt += `Identify patterns, trends, and trajectory projections.`;
        break;
      case 'risk':
        prompt += `Assess risks, vulnerabilities, and mitigation strategies.`;
        break;
      case 'impact':
        prompt += `Evaluate impacts, consequences, and ripple effects.`;
        break;
      case 'comparative':
        prompt += `Compare alternatives, trade-offs, and relative advantages.`;
        break;
    }
    
    return prompt;
  }
  
  private buildCreativityPrompt(
    problem: string,
    constraints: string[],
    context: ReasoningContext,
    count: number
  ): string {
    let prompt = `# Creative Problem Solving\n\n`;
    prompt += `**Problem:** ${problem}\n\n`;
    prompt += `**Constraints:** ${constraints.join(', ')}\n\n`;
    prompt += this.buildContextSection(context);
    prompt += `\nGenerate ${count} innovative, feasible solutions that think outside conventional approaches. `;
    prompt += `For each solution, provide feasibility assessment, innovation rating, implementation steps, and potential risks.`;
    
    return prompt;
  }
  
  private buildLearningPrompt(
    decision: IntelligentDecision,
    feedback: any
  ): string {
    let prompt = `# Adaptive Learning from Decision Feedback\n\n`;
    prompt += `**Original Decision:** ${JSON.stringify(decision.decision)}\n`;
    prompt += `**Reasoning:** ${decision.reasoning.rationale}\n`;
    prompt += `**Outcome:** ${feedback.outcome}\n`;
    prompt += `**Actual Results:** ${JSON.stringify(feedback.actualResults)}\n`;
    prompt += `**Lessons:** ${feedback.lessons.join(', ')}\n\n`;
    prompt += `Analyze what can be learned and how to adapt future decision-making processes.`;
    
    return prompt;
  }
  
  private buildContextSection(context: ReasoningContext): string {
    return `**Context:**\n` +
           `- Domain: ${context.domain}\n` +
           `- Complexity: ${context.complexity}\n` +
           `- Stakeholders: ${context.stakeholders.join(', ')}\n` +
           `- Constraints: ${context.constraints.join(', ')}\n` +
           `- Objectives: ${context.objectives.join(', ')}\n` +
           `- Timeframe: ${context.timeframe}\n` +
           `- Risk Tolerance: ${context.riskTolerance}\n\n`;
  }
  
  private parseIntelligentResponse(response: string, context: ReasoningContext): Omit<IntelligentDecision, 'metadata'> {
    try {
      // Try to parse JSON response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/{[\s\S]*}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return {
          decision: parsed.decision || parsed,
          reasoning: {
            rationale: parsed.rationale || 'No rationale provided',
            assumptions: parsed.assumptions || [],
            alternatives: parsed.alternatives || [],
            riskFactors: parsed.riskFactors || [],
            confidence: parsed.confidence || 0.7,
            evidenceBase: parsed.evidenceBase || []
          },
          implementation: {
            steps: parsed.steps || [],
            resources: parsed.resources || [],
            timeline: parsed.timeline || 'Not specified',
            successMetrics: parsed.successMetrics || [],
            contingencyPlans: parsed.contingencyPlans || []
          }
        };
      }
    } catch (error) {
      this.logger.warn('Failed to parse JSON response, using fallback parsing:', error);
    }
    
    // Fallback text parsing
    return {
      decision: response,
      reasoning: {
        rationale: 'Generated through AI analysis',
        assumptions: [],
        alternatives: [],
        riskFactors: [],
        confidence: 0.6,
        evidenceBase: ['AI-generated response']
      },
      implementation: {
        steps: ['Review generated response', 'Validate recommendations', 'Implement decision'],
        resources: ['Human oversight', 'Domain expertise'],
        timeline: 'To be determined',
        successMetrics: ['Decision effectiveness', 'Outcome quality'],
        contingencyPlans: ['Manual review and adjustment']
      }
    };
  }
  
  private parseAnalysisResponse(response: string, analysisType: string): any {
    // Implementation depends on analysis type
    return {
      analysis: response,
      insights: this.extractInsights(response),
      recommendations: this.extractRecommendations(response),
      confidence: 0.8,
      methodology: `AI-powered ${analysisType} analysis`
    };
  }
  
  private parseCreativeResponse(response: string): any {
    // Parse creative solutions from response
    return {
      solutions: [
        {
          solution: response,
          feasibility: 0.7,
          innovation: 0.8,
          implementation: ['Validate concept', 'Develop prototype'],
          risks: ['Implementation complexity', 'Adoption challenges']
        }
      ],
      emergentInsights: this.extractInsights(response)
    };
  }
  
  private parseLearningResponse(response: string): any {
    return {
      learnings: this.extractLearnings(response),
      adaptations: this.extractAdaptations(response),
      futurePriorities: this.extractPriorities(response)
    };
  }
  
  private extractInsights(text: string): string[] {
    // Simple extraction - can be enhanced with NLP
    const insights = [];
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes('insight') || 
          sentence.toLowerCase().includes('important') ||
          sentence.toLowerCase().includes('significant')) {
        insights.push(sentence.trim());
      }
    }
    return insights.slice(0, 3); // Limit to top 3
  }
  
  private extractRecommendations(text: string): string[] {
    const recommendations = [];
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes('recommend') ||
          sentence.toLowerCase().includes('suggest') ||
          sentence.toLowerCase().includes('should')) {
        recommendations.push(sentence.trim());
      }
    }
    return recommendations.slice(0, 5);
  }
  
  private extractLearnings(text: string): string[] {
    return this.extractByKeywords(text, ['learn', 'lesson', 'understand', 'realize']);
  }
  
  private extractAdaptations(text: string): string[] {
    return this.extractByKeywords(text, ['adapt', 'adjust', 'modify', 'improve']);
  }
  
  private extractPriorities(text: string): string[] {
    return this.extractByKeywords(text, ['priority', 'focus', 'important', 'critical']);
  }
  
  private extractByKeywords(text: string, keywords: string[]): string[] {
    const results = [];
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      if (keywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
        results.push(sentence.trim());
      }
    }
    return results.slice(0, 3);
  }
  
  private determinePriority(context: ReasoningContext): 'low' | 'medium' | 'high' | 'critical' {
    if (context.riskTolerance === 'low' || context.complexity === 'high') {
      return 'high';
    } else if (context.complexity === 'medium') {
      return 'medium';
    }
    return 'low';
  }
  
  private getRequiredCapabilities(reasoningMethod?: string): string[] {
    const baseCapabilities = ['reasoning', 'text-analysis'];
    
    switch (reasoningMethod) {
      case 'analytical':
        return [...baseCapabilities, 'data-analysis', 'logical-reasoning'];
      case 'creative':
        return [...baseCapabilities, 'creative-thinking', 'problem-solving'];
      case 'strategic':
        return [...baseCapabilities, 'strategic-planning', 'decision-making'];
      case 'ethical':
        return [...baseCapabilities, 'ethical-reasoning', 'value-alignment'];
      default:
        return baseCapabilities;
    }
  }
  
  private calculateComplexityScore(context: ReasoningContext): number {
    let score = 0.5; // Base complexity
    
    if (context.complexity === 'high') score += 0.3;
    else if (context.complexity === 'medium') score += 0.15;
    
    score += context.stakeholders.length * 0.05;
    score += context.constraints.length * 0.03;
    score += context.objectives.length * 0.02;
    
    if (context.riskTolerance === 'low') score += 0.1;
    
    return Math.min(score, 1.0);
  }
  
  private generateSessionId(): string {
    return `${this.agentId}-intel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}