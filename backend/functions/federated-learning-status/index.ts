// TrustStram v4.4 Federated Learning Status Edge Function
// Manages federated learning job operations and status

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
            // Fetch all federated learning jobs
            const jobsResponse = await fetch(`${supabaseUrl}/rest/v1/federated_learning_jobs?select=*&order=created_at.desc`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!jobsResponse.ok) {
                throw new Error('Failed to fetch federated learning jobs');
            }

            const jobs = await jobsResponse.json();

            // Calculate summary statistics
            const totalJobs = jobs.length;
            const runningJobs = jobs.filter(job => job.status === 'running').length;
            const completedJobs = jobs.filter(job => job.status === 'completed').length;
            const failedJobs = jobs.filter(job => job.status === 'failed').length;

            const summary = {
                total_jobs: totalJobs,
                running_jobs: runningJobs,
                completed_jobs: completedJobs,
                failed_jobs: failedJobs,
                success_rate: totalJobs > 0 ? (completedJobs / totalJobs * 100).toFixed(2) : '0.00',
                frameworks_used: [...new Set(jobs.map(job => job.framework))],
                job_types: [...new Set(jobs.map(job => job.job_type))]
            };

            return new Response(JSON.stringify({ 
                data: {
                    summary,
                    jobs: jobs.slice(0, 20) // Return latest 20 jobs
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (req.method === 'POST') {
            // Create new federated learning job
            const requestData = await req.json();
            const { job_name, job_type, framework, model_config, data_config, num_clients, num_rounds, privacy_budget } = requestData;

            if (!job_name || !job_type || !framework || !model_config || !data_config || !num_clients || !num_rounds) {
                throw new Error('Missing required fields for federated learning job');
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

            const newJob = {
                job_name,
                job_type,
                framework,
                model_config,
                data_config,
                num_clients,
                num_rounds,
                privacy_budget: privacy_budget || 8.0,
                status: 'pending',
                created_by: userId,
                performance_metrics: {
                    created_at: new Date().toISOString(),
                    estimated_duration: `${num_rounds * 2} minutes`
                }
            };

            const insertResponse = await fetch(`${supabaseUrl}/rest/v1/federated_learning_jobs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(newJob)
            });

            if (!insertResponse.ok) {
                const errorText = await insertResponse.text();
                throw new Error(`Failed to create federated learning job: ${errorText}`);
            }

            const createdJob = await insertResponse.json();

            return new Response(JSON.stringify({ 
                data: {
                    message: 'Federated learning job created successfully',
                    job: createdJob[0]
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Method ${req.method} not supported`);

    } catch (error) {
        console.error('Federated learning error:', error);
        
        const errorResponse = {
            error: {
                code: 'FEDERATED_LEARNING_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});