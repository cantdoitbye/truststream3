// Stripe Payment Integration for Ooumph Coin Credit Purchase
// Handles payment processing with 20-30% margin and webhook validation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
};

// Credit packages with 25% margin (split between platform and profit)
const CREDIT_PACKAGES = {
    starter: {
        id: 'starter',
        name: 'Starter Pack',
        credits: 10,
        fiat_amount: 1.25, // $1.25 for 10 credits (25% margin)
        currency: 'USD',
        description: 'Perfect for trying out the platform',
        bonus_credits: 0
    },
    basic: {
        id: 'basic',
        name: 'Basic Pack',
        credits: 100,
        fiat_amount: 12.50, // $12.50 for 100 credits (25% margin)
        currency: 'USD',
        description: 'Great for regular users',
        bonus_credits: 5
    },
    professional: {
        id: 'professional',
        name: 'Professional Pack',
        credits: 500,
        fiat_amount: 62.50, // $62.50 for 500 credits (25% margin)
        currency: 'USD',
        description: 'Best for power users',
        bonus_credits: 50
    },
    enterprise: {
        id: 'enterprise',
        name: 'Enterprise Pack',
        credits: 2000,
        fiat_amount: 250.00, // $250.00 for 2000 credits (25% margin)
        currency: 'USD',
        description: 'For businesses and teams',
        bonus_credits: 300
    }
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const path = url.pathname.split('/').pop();

    try {
        switch (path) {
            case 'create-payment-intent':
                return await createPaymentIntent(req);
            case 'webhook':
                return await handleWebhook(req);
            case 'packages':
                return await getPackages(req);
            case 'payment-status':
                return await getPaymentStatus(req);
            default:
                throw new Error(`Unknown endpoint: ${path}`);
        }
    } catch (error) {
        console.error('Stripe payment error:', error);
        
        const errorResponse = {
            error: {
                code: 'STRIPE_PAYMENT_ERROR',
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

async function createPaymentIntent(req: Request) {
    if (req.method !== 'POST') {
        throw new Error('Only POST method allowed');
    }

    const { packageId, customAmount } = await req.json();
    
    // Get environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!stripeSecretKey || !serviceRoleKey || !supabaseUrl) {
        throw new Error('Missing configuration');
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

    // Determine package details
    let packageDetails;
    if (packageId && CREDIT_PACKAGES[packageId]) {
        packageDetails = CREDIT_PACKAGES[packageId];
    } else if (customAmount) {
        // Custom amount with 25% margin
        const credits = Math.floor(customAmount / 0.125); // $0.125 per credit (25% margin)
        packageDetails = {
            id: 'custom',
            name: 'Custom Pack',
            credits: credits,
            fiat_amount: customAmount,
            currency: 'USD',
            description: `Custom credit purchase`,
            bonus_credits: Math.floor(credits * 0.05) // 5% bonus
        };
    } else {
        throw new Error('Package ID or custom amount required');
    }

    console.log('Creating payment intent for:', { userId, packageDetails });

    // Create Stripe payment intent
    const paymentIntentData = {
        amount: Math.round(packageDetails.fiat_amount * 100), // Convert to cents
        currency: packageDetails.currency.toLowerCase(),
        metadata: {
            user_id: userId,
            package_id: packageDetails.id,
            credits: packageDetails.credits.toString(),
            bonus_credits: packageDetails.bonus_credits.toString(),
            truststream_purchase: 'true'
        },
        description: `TrustStream Credits: ${packageDetails.name}`
    };

    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(paymentIntentData).toString()
    });

    if (!stripeResponse.ok) {
        const stripeError = await stripeResponse.text();
        throw new Error(`Stripe API error: ${stripeError}`);
    }

    const paymentIntent = await stripeResponse.json();

    // Store payment intent record for tracking
    const paymentRecord = {
        id: crypto.randomUUID(),
        user_id: userId,
        stripe_payment_intent_id: paymentIntent.id,
        package_id: packageDetails.id,
        package_name: packageDetails.name,
        credit_amount: packageDetails.credits,
        bonus_credits: packageDetails.bonus_credits,
        fiat_amount: packageDetails.fiat_amount,
        currency: packageDetails.currency,
        status: 'pending',
        created_at: new Date().toISOString()
    };

    // Store in pending_payments table (create if needed)
    await fetch(`${supabaseUrl}/rest/v1/pending_payments`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentRecord)
    });

    return new Response(JSON.stringify({
        data: {
            client_secret: paymentIntent.client_secret,
            payment_intent_id: paymentIntent.id,
            package: packageDetails,
            amount: packageDetails.fiat_amount,
            currency: packageDetails.currency
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

async function handleWebhook(req: Request) {
    if (req.method !== 'POST') {
        throw new Error('Only POST method allowed');
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!stripeSecretKey || !webhookSecret || !serviceRoleKey || !supabaseUrl) {
        throw new Error('Missing webhook configuration');
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
        throw new Error('Missing Stripe signature');
    }

    // Verify webhook signature
    const isValid = await verifyStripeSignature(body, signature, webhookSecret);
    if (!isValid) {
        throw new Error('Invalid webhook signature');
    }

    const event = JSON.parse(body);
    console.log('Stripe webhook event:', event.type);

    switch (event.type) {
        case 'payment_intent.succeeded':
            await handlePaymentSuccess(event.data.object, serviceRoleKey, supabaseUrl);
            break;
        case 'payment_intent.payment_failed':
            await handlePaymentFailure(event.data.object, serviceRoleKey, supabaseUrl);
            break;
        case 'payment_intent.canceled':
            await handlePaymentCancellation(event.data.object, serviceRoleKey, supabaseUrl);
            break;
        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

async function handlePaymentSuccess(paymentIntent: any, serviceRoleKey: string, supabaseUrl: string) {
    const userId = paymentIntent.metadata.user_id;
    const credits = parseInt(paymentIntent.metadata.credits);
    const bonusCredits = parseInt(paymentIntent.metadata.bonus_credits);
    const packageId = paymentIntent.metadata.package_id;

    console.log('Processing successful payment:', { userId, credits, bonusCredits });

    try {
        // Call the existing credit-purchase function to add credits
        const creditPurchaseResponse = await fetch(`${supabaseUrl}/functions/v1/credit-purchase`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                purchaseType: 'manual',
                creditAmount: credits,
                bonusCredits: bonusCredits,
                fiatAmount: paymentIntent.amount / 100, // Convert from cents
                currency: paymentIntent.currency.toUpperCase(),
                exchangeRate: 1,
                packageName: CREDIT_PACKAGES[packageId]?.name || 'Custom Pack',
                packageTier: packageId,
                paymentMethod: 'stripe',
                paymentProcessor: 'stripe',
                externalTransactionId: paymentIntent.id,
                metadata: {
                    stripe_payment_intent_id: paymentIntent.id,
                    stripe_charges: paymentIntent.charges?.data || []
                }
            })
        });

        if (!creditPurchaseResponse.ok) {
            throw new Error('Failed to process credit purchase');
        }

        // Update payment status
        await fetch(`${supabaseUrl}/rest/v1/pending_payments?stripe_payment_intent_id=eq.${paymentIntent.id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'completed',
                completed_at: new Date().toISOString(),
                stripe_data: paymentIntent
            })
        });

        console.log('Payment processed successfully');

    } catch (error) {
        console.error('Failed to process payment:', error);
        
        // Update payment status to failed
        await fetch(`${supabaseUrl}/rest/v1/pending_payments?stripe_payment_intent_id=eq.${paymentIntent.id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'failed',
                error_message: error.message,
                failed_at: new Date().toISOString()
            })
        });
    }
}

async function handlePaymentFailure(paymentIntent: any, serviceRoleKey: string, supabaseUrl: string) {
    console.log('Payment failed:', paymentIntent.id);
    
    await fetch(`${supabaseUrl}/rest/v1/pending_payments?stripe_payment_intent_id=eq.${paymentIntent.id}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: paymentIntent.last_payment_error?.message || 'Payment failed',
            stripe_data: paymentIntent
        })
    });
}

async function handlePaymentCancellation(paymentIntent: any, serviceRoleKey: string, supabaseUrl: string) {
    console.log('Payment canceled:', paymentIntent.id);
    
    await fetch(`${supabaseUrl}/rest/v1/pending_payments?stripe_payment_intent_id=eq.${paymentIntent.id}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            stripe_data: paymentIntent
        })
    });
}

