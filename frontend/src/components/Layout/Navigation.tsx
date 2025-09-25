import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Brain, 
  Network, 
  Shield, 
  Cloud, 
  Search,
  Settings,
  Users,
  Activity,
  Lock,
  Upload,
  Layers,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    name: 'System Overview',
    href: '/',
    icon: LayoutDashboard,
    description: 'Real-time system health and performance'
  },
  {
    name: 'Workflow Upload',
    href: '/workflow-upload',
    icon: Upload,
    description: 'Upload and deploy n8n workflows'
  },
  {
    name: 'Workflow Management',
    href: '/workflow-management',
    icon: Layers,
    description: 'Manage deployed AI agents'
  },
  {
    name: 'Credit Management',
    href: '/credit-management',
    icon: DollarSign,
    description: 'Ooumph Coin balance and transactions'
  },
  {
    name: 'AI Governance',
    href: '/ai-governance',
    icon: Brain,
    description: '5 AI Leader Agents monitoring'
  },
  {
    name: 'Federated Learning',
    href: '/federated-learning',
    icon: Network,
    description: 'Distributed ML training across clients'
  },
  {
    name: 'AI Explainability',
    href: '/explainability',
    icon: Search,
    description: 'Model transparency and bias auditing'
  },
  {
    name: 'Multi-Cloud',
    href: '/multi-cloud',
    icon: Cloud,
    description: 'AWS, Azure, GCP orchestration'
  },
  {
    name: 'Quantum Encryption',
    href: '/quantum',
    icon: Shield,
    description: 'Post-quantum cryptography operations'
  },
  {
    name: 'Compliance',
    href: '/compliance',
    icon: Lock,
    description: 'GDPR, EU AI Act, ISO 27001 status'
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Platform configuration'
  }
];

export function Navigation() {
  const location = useLocation();

  return (
    <nav className="w-72 bg-slate-900/95 backdrop-blur-sm border-r border-cyan-500/20 min-h-screen">
      {/* Header */}
      <div className="p-6 border-b border-cyan-500/20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">TrustStram</h1>
            <p className="text-xs text-cyan-400 font-mono">v4.5 Enterprise</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 relative overflow-hidden',
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-100 border border-cyan-500/30'
                    : 'text-slate-300 hover:text-cyan-100 hover:bg-slate-800/50'
                )}
              >
                {/* Glow effect for active item */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg blur-sm" />
                )}
                
                <Icon className={cn(
                  'w-5 h-5 mr-3 transition-colors relative z-10',
                  isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-400'
                )} />
                
                <div className="relative z-10">
                  <div className={cn(
                    'font-medium',
                    isActive ? 'text-cyan-100' : 'text-slate-300 group-hover:text-cyan-100'
                  )}>
                    {item.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {item.description}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-cyan-500/20">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">System Status</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 font-mono">OPERATIONAL</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            99.99% Uptime • Quantum-Ready
          </div>
        </div>
      </div>
    </nav>
  );
}