import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { TopBar } from './TopBar';

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Futuristic background effects */}
      <div className="fixed inset-0 z-0">
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        
        {/* Circuit lines */}
        <div className="absolute inset-0">
          <svg className="w-full h-full opacity-5" viewBox="0 0 100 100">
            <defs>
              <pattern id="circuit" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M0,5 L10,5 M5,0 L5,10" stroke="currentColor" strokeWidth="0.5" className="text-cyan-400" />
                <circle cx="5" cy="5" r="1" fill="currentColor" className="text-cyan-400" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#circuit)" />
          </svg>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex">
        <Navigation />
        
        <div className="flex-1 flex flex-col min-h-screen">
          <TopBar />
          
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}