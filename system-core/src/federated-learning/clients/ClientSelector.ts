/**
 * TrustStram v4.4 Client Selection and Management
 * Implements intelligent client selection strategies for federated learning
 */

import {
  FederatedClient,
  ClientSelectionConfig,
  SelectionCriteria
} from '../types';

/**
 * Intelligent client selector implementing multiple selection strategies
 * Based on research findings for optimal federated learning performance
 */
export class ClientSelector {
  private selectionHistory: Map<string, number> = new Map();
  private clientPerformanceMetrics: Map<string, ClientPerformanceMetrics> = new Map();
  private diversityWeights: DiversityWeights;

  constructor() {
    this.diversityWeights = {
      data_quality: 0.3,
      compute_power: 0.25,
      network_reliability: 0.2,
      geographic_diversity: 0.15,
      data_diversity: 0.1
    };
  }

  /**
   * Select clients based on the specified strategy
   */
  async selectClients(
    availableClients: FederatedClient[],
    config: ClientSelectionConfig
  ): Promise<FederatedClient[]> {
    try {
      // Filter clients based on selection criteria
      const eligibleClients = this.filterEligibleClients(availableClients, config.selection_criteria);
      
      if (eligibleClients.length < config.min_clients) {
        throw new Error(
          `Insufficient eligible clients. Required: ${config.min_clients}, Available: ${eligibleClients.length}`
        );
      }
      
      let selectedClients: FederatedClient[];
      
      switch (config.selection_strategy) {
        case 'random':
          selectedClients = this.randomSelection(eligibleClients, config.max_clients);
          break;
        case 'performance_based':
          selectedClients = await this.performanceBasedSelection(eligibleClients, config);
          break;
        case 'data_quality':
          selectedClients = this.dataQualityBasedSelection(eligibleClients, config.max_clients);
          break;
        case 'hybrid':
          selectedClients = await this.hybridSelection(eligibleClients, config);
          break;
        default:
          selectedClients = this.randomSelection(eligibleClients, config.max_clients);
      }
      
      // Update selection history
      this.updateSelectionHistory(selectedClients);
      
      console.log(`Selected ${selectedClients.length} clients using ${config.selection_strategy} strategy`);
      return selectedClients;
      
    } catch (error) {
      console.error('Failed to select clients:', error);
      throw error;
    }
  }

