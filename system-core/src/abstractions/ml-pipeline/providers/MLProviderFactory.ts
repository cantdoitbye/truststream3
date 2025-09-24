/**
 * ML Provider Factory
 * Creates and manages ML provider instances
 */

import { EventEmitter } from 'events';
import {
  IMLProvider,
  MLProviderFactory as IMLProviderFactory,
  MLProviderRegistry,
  MLProviderConfig,
  MLProviderCapabilities,
  MLProviderValidationResult,
  MLProviderError,
  MLProviderConfigurationError
} from '../interfaces/ml-provider.interface';

// Registry implementation
class MLProviderRegistryImpl implements MLProviderRegistry {
  private providers = new Map<string, IMLProviderFactory>();
  
  register(name: string, factory: IMLProviderFactory): void {
    if (this.providers.has(name)) {
      throw new MLProviderError(
        `Provider ${name} is already registered`,
        'PROVIDER_ALREADY_REGISTERED',
        name
      );
    }
    this.providers.set(name, factory);
  }
  
  unregister(name: string): void {
    this.providers.delete(name);
  }
  
  get(name: string): IMLProviderFactory | null {
    return this.providers.get(name) || null;
  }
  
  list(): string[] {
    return Array.from(this.providers.keys());
  }
  
  getCapabilities(name: string): MLProviderCapabilities | null {
    const factory = this.providers.get(name);
    return factory ? factory.getCapabilities() : null;
  }
}

// Global registry instance
export const mlProviderRegistry = new MLProviderRegistryImpl();

// Factory for creating providers
export class MLProviderFactory extends EventEmitter {
  private static instance: MLProviderFactory;
  private activeProviders = new Map<string, IMLProvider>();
  
  private constructor() {
    super();
  }
  
  static getInstance(): MLProviderFactory {
    if (!MLProviderFactory.instance) {
      MLProviderFactory.instance = new MLProviderFactory();
    }
    return MLProviderFactory.instance;
  }
  
