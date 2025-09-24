/**
 * Service Container - Dependency Injection Framework
 * Provides a comprehensive IoC container for managing service dependencies
 */

// Service Types and Tokens
export type ServiceToken<T = any> = symbol;
export type ServiceFactory<T> = (container: IServiceContainer) => T | Promise<T>;

export enum ServiceScope {
  Singleton = 'singleton',
  Transient = 'transient',
  Scoped = 'scoped'
}

export interface ServiceRegistration<T> {
  factory: ServiceFactory<T>;
  scope: ServiceScope;
  instance?: T;
  dependencies?: ServiceToken[];
}

export interface IServiceContainer {
  // Service Registration
  register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>, scope?: ServiceScope): void;
  registerSingleton<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void;
  registerTransient<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void;
  registerScoped<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void;
  
  // Service Resolution
  resolve<T>(token: ServiceToken<T>): T;
  resolveAll<T>(token: ServiceToken<T>): T[];
  tryResolve<T>(token: ServiceToken<T>): T | null;
  
  // Service Lifecycle
  dispose(): Promise<void>;
  isRegistered<T>(token: ServiceToken<T>): boolean;
  clearScope(): void;
}

export class ServiceContainer implements IServiceContainer {
  private registrations = new Map<ServiceToken, ServiceRegistration<any>>();
  private scopedInstances = new Map<ServiceToken, any>();
  private resolving = new Set<ServiceToken>();

  register<T>(
    token: ServiceToken<T>, 
    factory: ServiceFactory<T>, 
    scope: ServiceScope = ServiceScope.Transient
  ): void {
    this.registrations.set(token, {
      factory,
      scope,
      dependencies: this.extractDependencies(factory)
    });
  }

  registerSingleton<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void {
    this.register(token, factory, ServiceScope.Singleton);
  }

  registerTransient<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void {
    this.register(token, factory, ServiceScope.Transient);
  }

  registerScoped<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): void {
    this.register(token, factory, ServiceScope.Scoped);
  }

  resolve<T>(token: ServiceToken<T>): T {
    const result = this.tryResolve<T>(token);
    if (result === null) {
      throw new Error(`Service not registered: ${String(token)}`);
    }
    return result;
  }

  resolveAll<T>(token: ServiceToken<T>): T[] {
    const services: T[] = [];
    for (const [registeredToken] of this.registrations) {
      if (registeredToken === token) {
        const service = this.tryResolve<T>(registeredToken);
        if (service !== null) {
          services.push(service);
        }
      }
    }
    return services;
  }

  tryResolve<T>(token: ServiceToken<T>): T | null {
    const registration = this.registrations.get(token);
    if (!registration) {
      return null;
    }

    // Detect circular dependencies
    if (this.resolving.has(token)) {
      throw new Error(`Circular dependency detected for service: ${String(token)}`);
    }

    try {
      this.resolving.add(token);

      switch (registration.scope) {
        case ServiceScope.Singleton:
          return this.resolveSingleton(token, registration);
        case ServiceScope.Scoped:
          return this.resolveScoped(token, registration);
        case ServiceScope.Transient:
        default:
          return this.resolveTransient(registration);
      }
    } finally {
      this.resolving.delete(token);
    }
  }

  isRegistered<T>(token: ServiceToken<T>): boolean {
    return this.registrations.has(token);
  }

  clearScope(): void {
    this.scopedInstances.clear();
  }

  async dispose(): Promise<void> {
    // Dispose of all singleton instances
    for (const registration of this.registrations.values()) {
      if (registration.instance && typeof registration.instance.dispose === 'function') {
        await registration.instance.dispose();
      }
    }

    // Clear all scoped instances
    for (const instance of this.scopedInstances.values()) {
      if (instance && typeof instance.dispose === 'function') {
        await instance.dispose();
      }
    }

    this.registrations.clear();
    this.scopedInstances.clear();
    this.resolving.clear();
  }

  private resolveSingleton<T>(token: ServiceToken<T>, registration: ServiceRegistration<T>): T {
    if (!registration.instance) {
      registration.instance = this.createInstance(registration);
    }
    return registration.instance;
  }

  private resolveScoped<T>(token: ServiceToken<T>, registration: ServiceRegistration<T>): T {
    if (!this.scopedInstances.has(token)) {
      this.scopedInstances.set(token, this.createInstance(registration));
    }
    return this.scopedInstances.get(token);
  }

  private resolveTransient<T>(registration: ServiceRegistration<T>): T {
    return this.createInstance(registration);
  }

  private createInstance<T>(registration: ServiceRegistration<T>): T {
    const result = registration.factory(this);
    
    // Handle async factories
    if (result instanceof Promise) {
      throw new Error('Async service factories are not supported in synchronous resolution');
    }
    
    return result;
  }

  private extractDependencies(factory: ServiceFactory<any>): ServiceToken[] {
    // Simple dependency extraction - in a real implementation,
    // this could use reflection or metadata
    return [];
  }
}

// Service Tokens
export const SERVICE_TOKENS = {
  DATABASE: Symbol('IDatabase') as ServiceToken,
  GOVERNANCE_DATABASE: Symbol('IGovernanceDatabase') as ServiceToken,
  AUTH: Symbol('IAuth') as ServiceToken,
  STORAGE: Symbol('IStorage') as ServiceToken,
  REALTIME: Symbol('IRealtime') as ServiceToken,
  CONFIG: Symbol('IConfig') as ServiceToken,
} as const;

// Decorator for property injection
export function Inject(token: ServiceToken) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get: function() {
        // Access the global service container
        const container = ServiceRegistry.getInstance().getContainer();
        return container.resolve(token);
      },
      enumerable: true,
      configurable: true
    });
  };
}

// Global Service Registry
export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private container: IServiceContainer;

  private constructor() {
    this.container = new ServiceContainer();
  }

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  getContainer(): IServiceContainer {
    return this.container;
  }

  resolve<T>(token: ServiceToken<T>): T {
    return this.container.resolve(token);
  }

  async dispose(): Promise<void> {
    await this.container.dispose();
    ServiceRegistry.instance = null;
  }
}

// Utility function to get global container
export function getContainer(): IServiceContainer {
  return ServiceRegistry.getInstance().getContainer();
}

// Utility function to resolve services globally
export function resolve<T>(token: ServiceToken<T>): T {
  return ServiceRegistry.getInstance().resolve(token);
}
