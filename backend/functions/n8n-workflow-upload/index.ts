// N8N Workflow Upload Edge Function
// Handles workflow file upload, parsing, validation, and cost estimation

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
            workflowName,
            workflowData,
            fileName
        } = await req.json();

        console.log('N8N workflow upload request:', { workflowName, fileName });

        // Validate required parameters
        if (!workflowName || !workflowData || !fileName) {
            throw new Error('workflowName, workflowData, and fileName are required');
        }

        // Validate file size (max 5MB)
        const workflowJson = JSON.stringify(workflowData);
        const fileSizeBytes = new TextEncoder().encode(workflowJson).length;
        const maxSizeBytes = 5 * 1024 * 1024; // 5MB

        if (fileSizeBytes > maxSizeBytes) {
            throw new Error(`File too large: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB (max 5MB)`);
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

        // Parse and validate workflow
        const parseResult = await parseN8NWorkflow(workflowData, fileName);
        
        if (!parseResult.success) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: {
                        code: 'WORKFLOW_PARSE_ERROR',
                        message: parseResult.error,
                        validation_errors: parseResult.validation_errors || []
                    }
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const parsedWorkflow = parseResult.data;

        // Upload workflow file to storage
        const fileKey = `${userId}/${Date.now()}-${fileName}`;
        const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/n8n-workflows/${fileKey}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json'
            },
            body: workflowJson
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Failed to upload workflow file: ${errorText}`);
        }

        const publicUrl = `${supabaseUrl}/storage/v1/object/public/n8n-workflows/${fileKey}`;

        // Store workflow estimate in database
        const workflowId = crypto.randomUUID();
        const estimateResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/store_workflow_estimate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_workflow_id: workflowId,
                p_user_id: userId,
                p_workflow_name: workflowName,
                p_workflow_version: '1.0',
                p_workflow_hash: await generateWorkflowHash(workflowJson),
                p_node_count: parsedWorkflow.nodeCount,
                p_supported_node_count: parsedWorkflow.supportedNodeCount,
                p_complexity_score: parsedWorkflow.complexityScore,
                p_estimated_cpu_cores: parsedWorkflow.resourceEstimate.cpuCores,
                p_estimated_memory_mb: parsedWorkflow.resourceEstimate.memoryMb,
                p_estimated_gpu_cores: parsedWorkflow.resourceEstimate.gpuCores,
                p_estimated_storage_mb: parsedWorkflow.resourceEstimate.storageMb,
                p_estimated_cost_per_run: parsedWorkflow.resourceEstimate.estimatedCostPerRun,
                p_base_cost: parsedWorkflow.resourceEstimate.baseCost,
                p_complexity_cost: parsedWorkflow.resourceEstimate.complexityCost,
                p_ai_cost: parsedWorkflow.resourceEstimate.aiCost,
                p_integration_cost: parsedWorkflow.resourceEstimate.integrationCost || 0,
                p_ai_nodes_count: parsedWorkflow.aiNodesCount,
                p_code_nodes_count: parsedWorkflow.codeNodesCount,
                p_integration_nodes_count: parsedWorkflow.integrationNodesCount,
                p_webhook_nodes_count: parsedWorkflow.webhookNodesCount,
                p_validation_status: parsedWorkflow.validation.isValid ? 'valid' : 'invalid',
                p_security_score: parsedWorkflow.security.securityScore,
                p_security_issues: JSON.stringify(parsedWorkflow.security.securityIssues),
                p_validation_warnings: JSON.stringify(parsedWorkflow.validation.warnings),
                p_validation_errors: JSON.stringify(parsedWorkflow.validation.errors),
                p_workflow_category: determineWorkflowCategory(parsedWorkflow),
                p_workflow_tags: JSON.stringify([])
            })
        });

        if (!estimateResponse.ok) {
            const errorText = await estimateResponse.text();
            console.error('Failed to store workflow estimate:', errorText);
        }

        const result = {
            success: true,
            data: {
                workflowId: workflowId,
                workflowName: workflowName,
                fileName: fileName,
                fileUrl: publicUrl,
                fileSize: fileSizeBytes,
                parsing: {
                    nodeCount: parsedWorkflow.nodeCount,
                    supportedNodeCount: parsedWorkflow.supportedNodeCount,
                    complexityScore: parsedWorkflow.complexityScore,
                    aiNodesCount: parsedWorkflow.aiNodesCount,
                    codeNodesCount: parsedWorkflow.codeNodesCount,
                    integrationNodesCount: parsedWorkflow.integrationNodesCount,
                    webhookNodesCount: parsedWorkflow.webhookNodesCount
                },
                validation: parsedWorkflow.validation,
                security: parsedWorkflow.security,
                resourceEstimate: {
                    cpuCores: parsedWorkflow.resourceEstimate.cpuCores,
                    memoryMb: parsedWorkflow.resourceEstimate.memoryMb,
                    gpuCores: parsedWorkflow.resourceEstimate.gpuCores,
                    storageMb: parsedWorkflow.resourceEstimate.storageMb,
                    estimatedCostPerRun: parsedWorkflow.resourceEstimate.estimatedCostPerRun,
                    baseCost: parsedWorkflow.resourceEstimate.baseCost,
                    complexityCost: parsedWorkflow.resourceEstimate.complexityCost,
                    aiCost: parsedWorkflow.resourceEstimate.aiCost,
                    integrationCost: parsedWorkflow.resourceEstimate.integrationCost || 0
                },
                costBreakdown: {
                    baseOoumphCost: parsedWorkflow.resourceEstimate.estimatedCostPerRun,
                    cpuMarkup: parsedWorkflow.resourceEstimate.estimatedCostPerRun * 0.25, // 25% markup
                    gpuMarkup: parsedWorkflow.resourceEstimate.gpuCores > 0 ? parsedWorkflow.resourceEstimate.estimatedCostPerRun * 0.30 : 0, // 30% markup
                    storageMarkup: parsedWorkflow.resourceEstimate.estimatedCostPerRun * 0.20, // 20% markup
                    totalOoumphCost: parsedWorkflow.resourceEstimate.estimatedCostPerRun * (1 + 0.25 + (parsedWorkflow.resourceEstimate.gpuCores > 0 ? 0.30 : 0) + 0.20)
                },
                status: 'uploaded',
                uploadedAt: new Date().toISOString()
            }
        };

        console.log('Workflow upload completed successfully');

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Workflow upload error:', error);

        const errorResponse = {
            success: false,
            error: {
                code: 'WORKFLOW_UPLOAD_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Workflow parsing and validation functions
async function parseN8NWorkflow(workflowData: any, fileName: string) {
    try {
        // Extract basic workflow metadata
        const workflowName = workflowData.name || fileName.replace('.json', '');
        const nodes = workflowData.nodes || [];
        const connections = workflowData.connections || {};

        // Count different types of nodes
        let aiNodesCount = 0;
        let codeNodesCount = 0;
        let integrationNodesCount = 0;
        let webhookNodesCount = 0;
        let supportedNodeCount = 0;

        const supportedNodeTypes = [
            'n8n-nodes-base.httpRequest',
            'n8n-nodes-base.webhook',
            'n8n-nodes-base.code',
            'n8n-nodes-base.function',
            'n8n-nodes-base.openAi',
            'n8n-nodes-base.openAiChat',
            'n8n-nodes-base.json',
            'n8n-nodes-base.merge',
            'n8n-nodes-base.if',
            'n8n-nodes-base.switch',
            'n8n-nodes-base.manualTrigger',
            'n8n-nodes-base.cron',
            'n8n-nodes-base.slack',
            'n8n-nodes-base.discord',
            'n8n-nodes-base.emailSend'
        ];

        const aiNodeTypes = ['n8n-nodes-base.openAi', 'n8n-nodes-base.openAiChat'];
        const codeNodeTypes = ['n8n-nodes-base.code', 'n8n-nodes-base.function'];
        const integrationNodeTypes = ['n8n-nodes-base.slack', 'n8n-nodes-base.discord', 'n8n-nodes-base.emailSend'];
        const webhookNodeTypes = ['n8n-nodes-base.webhook', 'n8n-nodes-base.manualTrigger'];

        for (const node of nodes) {
            const nodeType = node.type;
            
            if (supportedNodeTypes.includes(nodeType)) {
                supportedNodeCount++;
            }
            
            if (aiNodeTypes.includes(nodeType)) {
                aiNodesCount++;
            }
            
            if (codeNodeTypes.includes(nodeType)) {
                codeNodesCount++;
            }
            
            if (integrationNodeTypes.includes(nodeType)) {
                integrationNodesCount++;
            }
            
            if (webhookNodeTypes.includes(nodeType)) {
                webhookNodesCount++;
            }
        }

        // Calculate complexity score
        const baseScore = nodes.length;
        const complexityScore = Math.min(
            baseScore + (aiNodesCount * 3) + (codeNodesCount * 2) + integrationNodesCount,
            100
        );

        // Estimate resources
        const baseCpu = 0.5;
        const baseMemory = 512;
        const baseStorage = 100;
        
        const complexityMultiplier = 1 + (complexityScore / 100);
        const aiMultiplier = 1 + (aiNodesCount * 0.5);
        
        const baseCost = 0.001;
        const complexityCost = complexityScore * 0.0001;
        const aiCost = aiNodesCount * 0.01;
        const integrationCost = integrationNodesCount * 0.002;
        
        const estimatedCostPerRun = baseCost + complexityCost + aiCost + integrationCost;

        const resourceEstimate = {
            cpuCores: baseCpu * complexityMultiplier,
            memoryMb: Math.round(baseMemory * complexityMultiplier * aiMultiplier),
            gpuCores: aiNodesCount > 0 ? 0.1 : 0.0,
            storageMb: baseStorage + (nodes.length * 10),
            estimatedCostPerRun: estimatedCostPerRun,
            baseCost: baseCost,
            complexityCost: complexityCost,
            aiCost: aiCost,
            integrationCost: integrationCost
        };

        // Perform validation
        const validation = await validateWorkflow(workflowData, nodes);
        const security = await validateSecurity(workflowData, nodes);

        return {
            success: true,
            data: {
                workflowName,
                nodeCount: nodes.length,
                supportedNodeCount,
                complexityScore,
                aiNodesCount,
                codeNodesCount,
                integrationNodesCount,
                webhookNodesCount,
                resourceEstimate,
                validation,
                security
            }
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            validation_errors: [`Failed to parse workflow: ${error.message}`]
        };
    }
}

async function validateWorkflow(workflowData: any, nodes: any[]) {
    const maxNodes = 50;
    const maxComplexity = 80;
    
    const errors = [];
    const warnings = [];
    
    // Check node count limits
    if (nodes.length > maxNodes) {
        errors.push(`Too many nodes: ${nodes.length} (max: ${maxNodes})`);
    }
    
    // Check for trigger nodes
    const triggerNodes = nodes.filter(node => 
        node.type === 'n8n-nodes-base.manualTrigger' || 
        node.type === 'n8n-nodes-base.webhook'
    );
    
    if (triggerNodes.length === 0) {
        warnings.push('No trigger nodes found. Agent may not be externally accessible.');
    }
    
    // Check for unsupported nodes
    const supportedNodeTypes = [
        'n8n-nodes-base.httpRequest',
        'n8n-nodes-base.webhook',
        'n8n-nodes-base.code',
        'n8n-nodes-base.function',
        'n8n-nodes-base.openAi',
        'n8n-nodes-base.openAiChat',
        'n8n-nodes-base.json',
        'n8n-nodes-base.merge',
        'n8n-nodes-base.if',
        'n8n-nodes-base.switch',
        'n8n-nodes-base.manualTrigger',
        'n8n-nodes-base.cron',
        'n8n-nodes-base.slack',
        'n8n-nodes-base.discord',
        'n8n-nodes-base.emailSend'
    ];
    
    const unsupportedNodes = nodes.filter(node => !supportedNodeTypes.includes(node.type));
    if (unsupportedNodes.length > 0) {
        const unsupportedTypes = [...new Set(unsupportedNodes.map(node => node.type))];
        warnings.push(`Unsupported node types will be skipped: ${unsupportedTypes.join(', ')}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

