// Agent Management Edge Function
// Handles agent lifecycle management (start, stop, restart, health checks, logs)

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

        const url = new URL(req.url);
        const action = url.pathname.split('/').pop();

        console.log(`Agent management action: ${action} for user: ${userId}`);

        let result;

        switch (req.method) {
            case 'GET':
                result = await handleGetRequest(action, url.searchParams, userId, serviceRoleKey, supabaseUrl);
                break;
            case 'POST':
                const body = await req.json();
                result = await handlePostRequest(action, body, userId, serviceRoleKey, supabaseUrl);
                break;
            case 'PATCH':
                const patchBody = await req.json();
                result = await handlePatchRequest(action, patchBody, userId, serviceRoleKey, supabaseUrl);
                break;
            case 'DELETE':
                result = await handleDeleteRequest(action, url.searchParams, userId, serviceRoleKey, supabaseUrl);
                break;
            default:
                throw new Error(`Unsupported method: ${req.method}`);
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Agent management error:', error);

        const errorResponse = {
            error: {
                code: 'AGENT_MANAGEMENT_FAILED',
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

// Handle GET requests (list, status, logs, health)
async function handleGetRequest(action: string, params: URLSearchParams, userId: string, serviceRoleKey: string, supabaseUrl: string) {
    switch (action) {
        case 'list':
            return await listUserAgents(userId, serviceRoleKey, supabaseUrl, params);
        case 'status':
            const agentId = params.get('agentId');
            if (!agentId) throw new Error('agentId parameter required');
            return await getAgentStatus(agentId, userId, serviceRoleKey, supabaseUrl);
        case 'logs':
            const logsAgentId = params.get('agentId');
            if (!logsAgentId) throw new Error('agentId parameter required');
            return await getAgentLogs(logsAgentId, userId, serviceRoleKey, supabaseUrl);
        case 'health':
            const healthAgentId = params.get('agentId');
            if (!healthAgentId) throw new Error('agentId parameter required');
            return await checkAgentHealth(healthAgentId, userId, serviceRoleKey, supabaseUrl);
        default:
            throw new Error(`Unknown GET action: ${action}`);
    }
}

// Handle POST requests (start, stop, restart)
async function handlePostRequest(action: string, body: any, userId: string, serviceRoleKey: string, supabaseUrl: string) {
    const { agentId } = body;
    if (!agentId) throw new Error('agentId is required');

    switch (action) {
        case 'start':
            return await startAgent(agentId, userId, serviceRoleKey, supabaseUrl);
        case 'stop':
            return await stopAgent(agentId, userId, serviceRoleKey, supabaseUrl);
        case 'restart':
            return await restartAgent(agentId, userId, serviceRoleKey, supabaseUrl);
        default:
            throw new Error(`Unknown POST action: ${action}`);
    }
}

// Handle PATCH requests (update configuration)
async function handlePatchRequest(action: string, body: any, userId: string, serviceRoleKey: string, supabaseUrl: string) {
    const { agentId } = body;
    if (!agentId) throw new Error('agentId is required');

    switch (action) {
        case 'config':
            return await updateAgentConfig(agentId, body, userId, serviceRoleKey, supabaseUrl);
        default:
            throw new Error(`Unknown PATCH action: ${action}`);
    }
}

// Handle DELETE requests (remove agent)
async function handleDeleteRequest(action: string, params: URLSearchParams, userId: string, serviceRoleKey: string, supabaseUrl: string) {
    switch (action) {
        case 'remove':
            const agentId = params.get('agentId');
            if (!agentId) throw new Error('agentId parameter required');
            return await removeAgent(agentId, userId, serviceRoleKey, supabaseUrl);
        default:
            throw new Error(`Unknown DELETE action: ${action}`);
    }
}

// List all agents for a user
async function listUserAgents(userId: string, serviceRoleKey: string, supabaseUrl: string, params: URLSearchParams) {
    const status = params.get('status');
    const limit = parseInt(params.get('limit') || '10');
    const offset = parseInt(params.get('offset') || '0');

    let query = `user_id=eq.${userId}`;
    if (status) {
        query += `&status=eq.${status}`;
    }

    const response = await fetch(
        `${supabaseUrl}/rest/v1/agent_deployments?${query}&order=deployed_at.desc&limit=${limit}&offset=${offset}&select=*`,
        {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch agent deployments');
    }

    const agents = await response.json();

    // Add real-time status for each agent
    for (const agent of agents) {
        agent.realtime_status = await getRealTimeAgentStatus(agent);
    }

    return {
        data: {
            agents: agents,
            total: agents.length,
            limit: limit,
            offset: offset,
            timestamp: new Date().toISOString()
        }
    };
}

// Get specific agent status
async function getAgentStatus(agentId: string, userId: string, serviceRoleKey: string, supabaseUrl: string) {
    const response = await fetch(
        `${supabaseUrl}/rest/v1/agent_deployments?id=eq.${agentId}&user_id=eq.${userId}&select=*`,
        {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch agent deployment');
    }

    const agents = await response.json();
    if (agents.length === 0) {
        throw new Error('Agent not found');
    }

    const agent = agents[0];
    const realTimeStatus = await getRealTimeAgentStatus(agent);

    return {
        data: {
            ...agent,
            realtime_status: realTimeStatus,
            timestamp: new Date().toISOString()
        }
    };
}

// Get agent logs
async function getAgentLogs(agentId: string, userId: string, serviceRoleKey: string, supabaseUrl: string) {
    // In a real implementation, this would fetch logs from the container/service
    // For now, simulate log retrieval
    
    const logs = [
        { timestamp: new Date().toISOString(), level: 'INFO', message: 'Agent started successfully' },
        { timestamp: new Date().toISOString(), level: 'INFO', message: 'Health check passed' },
        { timestamp: new Date().toISOString(), level: 'DEBUG', message: 'Processing request...' }
    ];

    return {
        data: {
            agentId: agentId,
            logs: logs,
            timestamp: new Date().toISOString()
        }
    };
}

// Check agent health
async function checkAgentHealth(agentId: string, userId: string, serviceRoleKey: string, supabaseUrl: string) {
    const agent = await getAgentRecord(agentId, userId, serviceRoleKey, supabaseUrl);
    
    if (!agent.health_check_url) {
        return {
            data: {
                agentId: agentId,
                healthy: false,
                message: 'No health check URL configured',
                timestamp: new Date().toISOString()
            }
        };
    }

    try {
        // In real implementation, this would call the actual health check endpoint
        const healthResponse = await fetch(agent.health_check_url, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        const healthy = healthResponse.ok;
        
        // Update last health check time
        await updateAgentHealthCheck(agentId, healthy, serviceRoleKey, supabaseUrl);

        return {
            data: {
                agentId: agentId,
                healthy: healthy,
                status_code: healthResponse.status,
                response_time: 150, // Simulated
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        await updateAgentHealthCheck(agentId, false, serviceRoleKey, supabaseUrl);
        
        return {
            data: {
                agentId: agentId,
                healthy: false,
                error: error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
}

// Start agent
async function startAgent(agentId: string, userId: string, serviceRoleKey: string, supabaseUrl: string) {
    const agent = await getAgentRecord(agentId, userId, serviceRoleKey, supabaseUrl);
    
    // Simulate starting the agent
    console.log(`Starting agent: ${agent.container_name || agent.agent_name}`);
    
    // Update status to starting
    await updateAgentStatus(agentId, 'starting', serviceRoleKey, supabaseUrl);
    
    // Simulate startup delay
    setTimeout(async () => {
        await updateAgentStatus(agentId, 'running', serviceRoleKey, supabaseUrl);
    }, 2000);

    return {
        data: {
            agentId: agentId,
            action: 'start',
            status: 'starting',
            message: 'Agent start initiated',
            timestamp: new Date().toISOString()
        }
    };
}

// Stop agent
async function stopAgent(agentId: string, userId: string, serviceRoleKey: string, supabaseUrl: string) {
    const agent = await getAgentRecord(agentId, userId, serviceRoleKey, supabaseUrl);
    
    console.log(`Stopping agent: ${agent.container_name || agent.agent_name}`);
    
    await updateAgentStatus(agentId, 'stopping', serviceRoleKey, supabaseUrl);
    
    setTimeout(async () => {
        await updateAgentStatus(agentId, 'stopped', serviceRoleKey, supabaseUrl);
    }, 1000);

    return {
        data: {
            agentId: agentId,
            action: 'stop',
            status: 'stopping',
            message: 'Agent stop initiated',
            timestamp: new Date().toISOString()
        }
    };
}

// Restart agent
async function restartAgent(agentId: string, userId: string, serviceRoleKey: string, supabaseUrl: string) {
    const agent = await getAgentRecord(agentId, userId, serviceRoleKey, supabaseUrl);
    
    console.log(`Restarting agent: ${agent.container_name || agent.agent_name}`);
    
    await updateAgentStatus(agentId, 'restarting', serviceRoleKey, supabaseUrl);
    
    setTimeout(async () => {
        await updateAgentStatus(agentId, 'running', serviceRoleKey, supabaseUrl);
    }, 3000);

    return {
        data: {
            agentId: agentId,
            action: 'restart',
            status: 'restarting',
            message: 'Agent restart initiated',
            timestamp: new Date().toISOString()
        }
    };
}

// Update agent configuration
async function updateAgentConfig(agentId: string, updates: any, userId: string, serviceRoleKey: string, supabaseUrl: string) {
    const allowedUpdates = ['instance_config', 'auto_restart', 'resource_limits'];
    const updateData: any = {};
    
    for (const key of allowedUpdates) {
        if (key in updates) {
            updateData[key] = updates[key];
        }
    }
    
    if (Object.keys(updateData).length === 0) {
        throw new Error('No valid configuration updates provided');
    }
    
    updateData.updated_at = new Date().toISOString();

    const response = await fetch(
        `${supabaseUrl}/rest/v1/agent_deployments?id=eq.${agentId}&user_id=eq.${userId}`,
        {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        }
    );

    if (!response.ok) {
        throw new Error('Failed to update agent configuration');
    }

    return {
        data: {
            agentId: agentId,
            action: 'update_config',
            updates: updateData,
            message: 'Agent configuration updated',
            timestamp: new Date().toISOString()
        }
    };
}

// Remove agent
async function removeAgent(agentId: string, userId: string, serviceRoleKey: string, supabaseUrl: string) {
    const agent = await getAgentRecord(agentId, userId, serviceRoleKey, supabaseUrl);
    
    // Stop agent first if running
    if (['running', 'starting'].includes(agent.status)) {
        await stopAgent(agentId, userId, serviceRoleKey, supabaseUrl);
        // Wait for stop to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Remove deployment record
    const response = await fetch(
        `${supabaseUrl}/rest/v1/agent_deployments?id=eq.${agentId}&user_id=eq.${userId}`,
        {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.ok) {
        throw new Error('Failed to remove agent deployment record');
    }

    // In real implementation, also clean up container/service and storage files
    console.log(`Agent ${agentId} removed successfully`);

    return {
        data: {
            agentId: agentId,
            action: 'remove',
            message: 'Agent removed successfully',
            timestamp: new Date().toISOString()
        }
    };
}

// Helper functions
async function getAgentRecord(agentId: string, userId: string, serviceRoleKey: string, supabaseUrl: string) {
    const response = await fetch(
        `${supabaseUrl}/rest/v1/agent_deployments?id=eq.${agentId}&user_id=eq.${userId}&select=*`,
        {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch agent deployment');
    }

    const agents = await response.json();
    if (agents.length === 0) {
        throw new Error('Agent not found');
    }

    return agents[0];
}

async function updateAgentStatus(agentId: string, status: string, serviceRoleKey: string, supabaseUrl: string) {
    await fetch(
        `${supabaseUrl}/rest/v1/agent_deployments?id=eq.${agentId}`,
        {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: status,
                updated_at: new Date().toISOString()
            })
        }
    );
}

async function updateAgentHealthCheck(agentId: string, healthy: boolean, serviceRoleKey: string, supabaseUrl: string) {
    await fetch(
        `${supabaseUrl}/rest/v1/agent_deployments?id=eq.${agentId}`,
        {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                last_health_check: new Date().toISOString(),
                health_status: healthy ? 'healthy' : 'unhealthy'
            })
        }
    );
}

async function getRealTimeAgentStatus(agent: any) {
    // In real implementation, this would check actual container/service status
    // For now, simulate based on stored status with some randomization
    const possibleStatuses = ['running', 'stopped', 'starting', 'stopping', 'error'];
    const currentStatus = agent.status || 'unknown';
    
    return {
        status: currentStatus,
        uptime: agent.status === 'running' ? Math.floor(Math.random() * 86400) : 0,
        cpu_usage: agent.status === 'running' ? Math.floor(Math.random() * 100) : 0,
        memory_usage: agent.status === 'running' ? Math.floor(Math.random() * 100) : 0,
        last_updated: new Date().toISOString()
    };
}
