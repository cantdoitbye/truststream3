import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  target?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  status?: 'good' | 'warning' | 'critical';
  className?: string;
}

export function MetricCard({
  title,
  value,
  target,
  icon: Icon,
  trend = 'stable',
  trendValue,
  status = 'good',
  className
}: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'good':
        return 'border-green-500/30 bg-green-500/5';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/5';
      case 'critical':
        return 'border-red-500/30 bg-red-500/5';
      default:
        return 'border-slate-700/50 bg-slate-900/50';
    }
  };

  const getIconColor = () => {
    switch (status) {
      case 'good':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-cyan-400';
    }
  };

  return (
    <div className={cn(
      'backdrop-blur border rounded-xl p-6 relative overflow-hidden',
      getStatusColor(),
      className
    )}>
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <Icon className={cn('w-8 h-8', getIconColor())} />
          
          {trendValue && (
            <div className={cn('flex items-center space-x-1 text-xs', getTrendColor())}>
              {getTrendIcon()}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-slate-300 text-sm font-medium">{title}</h3>
          
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{value}</span>
            {target && (
              <span className="text-xs text-slate-500">target {target}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}