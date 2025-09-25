// Ooumph Coin Balance Check Edge Function
// Provides comprehensive credit balance and account information

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET and POST methods are allowed' } }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        // Parse request parameters
        let includeTransactions = false;
        let includeUsage = false;
        let transactionLimit = 10;
        
        if (req.method === 'POST') {
            const body = await req.json();
            includeTransactions = body.includeTransactions || false;
            includeUsage = body.includeUsage || false;
            transactionLimit = Math.min(body.transactionLimit || 10, 100); // Cap at 100
        } else {
            const url = new URL(req.url);
            includeTransactions = url.searchParams.get('includeTransactions') === 'true';
            includeUsage = url.searchParams.get('includeUsage') === 'true';
            transactionLimit = Math.min(parseInt(url.searchParams.get('transactionLimit') || '10'), 100);
        }

        // Get environment variables
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        // Get user from auth header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('Authorization header is required');
        }

        const token = authHeader.replace('Bearer ', '');
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Invalid or expired token');
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        console.log('Balance check for user:', userId);

        // Fetch user credits
        const creditsResponse = await fetch(
            `${supabaseUrl}/rest/v1/user_credits?user_id=eq.${userId}&select=*`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!creditsResponse.ok) {
            throw new Error('Failed to fetch user credits');
        }

        const creditsData = await creditsResponse.json();
        
        // If no credits record exists, create one
        let userCredit;
        if (!creditsData || creditsData.length === 0) {
            const createResponse = await fetch(
                `${supabaseUrl}/rest/v1/user_credits`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        current_balance: 0,
                        status: 'active'
                    })
                }
            );

            if (!createResponse.ok) {
                throw new Error('Failed to create user credits account');
            }

            const newCreditsData = await createResponse.json();
            userCredit = newCreditsData[0];
        } else {
            userCredit = creditsData[0];
        }

        // Calculate daily spending
        const today = new Date().toISOString().split('T')[0];
        const dailySpendResponse = await fetch(
            `${supabaseUrl}/rest/v1/credit_transactions?user_id=eq.${userId}&created_at=gte.${today}T00:00:00Z&transaction_type=in.(workflow_cost,debit)&select=amount`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        let dailySpent = 0;
        if (dailySpendResponse.ok) {
            const dailyTransactions = await dailySpendResponse.json();
            dailySpent = dailyTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
        }

        // Calculate monthly spending
        const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        const monthlySpendResponse = await fetch(
            `${supabaseUrl}/rest/v1/credit_transactions?user_id=eq.${userId}&created_at=gte.${thisMonth}-01T00:00:00Z&transaction_type=in.(workflow_cost,debit)&select=amount`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        let monthlySpent = 0;
        if (monthlySpendResponse.ok) {
            const monthlyTransactions = await monthlySpendResponse.json();
            monthlySpent = monthlyTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
        }

        // Base response data
        const balanceData = {
            userId: userId,
            currentBalance: parseFloat(userCredit.current_balance),
            totalEarned: parseFloat(userCredit.total_earned),
            totalSpent: parseFloat(userCredit.total_spent),
            totalPurchased: parseFloat(userCredit.total_purchased),
            accountStatus: userCredit.status,
            billingTier: userCredit.billing_tier,
            
            // Limits and thresholds
            dailySpendLimit: parseFloat(userCredit.daily_spend_limit),
            monthlySpendLimit: parseFloat(userCredit.monthly_spend_limit),
            lowBalanceThreshold: parseFloat(userCredit.low_balance_threshold),
            
            // Current period spending
            dailySpent: dailySpent,
            monthlySpent: monthlySpent,
            dailyRemaining: parseFloat(userCredit.daily_spend_limit) - dailySpent,
            monthlyRemaining: parseFloat(userCredit.monthly_spend_limit) - monthlySpent,
            
            // Auto-recharge settings
            autoRechargeEnabled: userCredit.auto_recharge_enabled,
            autoRechargeAmount: parseFloat(userCredit.auto_recharge_amount || 0),
            autoRechargeThreshold: parseFloat(userCredit.auto_recharge_threshold || 0),
            
            // Status flags
            isLowBalance: parseFloat(userCredit.current_balance) <= parseFloat(userCredit.low_balance_threshold),
            canSpendMore: dailySpent < parseFloat(userCredit.daily_spend_limit),
            needsAutoRecharge: userCredit.auto_recharge_enabled && 
                              parseFloat(userCredit.current_balance) <= parseFloat(userCredit.auto_recharge_threshold || 0),
            
            // Account metadata
            discountRate: parseFloat(userCredit.discount_rate || 0),
            preferences: userCredit.preferences || {},
            
            // Timestamps
            lastTransactionAt: userCredit.last_transaction_at,
            accountCreatedAt: userCredit.created_at,
            lastUpdatedAt: userCredit.updated_at
        };

        // Add recent transactions if requested
        if (includeTransactions) {
            const transactionsResponse = await fetch(
                `${supabaseUrl}/rest/v1/credit_transactions?user_id=eq.${userId}&order=created_at.desc&limit=${transactionLimit}&select=*`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (transactionsResponse.ok) {
                const transactions = await transactionsResponse.json();
                balanceData.recentTransactions = transactions;
            } else {
                balanceData.recentTransactions = [];
            }
        }

        // Add usage statistics if requested
        if (includeUsage) {
            const usageStatsResponse = await fetch(
                `${supabaseUrl}/rest/v1/usage_tracking?user_id=eq.${userId}&order=created_at.desc&limit=10&select=workflow_name,actual_cost,execution_status,created_at,execution_time_seconds`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (usageStatsResponse.ok) {
                const usageStats = await usageStatsResponse.json();
                
                // Calculate usage summary
                const completedRuns = usageStats.filter(u => u.execution_status === 'completed');
                const totalRuns = usageStats.length;
                const averageCost = completedRuns.length > 0 ? 
                    completedRuns.reduce((sum, u) => sum + parseFloat(u.actual_cost || 0), 0) / completedRuns.length : 0;
                const averageExecutionTime = completedRuns.length > 0 ?
                    completedRuns.reduce((sum, u) => sum + parseInt(u.execution_time_seconds || 0), 0) / completedRuns.length : 0;

                balanceData.usageStatistics = {
                    totalRuns: totalRuns,
                    completedRuns: completedRuns.length,
                    successRate: totalRuns > 0 ? (completedRuns.length / totalRuns) : 0,
                    averageCostPerRun: averageCost,
                    averageExecutionTimeSeconds: averageExecutionTime,
                    recentUsage: usageStats
                };
            } else {
                balanceData.usageStatistics = null;
            }
        }

        // Return success response
        const result = {
            data: balanceData,
            timestamp: new Date().toISOString()
        };

        console.log('Balance check completed for user:', userId);

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Balance check error:', error);

        const errorResponse = {
            error: {
                code: 'BALANCE_CHECK_FAILED',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});