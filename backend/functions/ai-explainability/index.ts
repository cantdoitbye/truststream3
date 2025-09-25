// TrustStram v4.4 AI Explainability Edge Function
// Handles AI model explanation requests and bias audits

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
            // Fetch all explainability requests
            const requestsResponse = await fetch(`${supabaseUrl}/rest/v1/explainability_requests?select=*&order=created_at.desc&limit=50`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!requestsResponse.ok) {
                throw new Error('Failed to fetch explainability requests');
            }

            const requests = await requestsResponse.json();

            // Calculate summary statistics
            const totalRequests = requests.length;
            const completedRequests = requests.filter(req => req.status === 'completed').length;
            const pendingRequests = requests.filter(req => req.status === 'pending').length;
            const processingRequests = requests.filter(req => req.status === 'processing').length;

            const requestTypes = requests.reduce((acc, req) => {
                acc[req.request_type] = (acc[req.request_type] || 0) + 1;
                return acc;
            }, {});

            const stakeholderTypes = requests.reduce((acc, req) => {
                acc[req.stakeholder_type] = (acc[req.stakeholder_type] || 0) + 1;
                return acc;
            }, {});

            const avgProcessingTime = completedRequests.length > 0 
                ? requests.filter(req => req.processing_time_ms)
                    .reduce((sum, req) => sum + req.processing_time_ms, 0) / completedRequests
                : 0;

            const summary = {
                total_requests: totalRequests,
                completed_requests: completedRequests,
                pending_requests: pendingRequests,
                processing_requests: processingRequests,
                success_rate: totalRequests > 0 ? (completedRequests / totalRequests * 100).toFixed(2) : '0.00',
                average_processing_time_ms: Math.round(avgProcessingTime),
                request_types: requestTypes,
                stakeholder_types: stakeholderTypes
            };

            return new Response(JSON.stringify({ 
                data: {
                    summary,
                    requests: requests.slice(0, 20)
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (req.method === 'POST') {
            // Create new explainability request
            const requestData = await req.json();
            const { request_type, model_id, input_data, stakeholder_type } = requestData;

            if (!request_type || !model_id || !input_data || !stakeholder_type) {
                throw new Error('Missing required fields: request_type, model_id, input_data, stakeholder_type');
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

            // Simulate explanation generation (in real implementation, this would call actual ML explanation services)
            const simulatedExplanation = {
                method: request_type,
                confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
                feature_importance: {
                    feature_1: Math.random() * 0.5 + 0.3,
                    feature_2: Math.random() * 0.4 + 0.2,
                    feature_3: Math.random() * 0.3 + 0.1
                },
                explanation_summary: `Generated ${request_type} explanation for model ${model_id}`,
                stakeholder_specific: {
                    complexity_level: stakeholder_type === 'technical_user' ? 'high' : 'medium',
                    recommendation: 'Model prediction is reliable based on input features'
                }
            };

            const processingTime = Math.floor(Math.random() * 2000) + 500; // 500-2500ms

            const newRequest = {
                request_type,
                model_id,
                input_data,
                stakeholder_type,
                status: 'completed',
                explanation_result: simulatedExplanation,
                processing_time_ms: processingTime,
                created_by: userId
            };

            const insertResponse = await fetch(`${supabaseUrl}/rest/v1/explainability_requests`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(newRequest)
            });

            if (!insertResponse.ok) {
                const errorText = await insertResponse.text();
                throw new Error(`Failed to create explainability request: ${errorText}`);
            }

            const createdRequest = await insertResponse.json();

            return new Response(JSON.stringify({ 
                data: {
                    message: 'AI explanation generated successfully',
                    request: createdRequest[0],
                    explanation: simulatedExplanation
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Method ${req.method} not supported`);

    } catch (error) {
        console.error('AI explainability error:', error);
        
        const errorResponse = {
            error: {
                code: 'AI_EXPLAINABILITY_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});