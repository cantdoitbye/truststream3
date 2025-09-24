/**
 * Enhanced Repository
 * Advanced repository pattern with built-in caching, validation, and events
 */

import { 
  IRepository,
  QueryOptions,
  WhereCondition,
  BaseRepository
} from '../../../shared-utils/database-interface';
import { UnifiedDatabaseService } from '../UnifiedDatabaseService';
import { DatabaseEventService } from '../events/DatabaseEventService';

export interface RepositoryOptions {
  enableCaching?: boolean;
  cacheTimeout?: number;
  enableValidation?: boolean;
  enableEvents?: boolean;
  autoTimestamps?: boolean;
}

export interface RepositoryQueryOptions extends QueryOptions {
  useCache?: boolean;
  cacheKey?: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
}

export interface ValidationRule<T> {
  field: keyof T;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export class EnhancedRepository<T extends { id?: string; created_at?: Date; updated_at?: Date }> 
  extends BaseRepository<T> {
  
  protected tableName: string;
  protected database: UnifiedDatabaseService;
  private options: Required<RepositoryOptions>;
  private cache = new Map<string, CacheEntry<T | T[]>>();
  private validationRules: ValidationRule<T>[] = [];
  private eventService?: DatabaseEventService;

  constructor(
    tableName: string,
    database: UnifiedDatabaseService,
    options: RepositoryOptions = {}
  ) {
    super();
    this.tableName = tableName;
    this.database = database;
    this.options = {
      enableCaching: options.enableCaching ?? false,
      cacheTimeout: options.cacheTimeout ?? 300000, // 5 minutes
      enableValidation: options.enableValidation ?? true,
      enableEvents: options.enableEvents ?? true,
      autoTimestamps: options.autoTimestamps ?? true
    };

    if (this.options.enableEvents) {
      this.eventService = database.getEventService();
    }
  }

  // Enhanced CRUD Operations
  async findById(id: string, useCache = true): Promise<T | null> {
    const cacheKey = `${this.tableName}:${id}`;
    
    // Check cache first
    if (useCache && this.options.enableCaching) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        await this.emitEvent('cache_hit', { table: this.tableName, id });
        return cached;
      }
    }

    const result = await this.database.readOne<T>(this.tableName, {
      where: [{ column: 'id', operator: 'eq', value: id }]
    });

    // Cache the result
    if (result && this.options.enableCaching) {
      this.setCache(cacheKey, result);
    }

