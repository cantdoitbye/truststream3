import React, { useState } from 'react';
import { DollarSign, CreditCard, AlertTriangle, TrendingUp, RefreshCw, Plus } from 'lucide-react';
import { useCreditBalance } from '@/hooks/useCreditBalance';
import { cn } from '@/lib/utils';

interface CreditBalanceCardProps {
  showPurchaseButton?: boolean;
  showTransactions?: boolean;
  className?: string;
}

export function CreditBalanceCard({ 
  showPurchaseButton = true, 
  showTransactions = false,
  className 
}: CreditBalanceCardProps) {
  const { balance, loading, error, refreshBalance, purchaseCredits } = useCreditBalance(showTransactions);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  };

  const handlePurchase = async () => {
    const amount = parseFloat(purchaseAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setPurchasing(true);
    const success = await purchaseCredits(amount, 'stripe');
    setPurchasing(false);
    
    if (success) {
      setShowPurchaseForm(false);
      setPurchaseAmount('');
      alert('Credits purchased successfully!');
    }
  };

  const formatBalance = (amount: number) => {
    return amount.toFixed(6);
  };

  const getBalanceStatus = () => {
    if (!balance) return 'unknown';
    if (balance.isLowBalance) return 'low';
    if (balance.currentBalance > balance.lowBalanceThreshold * 2) return 'good';
    return 'medium';
  };

  const getStatusColor = () => {
    const status = getBalanceStatus();
    switch (status) {
      case 'good': return 'text-green-400 border-green-500/30 bg-green-500/10';
      case 'medium': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      case 'low': return 'text-red-400 border-red-500/30 bg-red-500/10';
      default: return 'text-slate-400 border-slate-700/50 bg-slate-900/50';
    }
  };

  if (loading) {
    return (
      <div className={cn('backdrop-blur border rounded-xl p-6 border-slate-700/50 bg-slate-900/50', className)}>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">Loading balance...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('backdrop-blur border rounded-xl p-6 border-red-500/30 bg-red-500/10', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <h3 className="text-red-400 font-medium">Balance Error</h3>
              <p className="text-red-300/80 text-sm">{error}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>
    );
  }

  if (!balance) return null;

  return (
    <div className={cn('backdrop-blur border rounded-xl p-6 relative overflow-hidden', getStatusColor(), className)}>
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-8 h-8 text-cyan-400" />
            <div>
              <h3 className="text-white font-semibold">Ooumph Coin Balance</h3>
              <p className="text-slate-400 text-sm">Tier: {balance.billingTier}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-slate-800/50 text-slate-400 rounded-lg hover:text-cyan-400 transition-colors disabled:opacity-50"
              title="Refresh Balance"
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </button>
            
            {showPurchaseButton && (
              <button
                onClick={() => setShowPurchaseForm(!showPurchaseForm)}
                className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
                title="Purchase Credits"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Main Balance */}
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-white">{formatBalance(balance.currentBalance)}</span>
              <span className="text-cyan-400 font-medium">OC</span>
            </div>
            
            {balance.isLowBalance && (
              <div className="flex items-center space-x-2 mt-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">Low balance warning</span>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Daily Spent:</span>
              <div className="text-white">
                {formatBalance(balance.dailySpent)} / {formatBalance(balance.dailySpendLimit)} OC
              </div>
            </div>
            <div>
              <span className="text-slate-400">Monthly Spent:</span>
              <div className="text-white">
                {formatBalance(balance.monthlySpent)} / {formatBalance(balance.monthlySpendLimit)} OC
              </div>
            </div>
          </div>

          {/* Lifetime Stats */}
          <div className="grid grid-cols-3 gap-4 text-sm pt-4 border-t border-slate-700">
            <div>
              <span className="text-slate-400">Total Earned:</span>
              <div className="text-green-400">{formatBalance(balance.totalEarned)} OC</div>
            </div>
            <div>
              <span className="text-slate-400">Total Spent:</span>
              <div className="text-red-400">{formatBalance(balance.totalSpent)} OC</div>
            </div>
            <div>
              <span className="text-slate-400">Total Purchased:</span>
              <div className="text-cyan-400">{formatBalance(balance.totalPurchased)} OC</div>
            </div>
          </div>
        </div>

        {/* Purchase Form */}
        {showPurchaseForm && (
          <div className="mt-6 pt-6 border-t border-slate-700">
            <h4 className="text-white font-medium mb-4">Purchase Ooumph Coins</h4>
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-sm">Amount (OC)</label>
                <input
                  type="number"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  step="0.000001"
                  className="w-full mt-1 px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
                {purchaseAmount && (
                  <p className="text-slate-400 text-xs mt-1">
                    Estimated cost: ${(parseFloat(purchaseAmount) * 0.01).toFixed(2)} USD
                  </p>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handlePurchase}
                  disabled={purchasing || !purchaseAmount}
                  className="flex-1 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purchasing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Purchase</span>
                    </div>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setShowPurchaseForm(false);
                    setPurchaseAmount('');
                  }}
                  className="px-4 py-2 bg-slate-800/50 text-slate-400 rounded-lg hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        {showTransactions && balance.recentTransactions && balance.recentTransactions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-700">
            <h4 className="text-white font-medium mb-4">Recent Transactions</h4>
            <div className="space-y-2">
              {balance.recentTransactions.slice(0, 5).map((transaction, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-slate-800/30 rounded">
                  <div>
                    <span className="text-white text-sm">{transaction.description || transaction.transaction_type}</span>
                    <div className="text-slate-400 text-xs">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={cn(
                    'text-sm font-medium',
                    transaction.transaction_type === 'credit' || transaction.transaction_type === 'purchase' || transaction.transaction_type === 'bonus'
                      ? 'text-green-400'
                      : 'text-red-400'
                  )}>
                    {transaction.transaction_type === 'credit' || transaction.transaction_type === 'purchase' || transaction.transaction_type === 'bonus' 
                      ? '+' : '-'}{formatBalance(transaction.amount)} OC
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}