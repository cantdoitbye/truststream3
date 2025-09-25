import React from 'react';
import { Brain, Users, Heart, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustDimensions {
  iq_score: number;
  appeal_score: number;
  social_score: number;
  humanity_score: number;
  overall_trust_score: number;
}

interface TrustScoreVisualizerProps {
  trustScore: number;
  dimensions: TrustDimensions;
}

export function TrustScoreVisualizer({ trustScore, dimensions }: TrustScoreVisualizerProps) {
  const scoreDimensions = [
    {
      name: 'IQ Score',
      value: dimensions.iq_score,
      icon: Brain,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      description: 'Intelligence & Reasoning'
    },
    {
      name: 'Appeal Score',
      value: dimensions.appeal_score,
      icon: Heart,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/20',
      description: 'User Experience & Satisfaction'
    },
    {
      name: 'Social Score',
      value: dimensions.social_score,
      icon: Users,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      description: 'Community & Collaboration'
    },
    {
      name: 'Humanity Score',
      value: dimensions.humanity_score,
      icon: Lightbulb,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      description: 'Ethics & Human Values'
    }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-400';
    if (score >= 0.8) return 'text-yellow-400';
    if (score >= 0.7) return 'text-orange-400';
    return 'text-red-400';
  };

  const getProgressColor = (score: number) => {
    if (score >= 0.9) return 'bg-green-500';
    if (score >= 0.8) return 'bg-yellow-500';
    if (score >= 0.7) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">4D Trust Scoring System</h3>
        <p className="text-slate-400 text-sm">Comprehensive AI trustworthiness assessment</p>
      </div>

      {/* Overall Trust Score */}
      <div className="text-center mb-8">
        <div className="relative w-32 h-32 mx-auto mb-4">
          {/* Circular progress */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-slate-700"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - trustScore)}`}
              className="text-cyan-400 transition-all duration-1000 ease-out"
            />
          </svg>
          
          {/* Score display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={cn('text-2xl font-bold', getScoreColor(trustScore))}>
                {(trustScore * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-400">Trust Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dimension Scores */}
      <div className="space-y-4">
        {scoreDimensions.map((dimension, index) => {
          const Icon = dimension.icon;
          const percentage = dimension.value * 100;
          
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={cn('p-2 rounded-lg', dimension.bgColor)}>
                    <Icon className={cn('w-4 h-4', dimension.color)} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{dimension.name}</div>
                    <div className="text-xs text-slate-400">{dimension.description}</div>
                  </div>
                </div>
                
                <div className={cn('text-sm font-bold', getScoreColor(dimension.value))}>
                  {percentage.toFixed(1)}%
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className={cn(
                    'h-2 rounded-full transition-all duration-1000 ease-out',
                    getProgressColor(dimension.value)
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust Score Interpretation */}
      <div className="mt-6 p-4 bg-slate-800/30 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full" />
          <span className="text-sm font-medium text-white">Trust Assessment</span>
        </div>
        
        <p className="text-xs text-slate-400">
          {trustScore >= 0.9 ? 'Exceptional trust level with outstanding performance across all dimensions.' :
           trustScore >= 0.8 ? 'High trust level with strong performance in most dimensions.' :
           trustScore >= 0.7 ? 'Good trust level with room for improvement in some areas.' :
           'Trust level requires attention and improvement across multiple dimensions.'}
        </p>
      </div>
    </div>
  );
}