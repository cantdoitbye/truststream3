import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Fix for Recharts TypeScript compatibility
const BarFixed = Bar as any;
const LineFixed = Line as any;
const XAxisFixed = XAxis as any;
const YAxisFixed = YAxis as any;
const TooltipFixed = Tooltip as any;
const ResponsiveContainerFixed = ResponsiveContainer as any;
const LineChartFixed = LineChart as any;
const BarChartFixed = BarChart as any;
const CartesianGridFixed = CartesianGrid as any;

interface Metric {
  metric_name: string;
  metric_value: number;
  metric_unit: string;
  tags: Record<string, any>;
}

interface PerformanceChartProps {
  metrics: Metric[];
}

export function PerformanceChart({ metrics }: PerformanceChartProps) {
  // Generate mock time series data for demonstration
  const generateTimeSeriesData = () => {
    const now = new Date();
    const data = [];
    
    for (let i = 11; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000); // 5-minute intervals
      data.push({
        time: time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        response_time: 25 + Math.random() * 10,
        throughput: 48000 + Math.random() * 8000,
        success_rate: 85 + Math.random() * 10,
        uptime: 99.95 + Math.random() * 0.1
      });
    }
    
    return data;
  };

  const timeSeriesData = generateTimeSeriesData();
  
  // Prepare metrics data for bar chart
  const metricsData = metrics.slice(0, 6).map(metric => ({
    name: metric.metric_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: metric.metric_value,
    target: metric.tags?.target || 0,
    unit: metric.metric_unit
  }));

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-slate-300 text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-cyan-400 text-sm">
              {entry.name}: {entry.value.toFixed(2)}
              {entry.name === 'Response Time' && 'ms'}
              {entry.name === 'Throughput' && ' RPS'}
              {entry.name === 'Success Rate' && '%'}
              {entry.name === 'Uptime' && '%'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Real-time performance trends */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-4">Real-time Performance (Last Hour)</h4>
        <div className="h-64">
          <ResponsiveContainerFixed width="100%" height="100%">
            <LineChartFixed data={timeSeriesData}>
              <CartesianGridFixed strokeDasharray="3 3" stroke="#334155" />
              <XAxisFixed 
                dataKey="time" 
                stroke="#64748b"
                fontSize={10}
              />
              <YAxisFixed 
                stroke="#64748b"
                fontSize={10}
              />
              <TooltipFixed content={customTooltip} />
              <LineFixed 
                type="monotone" 
                dataKey="response_time" 
                stroke="#06b6d4" 
                strokeWidth={2}
                dot={false}
                name="Response Time"
              />
              <LineFixed 
                type="monotone" 
                dataKey="success_rate" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={false}
                name="Success Rate"
              />
            </LineChartFixed>
          </ResponsiveContainerFixed>
        </div>
      </div>

      {/* Current metrics comparison */}
      <div>
        <h4 className="text-sm font-medium text-slate-300 mb-4">Current vs Target Performance</h4>
        <div className="h-48">
          <ResponsiveContainerFixed width="100%" height="100%">
            <BarChartFixed data={metricsData} layout="horizontal">
              <CartesianGridFixed strokeDasharray="3 3" stroke="#334155" />
              <XAxisFixed 
                type="number" 
                stroke="#64748b"
                fontSize={10}
              />
              <YAxisFixed 
                type="category" 
                dataKey="name" 
                stroke="#64748b"
                fontSize={10}
                width={100}
              />
              <TooltipFixed content={customTooltip} />
              <BarFixed 
                dataKey="value" 
                fill="#06b6d4" 
                radius={[0, 4, 4, 0]}
                name="Current"
              />
              <BarFixed 
                dataKey="target" 
                fill="#374151" 
                radius={[0, 4, 4, 0]}
                name="Target"
              />
            </BarChartFixed>
          </ResponsiveContainerFixed>
        </div>
      </div>
    </div>
  );
}