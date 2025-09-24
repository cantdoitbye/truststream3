/**
 * Governance Context Manager - MCP/A2A Integration
 * Manages shared governance contexts across agents in the MCP network
 * 
 * File: truststream-v4.2/src/agents/shared/governance-context-manager.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface GovernanceContext {
  contextId: string;
  contextType: 'decision' | 'policy' | 'standard' | 'metric' | 'audit';
  sourceAgent: string;
  timestamp: Date;
  data: any;
  metadata: {
    scope: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    expiration?: Date;
    dependencies: string[];
    permissions: ContextPermissions;
  };
}

export interface ContextPermissions {
  read: string[];
  write: string[];
  share: string[];
  delete: string[];
}

export interface ContextAcknowledgment {
  contextId: string;
  acknowledged: boolean;
  timestamp: Date;
  subscribers: string[];
}

export interface GovernanceContextProtocol {
  shareGovernanceContext(context: GovernanceContext): Promise<ContextAcknowledgment>;
  requestGovernanceContext(agentId: string, contextType: string): Promise<GovernanceContext>;
  synchronizeContext(contextId: string): Promise<SyncResult>;
  validateContextConsistency(): Promise<ConsistencyReport>;
  inheritContext(parentContextId: string, childAgentId: string): Promise<InheritanceResult>;
  propagateContextUpdates(contextUpdate: ContextUpdate): Promise<PropagationResult>;
}

export interface SyncResult {
  contextId: string;
  synchronized: boolean;
  conflicts: any[];
  resolution: string;
}

export interface ConsistencyReport {
  consistent: boolean;
  issues: any[];
  recommendations: string[];
}

export interface InheritanceResult {
  parentContextId: string;
  childContextId: string;
  inherited: boolean;
  modifications: any[];
}

export interface ContextUpdate {
  contextId: string;
  updateType: 'data' | 'metadata' | 'permissions';
  changes: any;
  sourceAgent: string;
  timestamp: Date;
}

export interface PropagationResult {
  contextId: string;
  propagated: boolean;
  recipients: string[];
  failures: any[];
}

export class GovernanceContextManager implements GovernanceContextProtocol {
  private supabaseClient: SupabaseClient;
  private contextCache: Map<string, GovernanceContext> = new Map();
  private subscribers: Map<string, Set<string>> = new Map(); // contextType -> Set<agentId>
  private contextValidityCache: Map<string, boolean> = new Map();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseClient = createClient(supabaseUrl, supabaseKey);
    this.setupRealtimeSubscriptions();
  }

  async shareGovernanceContext(context: GovernanceContext): Promise<ContextAcknowledgment> {
    try {
      console.log(`Sharing governance context: ${context.contextId} of type ${context.contextType}`);

      // Validate context permissions
      await this.validateContextPermissions(context);

      // Store context in database
      const { data, error } = await this.supabaseClient
        .from('governance_contexts')
        .insert({
          context_id: context.contextId,
          context_type: context.contextType,
          source_agent: context.sourceAgent,
          timestamp: context.timestamp.toISOString(),
          data: context.data,
          metadata: context.metadata,
          scope: context.metadata.scope,
          priority: context.metadata.priority,
          expiration: context.metadata.expiration?.toISOString(),
          dependencies: context.metadata.dependencies,
          permissions: context.metadata.permissions
        })
        .select();

      if (error) {
        console.error('Failed to store governance context:', error);
        throw error;
      }

      // Update local cache
      this.contextCache.set(context.contextId, context);
      this.contextValidityCache.set(context.contextId, true);

      // Notify subscribers
      const subscribers = await this.notifyContextSubscribers(context);

      console.log(`Context shared successfully. Notified ${subscribers.length} subscribers.`);

      return {
        contextId: context.contextId,
        acknowledged: true,
        timestamp: new Date(),
        subscribers: subscribers
      };

    } catch (error) {
      console.error('Error sharing governance context:', error);
      throw error;
    }
  }

  async requestGovernanceContext(agentId: string, contextType: string): Promise<GovernanceContext> {
    try {
      console.log(`Agent ${agentId} requesting context of type: ${contextType}`);

      // Check cache first
      const cachedContext = Array.from(this.contextCache.values())
        .find(ctx => ctx.contextType === contextType && this.isContextValid(ctx));

      if (cachedContext) {
        console.log(`Context found in cache: ${cachedContext.contextId}`);
        return cachedContext;
      }

      // Fetch from database
      const { data, error } = await this.supabaseClient
        .from('governance_contexts')
        .select('*')
        .eq('context_type', contextType)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching governance context:', error);
        throw error;
      }

      if (!data.length) {
        throw new Error(`No context found for type: ${contextType}`);
      }

      const contextData = data[0];
      const context: GovernanceContext = {
        contextId: contextData.context_id,
        contextType: contextData.context_type,
        sourceAgent: contextData.source_agent,
        timestamp: new Date(contextData.timestamp),
        data: contextData.data,
        metadata: contextData.metadata
      };

      // Validate permissions
      await this.validateAccessPermissions(agentId, context);

      // Update cache
      this.contextCache.set(context.contextId, context);
      this.contextValidityCache.set(context.contextId, true);

      console.log(`Context retrieved: ${context.contextId}`);
      return context;

    } catch (error) {
      console.error('Error requesting governance context:', error);
      throw error;
    }
  }

  async synchronizeContext(contextId: string): Promise<SyncResult> {
    try {
      const cachedContext = this.contextCache.get(contextId);
      
      // Fetch latest from database
      const { data, error } = await this.supabaseClient
        .from('governance_contexts')
        .select('*')
        .eq('context_id', contextId);

      if (error) throw error;
      if (!data.length) throw new Error(`Context not found: ${contextId}`);

      const dbContext = data[0];
      const conflicts = [];

      // Check for conflicts
      if (cachedContext) {
        if (cachedContext.timestamp.getTime() !== new Date(dbContext.timestamp).getTime()) {
          conflicts.push({
            type: 'timestamp_mismatch',
            cached: cachedContext.timestamp,
            database: dbContext.timestamp
          });
        }

        if (JSON.stringify(cachedContext.data) !== JSON.stringify(dbContext.data)) {
          conflicts.push({
            type: 'data_mismatch',
            field: 'data'
          });
        }
      }

      // Update cache with latest data
      const syncedContext: GovernanceContext = {
        contextId: dbContext.context_id,
        contextType: dbContext.context_type,
        sourceAgent: dbContext.source_agent,
        timestamp: new Date(dbContext.timestamp),
        data: dbContext.data,
        metadata: dbContext.metadata
      };

      this.contextCache.set(contextId, syncedContext);

      return {
        contextId,
        synchronized: true,
        conflicts,
        resolution: conflicts.length > 0 ? 'database_priority' : 'no_conflicts'
      };

    } catch (error) {
      console.error('Error synchronizing context:', error);
      throw error;
    }
  }

  async validateContextConsistency(): Promise<ConsistencyReport> {
    try {
      const issues = [];
      const recommendations = [];

      // Check for expired contexts
      for (const [contextId, context] of this.contextCache) {
        if (context.metadata.expiration && new Date() > context.metadata.expiration) {
          issues.push({
            type: 'expired_context',
            contextId,
            expiration: context.metadata.expiration
          });
          recommendations.push(`Remove expired context: ${contextId}`);
        }
      }

      // Check for missing dependencies
      for (const [contextId, context] of this.contextCache) {
        for (const dependency of context.metadata.dependencies) {
          if (!this.contextCache.has(dependency)) {
            issues.push({
              type: 'missing_dependency',
              contextId,
              missingDependency: dependency
            });
            recommendations.push(`Ensure dependency ${dependency} is available for context ${contextId}`);
          }
        }
      }

      // Check for circular dependencies
      const circularDeps = this.detectCircularDependencies();
      if (circularDeps.length > 0) {
        issues.push({
          type: 'circular_dependencies',
          cycles: circularDeps
        });
        recommendations.push('Resolve circular dependencies between contexts');
      }

      return {
        consistent: issues.length === 0,
        issues,
        recommendations
      };

    } catch (error) {
      console.error('Error validating context consistency:', error);
      throw error;
    }
  }

  async inheritContext(parentContextId: string, childAgentId: string): Promise<InheritanceResult> {
    try {
      const parentContext = this.contextCache.get(parentContextId);
      if (!parentContext) {
        throw new Error(`Parent context not found: ${parentContextId}`);
      }

      // Create child context with inherited data
      const childContextId = `${parentContextId}-child-${Date.now()}`;
      const modifications = [];

      // Apply inheritance rules based on context type
      let inheritedData = { ...parentContext.data };
      let inheritedMetadata = { ...parentContext.metadata };

      // Modify scope for child context
      inheritedMetadata.scope = [`child_of_${parentContextId}`];
      modifications.push({
        field: 'scope',
        change: 'inherited_scope_applied'
      });

      // Adjust permissions for child agent
      inheritedMetadata.permissions = {
        ...parentContext.metadata.permissions,
        read: [...parentContext.metadata.permissions.read, childAgentId],
        write: [childAgentId] // Child has write access to its inherited context
      };
      modifications.push({
        field: 'permissions',
        change: 'child_agent_permissions_added'
      });

      const childContext: GovernanceContext = {
        contextId: childContextId,
        contextType: parentContext.contextType,
        sourceAgent: childAgentId,
        timestamp: new Date(),
        data: inheritedData,
        metadata: inheritedMetadata
      };

      // Share the inherited context
      await this.shareGovernanceContext(childContext);

      return {
        parentContextId,
        childContextId,
        inherited: true,
        modifications
      };

    } catch (error) {
      console.error('Error inheriting context:', error);
      throw error;
    }
  }

  async propagateContextUpdates(contextUpdate: ContextUpdate): Promise<PropagationResult> {
    try {
      const context = this.contextCache.get(contextUpdate.contextId);
      if (!context) {
        throw new Error(`Context not found for update: ${contextUpdate.contextId}`);
      }

      // Apply updates to context
      const updatedContext = { ...context };
      
      switch (contextUpdate.updateType) {
        case 'data':
          updatedContext.data = { ...updatedContext.data, ...contextUpdate.changes };
          break;
        case 'metadata':
          updatedContext.metadata = { ...updatedContext.metadata, ...contextUpdate.changes };
          break;
        case 'permissions':
          updatedContext.metadata.permissions = { ...updatedContext.metadata.permissions, ...contextUpdate.changes };
          break;
      }

      // Update in database
      const { error } = await this.supabaseClient
        .from('governance_contexts')
        .update({
          data: updatedContext.data,
          metadata: updatedContext.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('context_id', contextUpdate.contextId);

      if (error) throw error;

      // Update cache
      this.contextCache.set(contextUpdate.contextId, updatedContext);

      // Notify subscribers of the update
      const subscribers = this.subscribers.get(context.contextType) || new Set();
      const recipients = Array.from(subscribers);
      const failures = [];

      for (const subscriber of recipients) {
        try {
          await this.notifyContextUpdate(subscriber, contextUpdate);
        } catch (error) {
          failures.push({
            subscriber,
            error: error.message
          });
        }
      }

      return {
        contextId: contextUpdate.contextId,
        propagated: true,
        recipients,
        failures
      };

    } catch (error) {
      console.error('Error propagating context updates:', error);
      throw error;
    }
  }

  // Private helper methods

  private setupRealtimeSubscriptions(): void {
    this.supabaseClient
      .channel('governance_contexts_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'governance_contexts' },
        (payload) => this.handleRealtimeContextUpdate(payload)
      )
      .subscribe();
  }

  private async handleRealtimeContextUpdate(payload: any): Promise<void> {
    try {
      if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
        const contextData = payload.new;
        const context: GovernanceContext = {
          contextId: contextData.context_id,
          contextType: contextData.context_type,
          sourceAgent: contextData.source_agent,
          timestamp: new Date(contextData.timestamp),
          data: contextData.data,
          metadata: contextData.metadata
        };

        this.contextCache.set(context.contextId, context);
        this.contextValidityCache.set(context.contextId, true);
      } else if (payload.eventType === 'DELETE') {
        const contextId = payload.old.context_id;
        this.contextCache.delete(contextId);
        this.contextValidityCache.delete(contextId);
      }
    } catch (error) {
      console.error('Error handling realtime context update:', error);
    }
  }

  private async validateContextPermissions(context: GovernanceContext): Promise<void> {
    // Validate that source agent has permission to create this type of context
    const { data, error } = await this.supabaseClient
      .from('agent_registry')
      .select('governance_role, mcp_capabilities')
      .eq('agent_id', context.sourceAgent);

    if (error) throw error;
    if (!data.length) throw new Error(`Agent not found: ${context.sourceAgent}`);

    const agent = data[0];
    
    // Check if agent has governance role
    if (!agent.governance_role) {
      throw new Error(`Agent ${context.sourceAgent} does not have governance permissions`);
    }

    // Check MCP capabilities
    const capabilities = agent.mcp_capabilities || {};
    if (!capabilities.protocols?.includes('governance-context')) {
      throw new Error(`Agent ${context.sourceAgent} does not support governance context protocol`);
    }
  }

  private async validateAccessPermissions(agentId: string, context: GovernanceContext): Promise<void> {
    const permissions = context.metadata.permissions;
    
    if (!permissions.read.includes(agentId) && !permissions.read.includes('*')) {
      throw new Error(`Agent ${agentId} does not have read permission for context ${context.contextId}`);
    }
  }

  private isContextValid(context: GovernanceContext): boolean {
    if (context.metadata.expiration && new Date() > context.metadata.expiration) {
      return false;
    }
    return this.contextValidityCache.get(context.contextId) !== false;
  }

  private async notifyContextSubscribers(context: GovernanceContext): Promise<string[]> {
    const subscribers = this.subscribers.get(context.contextType) || new Set();
    const notified = [];

    for (const subscriberId of subscribers) {
      try {
        await this.notifySubscriber(subscriberId, context);
        notified.push(subscriberId);
      } catch (error) {
        console.error(`Failed to notify subscriber ${subscriberId}:`, error);
      }
    }

    return notified;
  }

  private async notifySubscriber(subscriberId: string, context: GovernanceContext): Promise<void> {
    // This would integrate with the MCP communication system
    // For now, we'll store a notification record
    await this.supabaseClient
      .from('governance_communications')
      .insert({
        source_agent: 'context_manager',
        target_agent: subscriberId,
        message_type: 'context_notification',
        content: {
          contextId: context.contextId,
          contextType: context.contextType,
          sourceAgent: context.sourceAgent
        },
        context_id: context.contextId,
        priority: context.metadata.priority
      });
  }

  private async notifyContextUpdate(subscriberId: string, update: ContextUpdate): Promise<void> {
    await this.supabaseClient
      .from('governance_communications')
      .insert({
        source_agent: 'context_manager',
        target_agent: subscriberId,
        message_type: 'context_update',
        content: {
          contextId: update.contextId,
          updateType: update.updateType,
          changes: update.changes
        },
        context_id: update.contextId,
        priority: 'medium'
      });
  }

  private detectCircularDependencies(): string[][] {
    const cycles = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycle = (contextId: string, path: string[]): void => {
      if (recursionStack.has(contextId)) {
        const cycleStart = path.indexOf(contextId);
        cycles.push(path.slice(cycleStart));
        return;
      }

      if (visited.has(contextId)) return;

      visited.add(contextId);
      recursionStack.add(contextId);

      const context = this.contextCache.get(contextId);
      if (context) {
        for (const dependency of context.metadata.dependencies) {
          detectCycle(dependency, [...path, contextId]);
        }
      }

      recursionStack.delete(contextId);
    };

    for (const contextId of this.contextCache.keys()) {
      if (!visited.has(contextId)) {
        detectCycle(contextId, []);
      }
    }

    return cycles;
  }

  // Public subscription management methods

  async subscribeToContextType(agentId: string, contextType: string): Promise<void> {
    if (!this.subscribers.has(contextType)) {
      this.subscribers.set(contextType, new Set());
    }
    this.subscribers.get(contextType)!.add(agentId);
    
    console.log(`Agent ${agentId} subscribed to context type: ${contextType}`);
  }

  async unsubscribeFromContextType(agentId: string, contextType: string): Promise<void> {
    const subscribers = this.subscribers.get(contextType);
    if (subscribers) {
      subscribers.delete(agentId);
      console.log(`Agent ${agentId} unsubscribed from context type: ${contextType}`);
    }
  }

  // Context cleanup and maintenance

  async cleanupExpiredContexts(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [contextId, context] of this.contextCache) {
      if (context.metadata.expiration && now > context.metadata.expiration) {
        // Remove from cache
        this.contextCache.delete(contextId);
        this.contextValidityCache.delete(contextId);

        // Remove from database
        await this.supabaseClient
          .from('governance_contexts')
          .delete()
          .eq('context_id', contextId);

        cleanedCount++;
      }
    }

    console.log(`Cleaned up ${cleanedCount} expired contexts`);
    return cleanedCount;
  }

  async getContextMetrics(): Promise<any> {
    return {
      total_contexts: this.contextCache.size,
      contexts_by_type: this.getContextsByType(),
      cache_hit_rate: this.calculateCacheHitRate(),
      average_context_age: this.calculateAverageContextAge(),
      subscriber_count: this.getTotalSubscriberCount()
    };
  }

  private getContextsByType(): Record<string, number> {
    const byType: Record<string, number> = {};
    for (const context of this.contextCache.values()) {
      byType[context.contextType] = (byType[context.contextType] || 0) + 1;
    }
    return byType;
  }

  private calculateCacheHitRate(): number {
    // This would be tracked through actual usage metrics
    return 0.85; // Placeholder
  }

  private calculateAverageContextAge(): number {
    const now = new Date();
    const ages = Array.from(this.contextCache.values())
      .map(context => now.getTime() - context.timestamp.getTime());
    
    return ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 0;
  }

  private getTotalSubscriberCount(): number {
    let total = 0;
    for (const subscribers of this.subscribers.values()) {
      total += subscribers.size;
    }
    return total;
  }
}