async function validateSecurity(workflowData: any, nodes: any[]) {
    const securityIssues = [];
    const blockedDomains = ['localhost', '127.0.0.1', '0.0.0.0'];
    
    for (const node of nodes) {
        // Check HTTP request nodes for blocked domains
        if (node.type === 'n8n-nodes-base.httpRequest') {
            const url = node.parameters?.url || '';
            for (const blockedDomain of blockedDomains) {
                if (url.toLowerCase().includes(blockedDomain)) {
                    securityIssues.push(`Blocked domain in HTTP request: ${blockedDomain}`);
                }
            }
        }
        
        // Check code nodes for dangerous patterns
        if (node.type === 'n8n-nodes-base.code' || node.type === 'n8n-nodes-base.function') {
            const code = node.parameters?.jsCode || node.parameters?.code || '';
            const dangerousPatterns = ['eval(', 'exec(', 'require(', 'import('];
            
            for (const pattern of dangerousPatterns) {
                if (code.includes(pattern)) {
                    securityIssues.push(`Potentially dangerous code pattern in ${node.name}: ${pattern}`);
                }
            }
        }
    }
    
    const securityScore = Math.max(0, 100 - (securityIssues.length * 20));
    
    return {
        securityScore,
        securityIssues,
        isSecure: securityIssues.length === 0
    };
}

async function generateWorkflowHash(workflowJson: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(workflowJson);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function determineWorkflowCategory(parsedWorkflow: any): string {
    if (parsedWorkflow.aiNodesCount > 0) {
        return 'ai_assistant';
    } else if (parsedWorkflow.integrationNodesCount > 0) {
        return 'integration';
    } else if (parsedWorkflow.codeNodesCount > 0) {
        return 'data_processing';
    } else {
        return 'automation';
    }
}