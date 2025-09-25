// Workflow Management Edge Function
// Handles workflow listing, status updates, and deployment operations

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

    try {
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

        // Handle different operations
        if (req.method === 'POST') {
            const body = await req.json();
            const action = body.action;
            
            switch (action) {
                case 'list':
                    return await handleGetWorkflows(userId, supabaseUrl, serviceRoleKey, corsHeaders);
                case 'deploy':
                    return await handleDeployWorkflow(body, userId, supabaseUrl, serviceRoleKey, corsHeaders);
                case 'update-status':
                    return await handleUpdateStatus(body, userId, supabaseUrl, serviceRoleKey, corsHeaders);
                case 'delete':
                    return await handleDeleteWorkflow(body, userId, supabaseUrl, serviceRoleKey, corsHeaders);
                default:
                    throw new Error('Invalid action specified');
            }
        } else {
            throw new Error('Method not allowed');
        }

    } catch (error) {
        console.error('Workflow management error:', error);

        const errorResponse = {
            success: false,
            error: {
                code: 'WORKFLOW_MANAGEMENT_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Get user's workflows
async function handleGetWorkflows(userId: string, supabaseUrl: string, serviceRoleKey: string, corsHeaders: any) {
    try {
        // Get workflow estimates
        const workflowsResponse = await fetch(
            `${supabaseUrl}/rest/v1/workflow_cost_estimates?user_id=eq.${userId}&estimate_status=eq.active&order=created_at.desc`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!workflowsResponse.ok) {
            throw new Error('Failed to fetch workflows');
        }

        const workflows = await workflowsResponse.json();

        // Get recent usage data for each workflow
        const workflowsWithUsage = await Promise.all(
            workflows.map(async (workflow: any) => {
                const usageResponse = await fetch(
                    `${supabaseUrl}/rest/v1/usage_tracking?workflow_id=eq.${workflow.workflow_id}&order=created_at.desc&limit=5`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                let recentUsage = [];
                if (usageResponse.ok) {
                    recentUsage = await usageResponse.json();
                }

                return {
                    workflowId: workflow.workflow_id,
                    name: workflow.workflow_name,
                    version: workflow.workflow_version,
                    category: workflow.workflow_category,
                    nodeCount: workflow.node_count,
                    supportedNodeCount: workflow.supported_node_count,
                    complexityScore: workflow.complexity_score,
                    validationStatus: workflow.validation_status,
                    securityScore: workflow.security_score,
                    estimatedCostPerRun: workflow.estimated_cost_per_run,
                    actualRunsCount: workflow.actual_runs_count,
                    averageActualCost: workflow.average_actual_cost,
                    costPredictionAccuracy: workflow.cost_prediction_accuracy,
                    lastRunAt: workflow.last_run_at,
                    createdAt: workflow.created_at,
                    updatedAt: workflow.updated_at,
                    resourceEstimate: {
                        cpuCores: workflow.estimated_cpu_cores,
                        memoryMb: workflow.estimated_memory_mb,
                        gpuCores: workflow.estimated_gpu_cores,
                        storageMb: workflow.estimated_storage_mb
                    },
                    costBreakdown: {
                        baseCost: workflow.base_cost,
                        complexityCost: workflow.complexity_cost,
                        aiCost: workflow.ai_cost,
                        integrationCost: workflow.integration_cost
                    },
                    validationWarnings: workflow.validation_warnings,
                    validationErrors: workflow.validation_errors,
                    securityIssues: workflow.security_issues,
                    tags: workflow.workflow_tags,
                    recentUsage: recentUsage,
                    status: determineWorkflowStatus(workflow, recentUsage)
                };
            })
        );

        const result = {
            success: true,
            data: {
                workflows: workflowsWithUsage,
                summary: {
                    totalWorkflows: workflowsWithUsage.length,
                    activeWorkflows: workflowsWithUsage.filter(w => w.status === 'active').length,
                    totalRuns: workflowsWithUsage.reduce((sum, w) => sum + w.actualRunsCount, 0),
                    averageComplexity: workflowsWithUsage.length > 0 
                        ? workflowsWithUsage.reduce((sum, w) => sum + w.complexityScore, 0) / workflowsWithUsage.length
                        : 0,
                    totalEstimatedCost: workflowsWithUsage.reduce((sum, w) => sum + w.estimatedCostPerRun, 0)
                }
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        throw new Error(`Failed to get workflows: ${error.message}`);
    }
}

// Deploy workflow
async function handleDeployWorkflow(body: any, userId: string, supabaseUrl: string, serviceRoleKey: string, corsHeaders: any) {
    try {
        const { workflowId } = body;

        if (!workflowId) {
            throw new Error('workflowId is required');
        }

        // Get workflow details
        const workflowResponse = await fetch(
            `${supabaseUrl}/rest/v1/workflow_cost_estimates?workflow_id=eq.${workflowId}&user_id=eq.${userId}`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!workflowResponse.ok) {
            throw new Error('Workflow not found');
        }

        const workflows = await workflowResponse.json();
        if (workflows.length === 0) {
            throw new Error('Workflow not found');
        }

        const workflow = workflows[0];

        // Check if workflow is valid for deployment
        if (workflow.validation_status !== 'valid') {
            throw new Error('Workflow must be valid before deployment');
        }

        // Check user has sufficient credits
        const creditsResponse = await fetch(
            `${supabaseUrl}/rest/v1/user_credits?user_id=eq.${userId}`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (creditsResponse.ok) {
            const creditsData = await creditsResponse.json();
            if (creditsData.length > 0) {
                const userCredit = creditsData[0];
                const estimatedCost = workflow.estimated_cost_per_run * 1.75; // With markups
                
                if (parseFloat(userCredit.current_balance) < estimatedCost) {
                    throw new Error('Insufficient credits for deployment');
                }
            }
        }

        // Simulate deployment process
        const deploymentId = crypto.randomUUID();
        const deploymentUrl = `https://api.truststream.ai/agents/${deploymentId}`;
        
        // Create usage tracking record for deployment
        const usageData = {
            user_id: userId,
            workflow_id: workflowId,
            workflow_run_id: deploymentId,
            workflow_name: workflow.workflow_name,
            estimated_cost: workflow.estimated_cost_per_run * 1.75,
            execution_status: 'deployed',
            execution_time_seconds: 0,
            resource_usage: {
                cpu_cores_used: workflow.estimated_cpu_cores,
                memory_mb_used: workflow.estimated_memory_mb,
                gpu_cores_used: workflow.estimated_gpu_cores,
                storage_mb_used: workflow.estimated_storage_mb
            },
            deployment_url: deploymentUrl,
            created_at: new Date().toISOString()
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
                body: JSON.stringify(usageData)
            }
        );

        if (!usageResponse.ok) {
            console.error('Failed to create usage tracking record');
        }

        const result = {
            success: true,
            data: {
                deploymentId: deploymentId,
                deploymentUrl: deploymentUrl,
                workflowId: workflowId,
                status: 'deployed',
                deployedAt: new Date().toISOString(),
                estimatedCost: workflow.estimated_cost_per_run * 1.75,
                resourceAllocation: {
                    cpu: workflow.estimated_cpu_cores,
                    memory: workflow.estimated_memory_mb,
                    gpu: workflow.estimated_gpu_cores,
                    storage: workflow.estimated_storage_mb
                }
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        throw new Error(`Failed to deploy workflow: ${error.message}`);
    }
}

// Update workflow status
async function handleUpdateStatus(body: any, userId: string, supabaseUrl: string, serviceRoleKey: string, corsHeaders: any) {
    try {
        const { workflowId, status } = body;

        if (!workflowId || !status) {
            throw new Error('workflowId and status are required');
        }

        const validStatuses = ['active', 'paused', 'archived'];
        if (!validStatuses.includes(status)) {
            throw new Error('Invalid status');
        }

        const updateResponse = await fetch(
            `${supabaseUrl}/rest/v1/workflow_cost_estimates?workflow_id=eq.${workflowId}&user_id=eq.${userId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    estimate_status: status,
                    updated_at: new Date().toISOString()
                })
            }
        );

        if (!updateResponse.ok) {
            throw new Error('Failed to update workflow status');
        }

        const result = {
            success: true,
            data: {
                workflowId: workflowId,
                status: status,
                updatedAt: new Date().toISOString()
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        throw new Error(`Failed to update status: ${error.message}`);
    }
}

// Delete workflow
async function handleDeleteWorkflow(body: any, userId: string, supabaseUrl: string, serviceRoleKey: string, corsHeaders: any) {
    try {
        const { workflowId } = body;

        if (!workflowId) {
            throw new Error('workflowId is required');
        }

        // Archive the workflow instead of deleting
        const updateResponse = await fetch(
            `${supabaseUrl}/rest/v1/workflow_cost_estimates?workflow_id=eq.${workflowId}&user_id=eq.${userId}`,
            {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    estimate_status: 'archived',
                    updated_at: new Date().toISOString()
                })
            }
        );

        if (!updateResponse.ok) {
            throw new Error('Failed to delete workflow');
        }

        const result = {
            success: true,
            data: {
                workflowId: workflowId,
                status: 'deleted',
                deletedAt: new Date().toISOString()
            }
        };

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        throw new Error(`Failed to delete workflow: ${error.message}`);
    }
}

// Helper function to determine workflow status
function determineWorkflowStatus(workflow: any, recentUsage: any[]) {
    if (workflow.estimate_status === 'archived') {
        return 'archived';
    }
    
    if (recentUsage.length > 0) {
        const latestUsage = recentUsage[0];
        if (latestUsage.execution_status === 'deployed') {
            return 'deployed';
        } else if (latestUsage.execution_status === 'running') {
            return 'running';
        }
    }
    
    if (workflow.validation_status === 'valid') {
        return 'ready';
    } else {
        return 'draft';
    }
}