    await this.emitEvent('entity_found', { table: this.tableName, id, found: !!result });
    return result;
  }

  async findOne(query: RepositoryQueryOptions): Promise<T | null> {
    const cacheKey = query.cacheKey || this.generateCacheKey('findOne', query);
    
    // Check cache
    if (query.useCache !== false && this.options.enableCaching) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await this.database.readOne<T>(this.tableName, query);

    // Cache the result
    if (result && this.options.enableCaching) {
      this.setCache(cacheKey, result);
    }

    return result;
  }

  async findMany(query: RepositoryQueryOptions = {}): Promise<T[]> {
    const cacheKey = query.cacheKey || this.generateCacheKey('findMany', query);
    
    // Check cache
    if (query.useCache !== false && this.options.enableCaching) {
      const cached = this.getFromCache<T[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const results = await this.database.read<T>(this.tableName, query);

    // Cache the results
    if (this.options.enableCaching) {
      this.setCache(cacheKey, results);
    }

    await this.emitEvent('entities_found', { 
      table: this.tableName, 
      count: results.length, 
      query 
    });

    return results;
  }

  async create(data: Partial<T>): Promise<T> {
    // Validate data
    if (this.options.enableValidation) {
      this.validateData(data, 'create');
    }

    // Add timestamps
    if (this.options.autoTimestamps) {
      const now = new Date();
      (data as any).created_at = now;
      (data as any).updated_at = now;
    }

    const result = await this.database.create<T>(this.tableName, data);

    // Invalidate related cache entries
    if (this.options.enableCaching) {
      this.invalidateCache();
    }

    await this.emitEvent('entity_created', { table: this.tableName, data: result });
    return result;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    // Validate data
    if (this.options.enableValidation) {
      this.validateData(data, 'update');
    }

    // Add timestamp
    if (this.options.autoTimestamps) {
      (data as any).updated_at = new Date();
    }

    const result = await this.database.update<T>(this.tableName, id, data);

    // Invalidate cache
    if (this.options.enableCaching) {
      this.invalidateCache();
      this.cache.delete(`${this.tableName}:${id}`);
    }

    await this.emitEvent('entity_updated', { table: this.tableName, id, data: result });
    return result;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.database.delete(this.tableName, id);

    // Invalidate cache
    if (this.options.enableCaching) {
      this.invalidateCache();
      this.cache.delete(`${this.tableName}:${id}`);
    }

    await this.emitEvent('entity_deleted', { table: this.tableName, id, deleted: result });
    return result;
  }

  async count(query: RepositoryQueryOptions = {}): Promise<number> {
    return this.database.count(this.tableName, query);
  }

  async exists(query: RepositoryQueryOptions): Promise<boolean> {
    return this.database.exists(this.tableName, query);
  }

  // Advanced Query Methods
  async findByField(field: keyof T, value: any): Promise<T[]> {
    return this.findMany({
      where: [{ column: field as string, operator: 'eq', value }]
    });
  }

  async findOneByField(field: keyof T, value: any): Promise<T | null> {
    return this.findOne({
      where: [{ column: field as string, operator: 'eq', value }]
    });
  }

  async findByFields(conditions: Partial<T>): Promise<T[]> {
    const where: WhereCondition[] = Object.entries(conditions).map(([key, value]) => ({
      column: key,
      operator: 'eq' as const,
      value
    }));

    return this.findMany({ where });
  }

  async paginate(
    page: number,
    limit: number,
    query: RepositoryQueryOptions = {}
  ): Promise<{ data: T[]; total: number; page: number; limit: number; totalPages: number }> {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.findMany({ ...query, limit, offset }),
      this.count(query)
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Bulk Operations
  async createMany(items: Partial<T>[]): Promise<T[]> {
    // Validate all items
    if (this.options.enableValidation) {
      items.forEach(item => this.validateData(item, 'create'));
    }

    // Add timestamps
    if (this.options.autoTimestamps) {
      const now = new Date();
      items.forEach(item => {
        (item as any).created_at = now;
        (item as any).updated_at = now;
      });
    }

    const results = await this.database.createMany<T>(this.tableName, items);

    // Invalidate cache
    if (this.options.enableCaching) {
      this.invalidateCache();
    }

    await this.emitEvent('entities_created', { table: this.tableName, count: results.length });
    return results;
  }

  async updateMany(query: RepositoryQueryOptions, data: Partial<T>): Promise<T[]> {
    if (this.options.enableValidation) {
      this.validateData(data, 'update');
    }

    if (this.options.autoTimestamps) {
      (data as any).updated_at = new Date();
    }

    const results = await this.database.updateMany<T>(this.tableName, query, data);

    if (this.options.enableCaching) {
      this.invalidateCache();
    }

    await this.emitEvent('entities_updated', { table: this.tableName, count: results.length });
    return results;
  }

  async deleteMany(query: RepositoryQueryOptions): Promise<number> {
    const deletedCount = await this.database.deleteMany(this.tableName, query);

    if (this.options.enableCaching) {
      this.invalidateCache();
    }

    await this.emitEvent('entities_deleted', { table: this.tableName, count: deletedCount });
    return deletedCount;
  }

  // Validation
  addValidationRule(rule: ValidationRule<T>): void {
    this.validationRules.push(rule);
  }

  addValidationRules(rules: ValidationRule<T>[]): void {
    this.validationRules.push(...rules);
  }

  private validateData(data: Partial<T>, operation: 'create' | 'update'): void {
    for (const rule of this.validationRules) {
      const value = data[rule.field];
      
      // Required field check
      if (rule.required && operation === 'create' && (value === undefined || value === null)) {
        throw new Error(`Field '${String(rule.field)}' is required`);
      }

      // Skip validation for undefined/null optional fields
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      if (rule.type && typeof value !== rule.type) {
        throw new Error(`Field '${String(rule.field)}' must be of type ${rule.type}`);
      }

      // Min/Max validation for numbers and strings
      if (rule.min !== undefined) {
        if (typeof value === 'number' && value < rule.min) {
          throw new Error(`Field '${String(rule.field)}' must be at least ${rule.min}`);
        }
        if (typeof value === 'string' && value.length < rule.min) {
          throw new Error(`Field '${String(rule.field)}' must be at least ${rule.min} characters`);
        }
      }

      if (rule.max !== undefined) {
        if (typeof value === 'number' && value > rule.max) {
          throw new Error(`Field '${String(rule.field)}' must be at most ${rule.max}`);
        }
        if (typeof value === 'string' && value.length > rule.max) {
          throw new Error(`Field '${String(rule.field)}' must be at most ${rule.max} characters`);
        }
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        throw new Error(`Field '${String(rule.field)}' does not match required pattern`);
      }

      // Custom validation
      if (rule.custom) {
        const customResult = rule.custom(value);
        if (customResult !== true) {
          throw new Error(
            typeof customResult === 'string' 
              ? customResult 
              : `Field '${String(rule.field)}' failed custom validation`
          );
        }
      }
    }
  }

  // Cache Management
  private getFromCache<R>(key: string): R | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as R;
  }

  private setCache<R>(key: string, data: R): void {
    const expiresAt = new Date(Date.now() + this.options.cacheTimeout);
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      expiresAt
    });
  }

  private invalidateCache(): void {
    // Remove all cache entries for this table
    for (const [key] of this.cache) {
      if (key.startsWith(`${this.tableName}:`)) {
        this.cache.delete(key);
      }
    }
  }

  private generateCacheKey(operation: string, query: any): string {
    return `${this.tableName}:${operation}:${JSON.stringify(query)}`;
  }

  private async emitEvent(eventType: string, data: any): Promise<void> {
    if (this.eventService) {
      await this.eventService.broadcastEvent({
        type: 'query' as any,
        timestamp: new Date(),
        source: 'repository',
        data: {
          eventType,
          table: this.tableName,
          ...data
        }
      });
    }
  }

  // Utility Methods
  clearCache(): void {
    this.invalidateCache();
  }

  getCacheStats(): { size: number; entries: string[] } {
    const entries = Array.from(this.cache.keys())
      .filter(key => key.startsWith(`${this.tableName}:`));
    
    return {
      size: entries.length,
      entries
    };
  }

  getValidationRules(): ValidationRule<T>[] {
    return [...this.validationRules];
  }
}

/**
 * Factory function to create enhanced repositories
 */
export function createRepository<T extends { id?: string; created_at?: Date; updated_at?: Date }>(
  tableName: string,
  database: UnifiedDatabaseService,
  options?: RepositoryOptions
): EnhancedRepository<T> {
  return new EnhancedRepository<T>(tableName, database, options);
}