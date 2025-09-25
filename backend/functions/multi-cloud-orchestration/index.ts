// TrustStram v4.4 Multi-Cloud Orchestration Edge Function
// Manages multi-cloud deployments and cost optimization

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
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        if (req.method === 'GET') {
            // Fetch all multi-cloud deployments
            const deploymentsResponse = await fetch(`${supabaseUrl}/rest/v1/multi_cloud_deployments?select=*&order=created_at.desc`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!deploymentsResponse.ok) {
                throw new Error('Failed to fetch multi-cloud deployments');
            }

            const deployments = await deploymentsResponse.json();

            // Calculate summary statistics
            const totalDeployments = deployments.length;
            const runningDeployments = deployments.filter(d => d.status === 'running').length;
            const scalingDeployments = deployments.filter(d => d.status === 'scaling').length;
            const failedDeployments = deployments.filter(d => d.status === 'failed').length;

            const cloudDistribution = deployments.reduce((acc, deployment) => {
                const primary = deployment.primary_cloud;
                acc[primary] = (acc[primary] || 0) + 1;
                return acc;
            }, {});

            const costOptimizationEnabled = deployments.filter(d => d.cost_optimization_enabled).length;
            const avgCostReduction = deployments
                .filter(d => d.performance_metrics?.cost_reduction)
                .reduce((sum, d) => sum + (d.performance_metrics.cost_reduction || 0), 0) 
                / deployments.length || 0;

            const summary = {
                total_deployments: totalDeployments,
                running_deployments: runningDeployments,
                scaling_deployments: scalingDeployments,
                failed_deployments: failedDeployments,
                cloud_distribution: cloudDistribution,
                cost_optimization_enabled: costOptimizationEnabled,
                average_cost_reduction: parseFloat(avgCostReduction.toFixed(2)),
                deployment_types: [...new Set(deployments.map(d => d.deployment_type))]
            };

            return new Response(JSON.stringify({ 
                data: {
                    summary,
                    deployments: deployments.slice(0, 20)
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (req.method === 'POST') {
            // Create new multi-cloud deployment
            const requestData = await req.json();
            const { deployment_name, deployment_type, primary_cloud, secondary_clouds, deployment_config, cost_optimization_enabled } = requestData;

            if (!deployment_name || !deployment_type || !primary_cloud || !deployment_config) {
                throw new Error('Missing required fields: deployment_name, deployment_type, primary_cloud, deployment_config');
            }

            // Get user from auth header
            let userId = null;
            const authHeader = req.headers.get('authorization');
            if (authHeader) {
                try {
                    const token = authHeader.replace('Bearer ', '');
                    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'apikey': serviceRoleKey
                        }
                    });
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        userId = userData.id;
                    }
                } catch (error) {
                    console.log('Could not get user from token:', error.message);
                }
            }

            // Simulate deployment metrics
            const deploymentMetrics = {
                estimated_cost_monthly: Math.floor(Math.random() * 5000) + 1000,
                cost_reduction: Math.floor(Math.random() * 20) + 30, // 30-50%
                expected_uptime: 99.9 + (Math.random() * 0.09), // 99.9-99.99%
                resource_optimization: Math.random() * 0.3 + 0.7, // 70-100%
                deployment_time_estimate: `${Math.floor(Math.random() * 30) + 15} minutes`
            };

            const newDeployment = {
                deployment_name,
                deployment_type,
                primary_cloud,
                secondary_clouds: secondary_clouds || [],
                deployment_config,
                cost_optimization_enabled: cost_optimization_enabled || true,
                status: 'planning',
                performance_metrics: deploymentMetrics,
                created_by: userId
            };

            const insertResponse = await fetch(`${supabaseUrl}/rest/v1/multi_cloud_deployments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(newDeployment)
            });

            if (!insertResponse.ok) {
                const errorText = await insertResponse.text();
                throw new Error(`Failed to create multi-cloud deployment: ${errorText}`);
            }

            const createdDeployment = await insertResponse.json();

            return new Response(JSON.stringify({ 
                data: {
                    message: 'Multi-cloud deployment created successfully',
                    deployment: createdDeployment[0],
                    metrics: deploymentMetrics
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Method ${req.method} not supported`);

    } catch (error) {
        console.error('Multi-cloud orchestration error:', error);
        
        const errorResponse = {
            error: {
                code: 'MULTI_CLOUD_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});