  /**
   * Create a new ML provider instance
   */
  async createProvider(
    type: string, 
    config: MLProviderConfig,
    instanceId?: string
  ): Promise<IMLProvider> {
    try {
      // Get provider factory
      const factory = mlProviderRegistry.get(type);
      if (!factory) {
        throw new MLProviderError(
          `Unknown ML provider type: ${type}`,
          'UNKNOWN_PROVIDER_TYPE',
          type
        );
      }
      
      // Validate configuration
      const validation = await factory.validate(config);
      if (!validation.valid) {
        throw new MLProviderConfigurationError(
          type,
          'configuration',
          validation.errors.join(', ')
        );
      }
      
      // Create provider instance
      const provider = await factory.create(config);
      
      // Initialize the provider
      await provider.initialize(config);
      
      // Track active provider
      const id = instanceId || this.generateInstanceId(type);
      this.activeProviders.set(id, provider);
      
      // Emit event
      this.emit('provider_created', {
        type,
        instanceId: id,
        capabilities: provider.capabilities
      });
      
      return provider;
      
    } catch (error) {
      this.emit('provider_creation_failed', {
        type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Get an active provider instance
   */
  getProvider(instanceId: string): IMLProvider | null {
    return this.activeProviders.get(instanceId) || null;
  }
  
  /**
   * Destroy a provider instance
   */
  async destroyProvider(instanceId: string): Promise<void> {
    const provider = this.activeProviders.get(instanceId);
    if (!provider) {
      return;
    }
    
    try {
      await provider.disconnect();
      this.activeProviders.delete(instanceId);
      
      this.emit('provider_destroyed', {
        instanceId,
        providerType: provider.name
      });
      
    } catch (error) {
      this.emit('provider_destruction_failed', {
        instanceId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * List all active providers
   */
  listActiveProviders(): Array<{
    instanceId: string;
    type: string;
    capabilities: MLProviderCapabilities;
  }> {
    return Array.from(this.activeProviders.entries()).map(([instanceId, provider]) => ({
      instanceId,
      type: provider.name,
      capabilities: provider.capabilities
    }));
  }
  
  /**
   * Get available provider types
   */
  getAvailableProviders(): Array<{
    name: string;
    capabilities: MLProviderCapabilities;
    configSchema: Record<string, any>;
  }> {
    return mlProviderRegistry.list().map(name => {
      const factory = mlProviderRegistry.get(name)!;
      return {
        name,
        capabilities: factory.getCapabilities(),
        configSchema: factory.getConfigSchema()
      };
    });
  }
  
  /**
   * Validate provider configuration
   */
  async validateConfiguration(
    type: string, 
    config: MLProviderConfig
  ): Promise<MLProviderValidationResult> {
    const factory = mlProviderRegistry.get(type);
    if (!factory) {
      return {
        valid: false,
        errors: [`Unknown provider type: ${type}`],
        warnings: [],
        suggestions: [`Available types: ${mlProviderRegistry.list().join(', ')}`]
      };
    }
    
    return await factory.validate(config);
  }
  
  /**
   * Check provider compatibility
   */
  checkCompatibility(
    type: string, 
    requirements: Partial<MLProviderCapabilities>
  ): {
    compatible: boolean;
    missing: string[];
    available: string[];
  } {
    const capabilities = mlProviderRegistry.getCapabilities(type);
    if (!capabilities) {
      return {
        compatible: false,
        missing: ['Provider not found'],
        available: []
      };
    }
    
    const missing: string[] = [];
    const available: string[] = [];
    
    // Check each requirement
    for (const [key, required] of Object.entries(requirements)) {
      const capability = capabilities[key as keyof MLProviderCapabilities];
      
      if (Array.isArray(required)) {
        // Array capabilities (e.g., frameworks, dataTypes)
        const capArray = capability as string[] || [];
        const missingItems = required.filter(item => !capArray.includes(item));
        if (missingItems.length > 0) {
          missing.push(`${key}: ${missingItems.join(', ')}`);
        } else {
          available.push(key);
        }
      } else if (typeof required === 'boolean') {
        // Boolean capabilities (e.g., distributedTraining)
        if (required && !capability) {
          missing.push(key);
        } else {
          available.push(key);
        }
      }
    }
    
    return {
      compatible: missing.length === 0,
      missing,
      available
    };
  }
  
  /**
   * Get provider recommendations
   */
  getProviderRecommendations(
    requirements: Partial<MLProviderCapabilities>
  ): Array<{
    name: string;
    compatibility: number; // 0-1 score
    missing: string[];
    reasons: string[];
  }> {
    const providers = mlProviderRegistry.list();
    const recommendations = [];
    
    for (const providerName of providers) {
      const compatibility = this.checkCompatibility(providerName, requirements);
      const totalRequirements = Object.keys(requirements).length;
      const metRequirements = compatibility.available.length;
      const score = totalRequirements > 0 ? metRequirements / totalRequirements : 1;
      
      const reasons = [];
      if (score === 1) {
        reasons.push('Meets all requirements');
      } else if (score >= 0.8) {
        reasons.push('Meets most requirements');
      } else if (score >= 0.5) {
        reasons.push('Meets some requirements');
      } else {
        reasons.push('Limited compatibility');
      }
      
      recommendations.push({
        name: providerName,
        compatibility: score,
        missing: compatibility.missing,
        reasons
      });
    }
    
    // Sort by compatibility score
    return recommendations.sort((a, b) => b.compatibility - a.compatibility);
  }
  
  /**
   * Health check for all active providers
   */
  async healthCheck(): Promise<Record<string, {
    healthy: boolean;
    details: any;
    lastCheck: Date;
  }>> {
    const results: Record<string, any> = {};
    const checkPromises = [];
    
    for (const [instanceId, provider] of this.activeProviders) {
      checkPromises.push(
        provider.getHealth()
          .then(health => {
            results[instanceId] = {
              healthy: health.overall === 'healthy',
              details: health,
              lastCheck: new Date()
            };
          })
          .catch(error => {
            results[instanceId] = {
              healthy: false,
              details: { error: error.message },
              lastCheck: new Date()
            };
          })
      );
    }
    
    await Promise.allSettled(checkPromises);
    return results;
  }
  
  /**
   * Cleanup inactive providers
   */
  async cleanup(): Promise<void> {
    const healthResults = await this.healthCheck();
    const toDestroy = [];
    
    for (const [instanceId, result] of Object.entries(healthResults)) {
      if (!result.healthy) {
        toDestroy.push(instanceId);
      }
    }
    
    for (const instanceId of toDestroy) {
      try {
        await this.destroyProvider(instanceId);
      } catch (error) {
        // Log error but continue cleanup
        console.error(`Failed to cleanup provider ${instanceId}:`, error);
      }
    }
  }
  
  private generateInstanceId(type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${type}_${timestamp}_${random}`;
  }
}

// Singleton instance
export const mlProviderFactory = MLProviderFactory.getInstance();

// Convenience function for creating providers
export async function createMLProvider(
  type: string,
  config: MLProviderConfig,
  instanceId?: string
): Promise<IMLProvider> {
  return mlProviderFactory.createProvider(type, config, instanceId);
}