async function getPackages(req: Request) {
    if (req.method !== 'GET') {
        throw new Error('Only GET method allowed');
    }

    return new Response(JSON.stringify({
        data: {
            packages: Object.values(CREDIT_PACKAGES),
            margin_info: {
                platform_margin: '25%',
                base_credit_cost: '$0.10',
                marked_up_cost: '$0.125',
                description: 'All packages include a 25% margin to support platform operations and development'
            }
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

async function getPaymentStatus(req: Request) {
    if (req.method !== 'GET') {
        throw new Error('Only GET method allowed');
    }

    const url = new URL(req.url);
    const paymentIntentId = url.searchParams.get('payment_intent_id');
    
    if (!paymentIntentId) {
        throw new Error('payment_intent_id parameter required');
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    const response = await fetch(
        `${supabaseUrl}/rest/v1/pending_payments?stripe_payment_intent_id=eq.${paymentIntentId}&select=*`,
        {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.ok) {
        throw new Error('Failed to fetch payment status');
    }

    const payments = await response.json();
    const payment = payments[0];

    if (!payment) {
        throw new Error('Payment not found');
    }

    return new Response(JSON.stringify({
        data: {
            payment_intent_id: payment.stripe_payment_intent_id,
            status: payment.status,
            credits: payment.credit_amount,
            bonus_credits: payment.bonus_credits,
            amount: payment.fiat_amount,
            currency: payment.currency,
            package_name: payment.package_name,
            created_at: payment.created_at,
            completed_at: payment.completed_at,
            failed_at: payment.failed_at,
            error_message: payment.error_message
        }
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

// Helper function to verify Stripe webhook signature
async function verifyStripeSignature(body: string, signature: string, secret: string): Promise<boolean> {
    try {
        const elements = signature.split(',');
        const signatureElements: { [key: string]: string } = {};
        
        for (const element of elements) {
            const [key, value] = element.split('=');
            signatureElements[key] = value;
        }

        const timestamp = signatureElements['t'];
        const v1 = signatureElements['v1'];

        if (!timestamp || !v1) {
            return false;
        }

        const payload = `${timestamp}.${body}`;
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signature_buffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
        const signature_array = Array.from(new Uint8Array(signature_buffer));
        const signature_hex = signature_array.map(b => b.toString(16).padStart(2, '0')).join('');

        return signature_hex === v1;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}
