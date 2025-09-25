import React, { useState } from 'react';
import { DollarSign, CreditCard, TrendingUp, BarChart3, Clock, AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { useCreditBalance } from '@/hooks/useCreditBalance';
import { CreditBalanceCard } from '@/components/UI/CreditBalanceCard';
import { MetricCard } from '@/components/UI/MetricCard';
import { cn } from '@/lib/utils';

export function CreditManagementPage() {
  const { balance, loading, error, refreshBalance } = useCreditBalance(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getSpendingTrend = () => {
    if (!balance) return { direction: 'stable', percentage: '0%' };
    
    const dailyRate = balance.dailySpent;
    const monthlyAverage = balance.monthlySpent / 30;
    
    if (dailyRate > monthlyAverage * 1.2) {
      return { direction: 'up', percentage: '+20%' };
    } else if (dailyRate < monthlyAverage * 0.8) {
      return { direction: 'down', percentage: '-15%' };
    }
    return { direction: 'stable', percentage: '0%' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading credit information...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="text-red-400 font-medium">Error Loading Credit Information</h3>
            <p className="text-red-300/80 text-sm mt-1">{error}</p>
            <button 
              onClick={handleRefresh}
              className="mt-3 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const spendingTrend = getSpendingTrend();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Credit Management</h1>
          <p className="text-slate-400">Manage your Ooumph Coin balance and transaction history</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
          >
            <div className="flex items-center space-x-2">
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
              <span>Refresh</span>
            </div>
          </button>
          
          <button className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600/50 transition-colors">
            <div className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Balance Card */}
      <CreditBalanceCard 
        showPurchaseButton={true} 
        showTransactions={false}
        className="col-span-full"
      />

      {/* Credit Metrics */}
      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Daily Spending"
            value={`${balance.dailySpent.toFixed(6)} OC`}
            target={`${balance.dailySpendLimit.toFixed(0)} OC`}
            icon={TrendingUp}
            trend={spendingTrend.direction as any}
            trendValue={spendingTrend.percentage}
            status={balance.dailySpent < balance.dailySpendLimit * 0.8 ? 'good' : 'warning'}
          />
          
          <MetricCard
            title="Monthly Spending"
            value={`${balance.monthlySpent.toFixed(6)} OC`}
            target={`${balance.monthlySpendLimit.toFixed(0)} OC`}
            icon={BarChart3}
            trend="stable"
            status={balance.monthlySpent < balance.monthlySpendLimit * 0.8 ? 'good' : 'warning'}
          />
          
          <MetricCard
            title="Account Tier"
            value={balance.billingTier.charAt(0).toUpperCase() + balance.billingTier.slice(1)}
            icon={CreditCard}
            status="good"
          />
          
          <MetricCard
            title="Auto Recharge"
            value={balance.autoRechargeEnabled ? 'Enabled' : 'Disabled'}
            target={balance.autoRechargeEnabled ? `${balance.autoRechargeAmount.toFixed(0)} OC` : undefined}
            icon={RefreshCw}
            status={balance.autoRechargeEnabled ? 'good' : 'warning'}
          />
        </div>
      )}

      {/* Spending Limits */}
      {balance && (
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Spending Limits & Usage</h3>
            <BarChart3 className="w-5 h-5 text-cyan-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Usage */}
            <div className="space-y-4">
              <h4 className="text-white font-medium">Daily Usage</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Spent Today</span>
                  <span className="text-white">{balance.dailySpent.toFixed(6)} OC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Daily Limit</span>
                  <span className="text-white">{balance.dailySpendLimit.toFixed(0)} OC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Remaining</span>
                  <span className={cn(
                    'font-medium',
                    balance.dailyRemaining > 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {balance.dailyRemaining.toFixed(6)} OC
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div 
                    className={cn(
                      'h-2 rounded-full transition-all duration-300',
                      balance.dailySpent / balance.dailySpendLimit > 0.8 
                        ? 'bg-red-500' 
                        : balance.dailySpent / balance.dailySpendLimit > 0.6
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    )}
                    style={{ 
                      width: `${Math.min((balance.dailySpent / balance.dailySpendLimit) * 100, 100)}%` 
                    }}
                  />
                </div>
                <div className="text-xs text-slate-400">
                  {((balance.dailySpent / balance.dailySpendLimit) * 100).toFixed(1)}% of daily limit used
                </div>
              </div>
            </div>

            {/* Monthly Usage */}
            <div className="space-y-4">
              <h4 className="text-white font-medium">Monthly Usage</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Spent This Month</span>
                  <span className="text-white">{balance.monthlySpent.toFixed(6)} OC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Monthly Limit</span>
                  <span className="text-white">{balance.monthlySpendLimit.toFixed(0)} OC</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Remaining</span>
                  <span className={cn(
                    'font-medium',
                    balance.monthlyRemaining > 0 ? 'text-green-400' : 'text-red-400'
                  )}>
                    {balance.monthlyRemaining.toFixed(6)} OC
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div 
                    className={cn(
                      'h-2 rounded-full transition-all duration-300',
                      balance.monthlySpent / balance.monthlySpendLimit > 0.8 
                        ? 'bg-red-500' 
                        : balance.monthlySpent / balance.monthlySpendLimit > 0.6
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    )}
                    style={{ 
                      width: `${Math.min((balance.monthlySpent / balance.monthlySpendLimit) * 100, 100)}%` 
                    }}
                  />
                </div>
                <div className="text-xs text-slate-400">
                  {((balance.monthlySpent / balance.monthlySpendLimit) * 100).toFixed(1)}% of monthly limit used
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History */}
      {balance && balance.recentTransactions && balance.recentTransactions.length > 0 && (
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Recent Transactions</h3>
            <Clock className="w-5 h-5 text-cyan-400" />
          </div>

          <div className="space-y-3">
            {balance.recentTransactions.map((transaction, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    'w-3 h-3 rounded-full',
                    transaction.transaction_type === 'credit' || transaction.transaction_type === 'purchase' || transaction.transaction_type === 'bonus'
                      ? 'bg-green-400'
                      : transaction.transaction_type === 'workflow_cost' || transaction.transaction_type === 'debit'
                      ? 'bg-red-400'
                      : 'bg-cyan-400'
                  )} />
                  
                  <div>
                    <h4 className="text-white font-medium">
                      {transaction.description || transaction.transaction_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-slate-400">
                      <span>{new Date(transaction.created_at).toLocaleString()}</span>
                      <span>Status: {transaction.status}</span>
                      {transaction.workflow_name && (
                        <span>Workflow: {transaction.workflow_name}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={cn(
                    'text-lg font-semibold',
                    transaction.transaction_type === 'credit' || transaction.transaction_type === 'purchase' || transaction.transaction_type === 'bonus'
                      ? 'text-green-400'
                      : 'text-red-400'
                  )}>
                    {transaction.transaction_type === 'credit' || transaction.transaction_type === 'purchase' || transaction.transaction_type === 'bonus' 
                      ? '+' : '-'}{transaction.amount.toFixed(6)} OC
                  </div>
                  <div className="text-sm text-slate-400">
                    Balance: {transaction.balance_after.toFixed(6)} OC
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account Settings */}
      {balance && (
        <div className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Account Settings</h3>
            <CreditCard className="w-5 h-5 text-cyan-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-white font-medium">Auto Recharge Settings</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Auto Recharge</span>
                  <span className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    balance.autoRechargeEnabled 
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  )}>
                    {balance.autoRechargeEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                
                {balance.autoRechargeEnabled && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Recharge Amount</span>
                      <span className="text-white">{balance.autoRechargeAmount.toFixed(0)} OC</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Trigger Threshold</span>
                      <span className="text-white">{balance.autoRechargeThreshold.toFixed(0)} OC</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-white font-medium">Account Information</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Account Status</span>
                  <span className="text-green-400">{balance.accountStatus}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Billing Tier</span>
                  <span className="text-white">{balance.billingTier}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Discount Rate</span>
                  <span className="text-white">{(balance.discountRate * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Member Since</span>
                  <span className="text-white">{new Date(balance.accountCreatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}