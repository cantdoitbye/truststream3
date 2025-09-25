import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface CreditBalance {
  userId: string;
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
  totalPurchased: number;
  accountStatus: string;
  billingTier: string;
  dailySpendLimit: number;
  monthlySpendLimit: number;
  lowBalanceThreshold: number;
  dailySpent: number;
  monthlySpent: number;
  dailyRemaining: number;
  monthlyRemaining: number;
  autoRechargeEnabled: boolean;
  autoRechargeAmount: number;
  autoRechargeThreshold: number;
  isLowBalance: boolean;
  canSpendMore: boolean;
  needsAutoRecharge: boolean;
  discountRate: number;
  preferences: any;
  lastTransactionAt: string | null;
  accountCreatedAt: string;
  lastUpdatedAt: string;
  recentTransactions?: any[];
}

interface UseCreditBalanceResult {
  balance: CreditBalance | null;
  loading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
  purchaseCredits: (amount: number, paymentMethod: string) => Promise<boolean>;
}

export function useCreditBalance(includeTransactions = false): UseCreditBalanceResult {
  const { user } = useAuth();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    if (!user) {
      setBalance(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      const { data, error: supabaseError } = await supabase.functions.invoke('balance-check', {
        method: 'POST',
        body: {
          includeTransactions: includeTransactions,
          includeUsage: false,
          transactionLimit: 10
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (data?.success !== false) {
        // The balance-check function returns data directly, not wrapped in success/data
        setBalance(data);
      } else {
        throw new Error(data?.error?.message || 'Failed to fetch balance');
      }
    } catch (err) {
      console.error('Error fetching credit balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    setLoading(true);
    await fetchBalance();
  };

  const purchaseCredits = async (amount: number, paymentMethod: string): Promise<boolean> => {
    try {
      setError(null);
      
      const { data, error: supabaseError } = await supabase.functions.invoke('credit-purchase', {
        body: {
          purchaseType: 'manual',
          creditAmount: amount,
          fiatAmount: amount * 0.01, // Assuming 1 OC = $0.01
          currency: 'USD',
          paymentMethod: paymentMethod,
          paymentProcessor: 'stripe'
        }
      });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (data?.success) {
        await refreshBalance(); // Refresh balance after purchase
        return true;
      } else {
        throw new Error(data?.error?.message || 'Purchase failed');
      }
    } catch (err) {
      console.error('Error purchasing credits:', err);
      setError(err instanceof Error ? err.message : 'Purchase failed');
      return false;
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [user]);

  return {
    balance,
    loading,
    error,
    refreshBalance,
    purchaseCredits
  };
}