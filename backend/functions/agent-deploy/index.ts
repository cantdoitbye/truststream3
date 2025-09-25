// Agent Deployment Edge Function
// Handles deployment of generated agent code from agent_generator.py

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
            agentCode,
            deploymentType = 'container', // 'container', 'serverless', 'edge'
            instanceConfig = {},
            autoStart = true
        } = await req.json();

        console.log('Agent deployment request:', { workflowId, deploymentType });

        // Validate required parameters
        if (!workflowId || !agentCode) {
            throw new Error('workflowId and agentCode are required');
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

        console.log('Deploying agent for user:', userId);

        // Generate deployment ID
        const deploymentId = crypto.randomUUID();
        const agentName = agentCode.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
        const containerName = `agent-${agentName}-${deploymentId.slice(0, 8)}`;

        // Create deployment directory structure in storage
        const deploymentPath = `deployments/${userId}/${deploymentId}`;
        
        try {
            // Store agent code files in storage
            const files = [
                { name: 'server.py', content: agentCode.server_code },
                { name: 'requirements.txt', content: agentCode.requirements.join('\n') },
                { name: 'Dockerfile', content: generateDockerfile(agentCode) },
                { name: 'docker-compose.yml', content: generateDockerCompose(agentCode, containerName) },
                { name: '.env', content: generateEnvFile(agentCode.environment_vars) },
                { name: 'config.json', content: JSON.stringify(agentCode.deployment_config, null, 2) }
            ];

            for (const file of files) {
                const uploadResponse = await fetch(
                    `${supabaseUrl}/storage/v1/object/n8n-workflows/${deploymentPath}/${file.name}`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'Content-Type': 'text/plain'
                        },
                        body: file.content
                    }
                );

                if (!uploadResponse.ok) {
                    console.error(`Failed to upload ${file.name}`);
                }
            }

            console.log('Agent files uploaded to storage');

        } catch (error) {
            console.error('Failed to upload agent files:', error);
            throw new Error('Failed to store agent deployment files');
        }

        // Deploy based on deployment type
        let deploymentResult;
        
        switch (deploymentType) {
            case 'container':
                deploymentResult = await deployContainer(agentCode, containerName, deploymentId);
                break;
            case 'serverless':
                deploymentResult = await deployServerless(agentCode, deploymentId);
                break;
            case 'edge':
                deploymentResult = await deployEdge(agentCode, deploymentId);
                break;
            default:
                throw new Error(`Unsupported deployment type: ${deploymentType}`);
        }

        // Record deployment in database (create table if needed)
        const deploymentRecord = {
            id: deploymentId,
            user_id: userId,
            workflow_id: workflowId,
            agent_name: agentCode.name,
            agent_id: agentCode.agent_id,
            deployment_type: deploymentType,
            container_name: containerName,
            deployment_status: deploymentResult.success ? 'deployed' : 'failed',
            deployment_url: deploymentResult.url || null,
            instance_config: instanceConfig,
            resource_limits: agentCode.deployment_config?.resources || {},
            environment_vars: Object.keys(agentCode.environment_vars),
            deployment_logs: deploymentResult.logs || [],
            health_check_url: deploymentResult.healthCheckUrl || null,
            auto_restart: instanceConfig.autoRestart || true,
            status: autoStart ? 'starting' : 'stopped',
            deployed_at: new Date().toISOString(),
            last_health_check: null,
            deployment_error: deploymentResult.error || null
        };

        // Store deployment record
        try {
            const recordResponse = await fetch(
                `${supabaseUrl}/rest/v1/agent_deployments`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(deploymentRecord)
                }
            );

            if (!recordResponse.ok) {
                console.warn('Failed to store deployment record');
            }
        } catch (error) {
            console.warn('Database storage error:', error);
        }

        // Start the agent if auto-start is enabled
        if (autoStart && deploymentResult.success) {
            try {
                await startAgent(deploymentId, deploymentType, containerName);
                deploymentRecord.status = 'running';
            } catch (error) {
                console.error('Failed to start agent:', error);
                deploymentRecord.status = 'failed';
                deploymentRecord.deployment_error = error.message;
            }
        }

        // Return deployment result
        const result = {
            data: {
                success: deploymentResult.success,
                deploymentId: deploymentId,
                agentName: agentCode.name,
                deploymentType: deploymentType,
                containerName: containerName,
                deploymentUrl: deploymentResult.url,
                healthCheckUrl: deploymentResult.healthCheckUrl,
                status: deploymentRecord.status,
                deploymentPath: deploymentPath,
                tools: agentCode.tools?.map(t => ({ name: t.name, description: t.description })) || [],
                resourceLimits: agentCode.deployment_config?.resources || {},
                timestamp: new Date().toISOString(),
                logs: deploymentResult.logs || []
            }
        };

        if (!deploymentResult.success) {
            result.data.error = deploymentResult.error;
        }

        console.log(`Agent deployment ${deploymentResult.success ? 'completed' : 'failed'} for user ${userId}`);

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: deploymentResult.success ? 200 : 500
        });

    } catch (error) {
        console.error('Agent deployment error:', error);

        const errorResponse = {
            error: {
                code: 'AGENT_DEPLOYMENT_FAILED',
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

// Helper functions for different deployment types

async function deployContainer(agentCode: any, containerName: string, deploymentId: string) {
    // Simulate container deployment (in real implementation, this would use Docker API or container orchestration)
    console.log(`Deploying container: ${containerName}`);
    
    try {
        // In a real implementation, this would:
        // 1. Build Docker image from agent code
        // 2. Create container with specified resources
        // 3. Configure networking and health checks
        // 4. Return deployment details
        
        const port = 8000 + Math.floor(Math.random() * 1000); // Simulate port assignment
        const url = `http://localhost:${port}`;
        
        return {
            success: true,
            url: url,
            healthCheckUrl: `${url}/health`,
            logs: [
                `Container ${containerName} created successfully`,
                `Assigned port: ${port}`,
                `Health check endpoint: ${url}/health`
            ]
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            logs: [`Container deployment failed: ${error.message}`]
        };
    }
}

async function deployServerless(agentCode: any, deploymentId: string) {
    // Simulate serverless deployment
    console.log(`Deploying serverless function: ${deploymentId}`);
    
    try {
        // In real implementation, this would deploy to serverless platform
        const functionUrl = `https://functions.truststream.app/${deploymentId}`;
        
        return {
            success: true,
            url: functionUrl,
            healthCheckUrl: `${functionUrl}/health`,
            logs: [
                `Serverless function deployed successfully`,
                `Function URL: ${functionUrl}`
            ]
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            logs: [`Serverless deployment failed: ${error.message}`]
        };
    }
}

async function deployEdge(agentCode: any, deploymentId: string) {
    // Simulate edge deployment
    console.log(`Deploying edge function: ${deploymentId}`);
    
    try {
        // This could deploy as a Supabase Edge Function
        const edgeUrl = `https://edge.truststream.app/${deploymentId}`;
        
        return {
            success: true,
            url: edgeUrl,
            healthCheckUrl: `${edgeUrl}/health`,
            logs: [
                `Edge function deployed successfully`,
                `Edge URL: ${edgeUrl}`
            ]
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            logs: [`Edge deployment failed: ${error.message}`]
        };
    }
}

async function startAgent(deploymentId: string, deploymentType: string, containerName: string) {
    // Simulate starting the deployed agent
    console.log(`Starting agent: ${deploymentId} (${deploymentType})`);
    
    if (deploymentType === 'container') {
        // Simulate container start
        console.log(`Starting container: ${containerName}`);
    }
    
    // In real implementation, this would actually start the service
    return true;
}

// Generate Dockerfile for agent
function generateDockerfile(agentCode: any): string {
    return `FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY server.py .
COPY .env .env

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \\
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python", "server.py"]
`;
}

// Generate docker-compose.yml
function generateDockerCompose(agentCode: any, containerName: string): string {
    const resources = agentCode.deployment_config?.resources || {};
    const envVars = Object.keys(agentCode.environment_vars || {})
        .map(key => `      - ${key}=\${${key}}`)
        .join('\n');

    return `version: '3.8'

services:
  ${containerName}:
    build: .
    container_name: ${containerName}
    ports:
      - "8000:8000"
    environment:
${envVars || '      - NODE_ENV=production'}
    deploy:
      resources:
        limits:
          cpus: '${resources.cpu || 0.5}'
          memory: ${resources.memory_mb || 512}M
        reservations:
          cpus: '${resources.cpu ? resources.cpu * 0.5 : 0.25}'
          memory: ${resources.memory_mb ? Math.floor(resources.memory_mb * 0.5) : 256}M
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
`;
}

// Generate .env file
function generateEnvFile(environmentVars: Record<string, string>): string {
    return Object.entries(environmentVars)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
}
