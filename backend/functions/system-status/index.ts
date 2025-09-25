// TrustStram v4.4 System Status Edge Function
// Provides real-time system health and performance metrics

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

        // Fetch AI Governance Agents status
        const agentsResponse = await fetch(`${supabaseUrl}/rest/v1/ai_governance_agents?select=*`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!agentsResponse.ok) {
            throw new Error('Failed to fetch AI agents data');
        }

        const agents = await agentsResponse.json();

        // Fetch System Metrics
        const metricsResponse = await fetch(`${supabaseUrl}/rest/v1/system_metrics?select=*&order=recorded_at.desc&limit=20`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!metricsResponse.ok) {
            throw new Error('Failed to fetch system metrics');
        }

        const metrics = await metricsResponse.json();

        // Fetch Compliance Status
        const complianceResponse = await fetch(`${supabaseUrl}/rest/v1/compliance_status?select=*`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!complianceResponse.ok) {
            throw new Error('Failed to fetch compliance data');
        }

        const compliance = await complianceResponse.json();

        // Fetch 4D Trust Scores
        const trustScoresResponse = await fetch(`${supabaseUrl}/rest/v1/trust_scores_4d?select=*&order=calculated_at.desc&limit=10`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!trustScoresResponse.ok) {
            throw new Error('Failed to fetch trust scores');
        }

        const trustScores = await trustScoresResponse.json();

        // Calculate aggregate metrics
        const totalAgents = agents.length;
        const activeAgents = agents.filter(agent => agent.status === 'active').length;
        const avgSuccessRate = agents.reduce((sum, agent) => sum + (agent.success_rate || 0), 0) / totalAgents;
        const avgResponseTime = agents.reduce((sum, agent) => sum + (agent.response_time_ms || 0), 0) / totalAgents;
        const avgTrustScore = agents.reduce((sum, agent) => sum + (agent.trust_score || 0), 0) / totalAgents;

        // Prepare response data
        const systemStatus = {
            version: '4.4.0',
            timestamp: new Date().toISOString(),
            status: 'operational',
            ai_governance: {
                total_agents: totalAgents,
                active_agents: activeAgents,
                average_success_rate: parseFloat(avgSuccessRate.toFixed(3)),
                average_response_time_ms: parseFloat(avgResponseTime.toFixed(1)),
                average_trust_score: parseFloat(avgTrustScore.toFixed(3)),
                agents: agents
            },
            system_metrics: {
                latest_metrics: metrics,
                performance_summary: {
                    api_response_time: metrics.find(m => m.metric_name === 'api_response_time')?.metric_value || 0,
                    system_throughput: metrics.find(m => m.metric_name === 'system_throughput')?.metric_value || 0,
                    system_uptime: metrics.find(m => m.metric_name === 'system_uptime')?.metric_value || 0,
                    test_coverage: metrics.find(m => m.metric_name === 'test_coverage')?.metric_value || 0
                }
            },
            compliance: {
                total_frameworks: compliance.length,
                compliant_count: compliance.filter(c => c.compliance_status === 'compliant').length,
                average_score: compliance.reduce((sum, c) => sum + (c.compliance_score || 0), 0) / compliance.length,
                frameworks: compliance
            },
            trust_scoring: {
                system_trust_score: trustScores.find(t => t.entity_type === 'system')?.overall_trust_score || 0,
                trust_dimensions: trustScores.filter(t => t.entity_type === 'system')[0] || {},
                all_scores: trustScores
            }
        };

        return new Response(JSON.stringify({ data: systemStatus }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('System status error:', error);
        
        const errorResponse = {
            error: {
                code: 'SYSTEM_STATUS_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});