  /**
   * Filter clients based on eligibility criteria
   */
  private filterEligibleClients(
    clients: FederatedClient[],
    criteria: SelectionCriteria
  ): FederatedClient[] {
    return clients.filter(client => {
      // Check data sample requirements
      if (client.data_schema.sample_count < criteria.min_data_samples) {
        return false;
      }
      
      // Check data quality
      if (client.data_schema.data_quality < criteria.min_data_quality) {
        return false;
      }
      
      // Check compute power
      const computeLevel = this.getComputeLevel(criteria.min_compute_power);
      if (this.getComputeLevel(client.capabilities.compute_power) < computeLevel) {
        return false;
      }
      
      // Check network reliability (based on historical performance)
      const reliability = this.getClientNetworkReliability(client.client_id);
      if (reliability < 0.8) { // 80% reliability threshold
        return false;
      }
      
      // Check privacy compliance
      if (criteria.privacy_compliance && !this.checkPrivacyCompliance(client)) {
        return false;
      }
      
      // Check client status
      if (client.status !== 'available') {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Random client selection
   */
  private randomSelection(
    clients: FederatedClient[],
    maxClients: number
  ): FederatedClient[] {
    const shuffled = [...clients].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(maxClients, clients.length));
  }

  /**
   * Performance-based client selection
   */
  private async performanceBasedSelection(
    clients: FederatedClient[],
    config: ClientSelectionConfig
  ): Promise<FederatedClient[]> {
    // Calculate performance scores for each client
    const clientScores = await Promise.all(
      clients.map(async client => ({
        client,
        score: await this.calculatePerformanceScore(client)
      }))
    );
    
    // Sort by performance score (descending)
    clientScores.sort((a, b) => b.score - a.score);
    
    // Select top performers
    const selectedCount = Math.min(config.max_clients, clientScores.length);
    return clientScores.slice(0, selectedCount).map(item => item.client);
  }

  /**
   * Data quality-based client selection
   */
  private dataQualityBasedSelection(
    clients: FederatedClient[],
    maxClients: number
  ): FederatedClient[] {
    // Sort by data quality and sample count
    const sorted = [...clients].sort((a, b) => {
      const qualityDiff = b.data_schema.data_quality - a.data_schema.data_quality;
      if (Math.abs(qualityDiff) < 0.01) {
        return b.data_schema.sample_count - a.data_schema.sample_count;
      }
      return qualityDiff;
    });
    
    return sorted.slice(0, Math.min(maxClients, sorted.length));
  }

  /**
   * Hybrid selection strategy combining multiple factors
   */
  private async hybridSelection(
    clients: FederatedClient[],
    config: ClientSelectionConfig
  ): Promise<FederatedClient[]> {
    // Calculate composite scores
    const clientScores = await Promise.all(
      clients.map(async client => ({
        client,
        score: await this.calculateHybridScore(client)
      }))
    );
    
    // Apply diversity constraints
    const diverseSelection = this.ensureDiversity(clientScores, config.max_clients);
    
    return diverseSelection;
  }

  /**
   * Calculate performance score for a client
   */
  private async calculatePerformanceScore(client: FederatedClient): Promise<number> {
    const metrics = this.clientPerformanceMetrics.get(client.client_id);
    
    if (!metrics) {
      // Default score for new clients based on capabilities
      return this.calculateCapabilityScore(client);
    }
    
    // Weighted performance score
    const weights = {
      training_speed: 0.3,
      communication_efficiency: 0.25,
      reliability: 0.2,
      data_quality: 0.15,
      resource_utilization: 0.1
    };
    
    return (
      metrics.training_speed * weights.training_speed +
      metrics.communication_efficiency * weights.communication_efficiency +
      metrics.reliability * weights.reliability +
      metrics.data_quality * weights.data_quality +
      metrics.resource_utilization * weights.resource_utilization
    );
  }

  /**
   * Calculate hybrid score combining performance and diversity
   */
  private async calculateHybridScore(client: FederatedClient): Promise<number> {
    const performanceScore = await this.calculatePerformanceScore(client);
    const diversityScore = this.calculateDiversityScore(client);
    const fairnessScore = this.calculateFairnessScore(client);
    
    // Weighted combination
    return (
      performanceScore * 0.5 +
      diversityScore * 0.3 +
      fairnessScore * 0.2
    );
  }

  /**
   * Calculate diversity score for a client
   */
  private calculateDiversityScore(client: FederatedClient): number {
    let score = 0;
    
    // Data quality diversity
    score += this.diversityWeights.data_quality * client.data_schema.data_quality;
    
    // Compute power diversity
    const computeScore = this.getComputeLevel(client.capabilities.compute_power) / 3;
    score += this.diversityWeights.compute_power * computeScore;
    
    // Network reliability
    const reliability = this.getClientNetworkReliability(client.client_id);
    score += this.diversityWeights.network_reliability * reliability;
    
    // Geographic diversity (placeholder - would use actual geographic data)
    score += this.diversityWeights.geographic_diversity * 0.5;
    
    // Data diversity (based on data type and schema)
    const dataDiversity = this.calculateDataDiversity(client);
    score += this.diversityWeights.data_diversity * dataDiversity;
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate fairness score to ensure equitable participation
   */
  private calculateFairnessScore(client: FederatedClient): number {
    const selectionCount = this.selectionHistory.get(client.client_id) || 0;
    const maxSelections = Math.max(...Array.from(this.selectionHistory.values()), 1);
    
    // Favor clients that have been selected less frequently
    return 1.0 - (selectionCount / maxSelections);
  }

  /**
   * Ensure diversity in the selected client set
   */
  private ensureDiversity(
    clientScores: Array<{ client: FederatedClient; score: number }>,
    maxClients: number
  ): FederatedClient[] {
    const selected: FederatedClient[] = [];
    const remaining = [...clientScores];
    
    // Sort by score initially
    remaining.sort((a, b) => b.score - a.score);
    
    while (selected.length < maxClients && remaining.length > 0) {
      let bestIndex = 0;
      
      if (selected.length > 0) {
        // Find client that maximizes diversity
        let maxDiversityScore = -1;
        
        for (let i = 0; i < Math.min(remaining.length, 10); i++) {
          const diversityScore = this.calculateSetDiversity(selected, remaining[i].client);
          const combinedScore = remaining[i].score * 0.7 + diversityScore * 0.3;
          
          if (combinedScore > maxDiversityScore) {
            maxDiversityScore = combinedScore;
            bestIndex = i;
          }
        }
      }
      
      selected.push(remaining[bestIndex].client);
      remaining.splice(bestIndex, 1);
    }
    
    return selected;
  }

  /**
   * Calculate diversity contribution of adding a client to the set
   */
  private calculateSetDiversity(selectedClients: FederatedClient[], candidate: FederatedClient): number {
    if (selectedClients.length === 0) {
      return 1.0;
    }
    
    let diversitySum = 0;
    
    for (const selected of selectedClients) {
      // Calculate dissimilarity between candidate and selected client
      const dissimilarity = this.calculateClientDissimilarity(selected, candidate);
      diversitySum += dissimilarity;
    }
    
    return diversitySum / selectedClients.length;
  }

  /**
   * Calculate dissimilarity between two clients
   */
  private calculateClientDissimilarity(client1: FederatedClient, client2: FederatedClient): number {
    let dissimilarity = 0;
    
    // Data type dissimilarity
    if (client1.data_schema.data_type !== client2.data_schema.data_type) {
      dissimilarity += 0.3;
    }
    
    // Compute power dissimilarity
    const compute1 = this.getComputeLevel(client1.capabilities.compute_power);
    const compute2 = this.getComputeLevel(client2.capabilities.compute_power);
    dissimilarity += 0.2 * Math.abs(compute1 - compute2) / 2;
    
    // Client type dissimilarity
    if (client1.client_type !== client2.client_type) {
      dissimilarity += 0.25;
    }
    
    // Privacy level dissimilarity
    const privacy1 = this.getPrivacyLevel(client1.capabilities.privacy_level);
    const privacy2 = this.getPrivacyLevel(client2.capabilities.privacy_level);
    dissimilarity += 0.15 * Math.abs(privacy1 - privacy2) / 2;
    
    // Data size dissimilarity (normalized)
    const size1 = Math.log(client1.data_schema.sample_count + 1);
    const size2 = Math.log(client2.data_schema.sample_count + 1);
    const maxSize = Math.max(size1, size2);
    if (maxSize > 0) {
      dissimilarity += 0.1 * Math.abs(size1 - size2) / maxSize;
    }
    
    return Math.min(dissimilarity, 1.0);
  }

  /**
   * Update client performance metrics
   */
  updateClientMetrics(clientId: string, metrics: Partial<ClientPerformanceMetrics>): void {
    const existing = this.clientPerformanceMetrics.get(clientId) || {
      training_speed: 0.5,
      communication_efficiency: 0.5,
      reliability: 0.5,
      data_quality: 0.5,
      resource_utilization: 0.5,
      last_updated: new Date().toISOString()
    };
    
    const updated = {
      ...existing,
      ...metrics,
      last_updated: new Date().toISOString()
    };
    
    this.clientPerformanceMetrics.set(clientId, updated);
  }

  /**
   * Update selection history
   */
  private updateSelectionHistory(selectedClients: FederatedClient[]): void {
    for (const client of selectedClients) {
      const count = this.selectionHistory.get(client.client_id) || 0;
      this.selectionHistory.set(client.client_id, count + 1);
    }
  }

  /**
   * Helper methods
   */
  private getComputeLevel(level: string): number {
    switch (level) {
      case 'low': return 1;
      case 'medium': return 2;
      case 'high': return 3;
      default: return 1;
    }
  }

  private getPrivacyLevel(level: string): number {
    switch (level) {
      case 'basic': return 1;
      case 'enhanced': return 2;
      case 'maximum': return 3;
      default: return 1;
    }
  }

  private calculateCapabilityScore(client: FederatedClient): number {
    const computeScore = this.getComputeLevel(client.capabilities.compute_power) / 3;
    const memoryScore = Math.min(client.capabilities.memory_available / (8 * 1024 * 1024 * 1024), 1); // Normalize to 8GB
    const networkScore = Math.min(client.capabilities.network_bandwidth / 100000000, 1); // Normalize to 100Mbps
    const dataQualityScore = client.data_schema.data_quality;
    
    return (computeScore + memoryScore + networkScore + dataQualityScore) / 4;
  }

  private getClientNetworkReliability(clientId: string): number {
    const metrics = this.clientPerformanceMetrics.get(clientId);
    return metrics?.reliability || 0.8; // Default reliability
  }

  private checkPrivacyCompliance(client: FederatedClient): boolean {
    // Check if client supports required privacy features
    return (
      client.privacy_preferences.allow_homomorphic_encryption &&
      client.privacy_preferences.secure_aggregation_required
    );
  }

  private calculateDataDiversity(client: FederatedClient): number {
    // Calculate data diversity based on schema characteristics
    const featureNormalized = Math.min(client.data_schema.feature_count / 1000, 1);
    const sampleNormalized = Math.min(client.data_schema.sample_count / 100000, 1);
    const sensitivityBonus = client.data_schema.privacy_sensitivity === 'high' ? 0.2 : 0;
    
    return (featureNormalized + sampleNormalized) / 2 + sensitivityBonus;
  }

  /**
   * Get selection statistics
   */
  getSelectionStatistics(): SelectionStatistics {
    const totalSelections = Array.from(this.selectionHistory.values()).reduce((sum, count) => sum + count, 0);
    const uniqueClients = this.selectionHistory.size;
    const averageSelections = uniqueClients > 0 ? totalSelections / uniqueClients : 0;
    
    return {
      total_selections: totalSelections,
      unique_clients: uniqueClients,
      average_selections_per_client: averageSelections,
      selection_distribution: Object.fromEntries(this.selectionHistory)
    };
  }
}

// Helper interfaces
interface ClientPerformanceMetrics {
  training_speed: number;
  communication_efficiency: number;
  reliability: number;
  data_quality: number;
  resource_utilization: number;
  last_updated: string;
}

interface DiversityWeights {
  data_quality: number;
  compute_power: number;
  network_reliability: number;
  geographic_diversity: number;
  data_diversity: number;
}

interface SelectionStatistics {
  total_selections: number;
  unique_clients: number;
  average_selections_per_client: number;
  selection_distribution: Record<string, number>;
}
