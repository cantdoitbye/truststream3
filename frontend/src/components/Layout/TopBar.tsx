import React from 'react';
import { Bell, User, Search, Zap, Shield, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import { useCreditBalance } from '@/hooks/useCreditBalance';

export function TopBar() {
  const { user, signOut } = useAuth();
  const { systemStatus } = useSystemStatus();
  const { balance } = useCreditBalance();

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-cyan-500/20 p-4">
      <div className="flex items-center justify-between">
        {/* System metrics */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-slate-300">Response Time:</span>
            <span className="text-sm font-mono text-cyan-400">
              {systemStatus?.system_metrics.performance_summary.api_response_time || '--'}ms
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-sm text-slate-300">Security:</span>
            <span className="text-sm font-mono text-green-400">100%</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-sm text-slate-300">AI Agents:</span>
            <span className="text-sm font-mono text-cyan-400">
              {systemStatus?.ai_governance.active_agents || '--'}/5 Active
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="text-sm text-slate-300">Balance:</span>
            <span className="text-sm font-mono text-green-400">
              {balance ? `${balance.currentBalance.toFixed(6)} OC` : '--'}
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search TrustStram..."
              className="bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors">
            <Bell className="w-5 h-5 text-slate-300" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
          </button>

          {/* User menu */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm font-medium text-white">
                {user?.email?.split('@')[0] || 'Enterprise User'}
              </div>
              <div className="text-xs text-slate-400">System Administrator</div>
            </div>
            
            <div className="relative group">
              <button className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </button>
              
              {/* Dropdown menu */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-2">
                  <button className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded">
                    Profile Settings
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded">
                    API Keys
                  </button>
                  <hr className="my-2 border-slate-700" />
                  <button 
                    onClick={() => signOut()}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-700 rounded"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}