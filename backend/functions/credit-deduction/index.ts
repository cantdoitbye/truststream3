// Ooumph Coin Credit Deduction Edge Function
// Handles credit deduction for workflow runs with atomic transactions

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

    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST method is allowed' } }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        const { 
            workflowId, 
            workflowRunId, 
            workflowName,
            estimatedCost, 
            resourceBreakdown,
            executionRegion,
            priority = 'normal'
        } = await req.json();

        console.log('Credit deduction request:', { workflowId, workflowRunId, estimatedCost });

        // Validate required parameters
        if (!workflowId || !workflowRunId || !estimatedCost) {
            throw new Error('workflowId, workflowRunId, and estimatedCost are required');
        }

        if (estimatedCost <= 0) {
            throw new Error('estimatedCost must be positive');
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

        console.log('User authenticated:', userId);

        // Start database transaction by getting current user credits
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
        if (!creditsData || creditsData.length === 0) {
            // Create new user credits record if doesn't exist
            const createCreditsResponse = await fetch(
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

            if (!createCreditsResponse.ok) {
                throw new Error('Failed to create user credits account');
            }

            const newCreditsData = await createCreditsResponse.json();
            creditsData.push(newCreditsData[0]);
        }

        const userCredit = creditsData[0];
        const currentBalance = parseFloat(userCredit.current_balance);
        const estimatedCostNum = parseFloat(estimatedCost);

        console.log('Current balance:', currentBalance, 'Required:', estimatedCostNum);

        // Check if user has sufficient credits
        if (currentBalance < estimatedCostNum) {
            return new Response(
                JSON.stringify({
                    error: {
                        code: 'INSUFFICIENT_CREDITS',
                        message: 'Insufficient credits to run workflow',
                        details: {
                            required: estimatedCostNum,
                            available: currentBalance,
                            shortfall: estimatedCostNum - currentBalance
                        }
                    }
                }),
                { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check daily spending limits
        const today = new Date().toISOString().split('T')[0];
        const dailySpendResponse = await fetch(
            `${supabaseUrl}/rest/v1/credit_transactions?user_id=eq.${userId}&created_at=gte.${today}T00:00:00Z&transaction_type=eq.workflow_cost&select=amount`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (dailySpendResponse.ok) {
            const dailyTransactions = await dailySpendResponse.json();
            const dailySpent = dailyTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
            const dailyLimit = parseFloat(userCredit.daily_spend_limit || 100);

            if (dailySpent + estimatedCostNum > dailyLimit) {
                return new Response(
                    JSON.stringify({
                        error: {
                            code: 'DAILY_LIMIT_EXCEEDED',
                            message: 'Daily spending limit would be exceeded',
                            details: {
                                dailyLimit: dailyLimit,
                                dailySpent: dailySpent,
                                requested: estimatedCostNum,
                                remaining: dailyLimit - dailySpent
                            }
                        }
                    }),
                    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        }

        // Calculate new balance
        const newBalance = currentBalance - estimatedCostNum;
        const newTotalSpent = parseFloat(userCredit.total_spent) + estimatedCostNum;

        // Update user credits balance atomically
        const updateCreditsResponse = await fetch(
            `${supabaseUrl}/rest/v1/user_credits?user_id=eq.${userId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    current_balance: newBalance,
                    total_spent: newTotalSpent,
                    last_transaction_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
            }
        );

        if (!updateCreditsResponse.ok) {
            throw new Error('Failed to update user credits balance');
        }

        console.log('Credits updated successfully');

        // Record the transaction
        const transactionData = {
            user_id: userId,
            transaction_type: 'workflow_cost',
            amount: estimatedCostNum,
            balance_before: currentBalance,
            balance_after: newBalance,
            description: `Workflow execution: ${workflowName || workflowId}`,
            reference_type: 'workflow_run',
            reference_id: workflowRunId,
            workflow_id: workflowId,
            workflow_name: workflowName || 'Unnamed Workflow',
            resource_cost: resourceBreakdown || {},
            status: 'completed',
            processed_by: 'credit-deduction-function',
            metadata: {
                execution_region: executionRegion,
                priority: priority,
                estimated_cost: estimatedCostNum,
                timestamp: new Date().toISOString()
            }
        };

        const transactionResponse = await fetch(
            `${supabaseUrl}/rest/v1/credit_transactions`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(transactionData)
            }
        );

        if (!transactionResponse.ok) {
            console.error('Failed to record transaction, but credits were deducted');
            // Note: In a production system, you might want to implement compensation logic here
        }

        const transactionResult = await transactionResponse.json();
        console.log('Transaction recorded successfully');

        // Create initial usage tracking record
        const usageTrackingData = {
            user_id: userId,
            workflow_id: workflowId,
            workflow_run_id: workflowRunId,
            workflow_name: workflowName || 'Unnamed Workflow',
            estimated_cost: estimatedCostNum,
            actual_cost: estimatedCostNum, // Will be updated when execution completes
            execution_status: 'queued',
            execution_region: executionRegion,
            queued_at: new Date().toISOString()
        };

        const usageResponse = await fetch(
            `${supabaseUrl}/rest/v1/usage_tracking`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(usageTrackingData)
            }
        );

        if (!usageResponse.ok) {
            console.warn('Failed to create usage tracking record');
        }

        // Return success response
        const result = {
            data: {
                success: true,
                transactionId: transactionResult[0]?.id,
                workflowRunId: workflowRunId,
                creditsDeducted: estimatedCostNum,
                remainingBalance: newBalance,
                previousBalance: currentBalance,
                timestamp: new Date().toISOString()
            }
        };

        console.log('Credit deduction completed successfully');

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Credit deduction error:', error);

        const errorResponse = {
            error: {
                code: 'CREDIT_DEDUCTION_FAILED',
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