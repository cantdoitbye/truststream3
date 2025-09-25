import React from 'react';
import { Settings, User, Key, Bell, Monitor } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Configure your TrustStram v4.4 platform preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-6">
            <User className="w-6 h-6 text-cyan-400" />
            <h3 className="text-xl font-semibold text-white">Profile Settings</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <input 
                type="text" 
                defaultValue="Enterprise Administrator"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input 
                type="email" 
                defaultValue="admin@truststream.enterprise"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
              <select className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500">
                <option>System Administrator</option>
                <option>AI Engineer</option>
                <option>Security Officer</option>
                <option>Compliance Manager</option>
              </select>
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Key className="w-6 h-6 text-cyan-400" />
            <h3 className="text-xl font-semibold text-white">API Keys</h3>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/30 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-medium">Production API Key</span>
                <span className="text-green-400 text-xs">Active</span>
              </div>
              <code className="text-xs text-slate-400 font-mono">tstr_prod_••••••••••••••••••••••••••••••••</code>
            </div>
            
            <div className="p-4 bg-slate-800/30 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-medium">Development API Key</span>
                <span className="text-yellow-400 text-xs">Staging</span>
              </div>
              <code className="text-xs text-slate-400 font-mono">tstr_dev_••••••••••••••••••••••••••••••••</code>
            </div>
            
            <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 px-4 rounded-lg transition-colors">
              Generate New Key
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Bell className="w-6 h-6 text-cyan-400" />
            <h3 className="text-xl font-semibold text-white">Notifications</h3>
          </div>
          
          <div className="space-y-4">
            {[
              { name: 'System Alerts', enabled: true },
              { name: 'Performance Warnings', enabled: true },
              { name: 'Security Events', enabled: true },
              { name: 'Compliance Updates', enabled: false },
              { name: 'AI Agent Status', enabled: true }
            ].map((setting, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-slate-300">{setting.name}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={setting.enabled} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* System Preferences */}
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Monitor className="w-6 h-6 text-cyan-400" />
            <h3 className="text-xl font-semibold text-white">System Preferences</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Dashboard Theme</label>
              <select className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500">
                <option>Dark (Quantum Blue)</option>
                <option>Dark (Cyber Purple)</option>
                <option>Dark (Matrix Green)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Auto-refresh Interval</label>
              <select className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500">
                <option>30 seconds</option>
                <option>1 minute</option>
                <option>5 minutes</option>
                <option>Manual</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}