# Ooumph Coin Credit System - API Documentation

## Overview

The Ooumph Coin Credit System provides a comprehensive solution for managing user credits, tracking resource usage, and handling billing operations for the TrustStream AI workflow platform. This system integrates seamlessly with the existing workflow parser to provide accurate cost estimation and credit deduction.

## Architecture

### Database Tables

#### 1. user_credits
Manages user credit balances and account settings.

**Key Fields:**
- `current_balance`: Available credit balance in ooumph coins
- `daily_spend_limit`: Maximum credits that can be spent per day
- `auto_recharge_enabled`: Whether automatic recharge is enabled
- `billing_tier`: User's billing tier (free, standard, premium, enterprise)

#### 2. credit_transactions
Complete audit trail of all credit operations.

**Key Fields:**
- `transaction_type`: Type of transaction (debit, credit, purchase, workflow_cost, etc.)
- `amount`: Transaction amount in ooumph coins
- `balance_before`/`balance_after`: Account balance before and after transaction
- `workflow_id`: Associated workflow for workflow_cost transactions
- `resource_cost`: Detailed resource breakdown from workflow parser

#### 3. usage_tracking
Detailed monitoring of workflow executions and resource consumption.

**Key Fields:**
- `estimated_cost`/`actual_cost`: Estimated vs actual execution cost
- `execution_status`: Status of workflow execution
- `execution_time_seconds`: Total execution time
- `cost_variance_percent`: Percentage difference between estimated and actual cost

#### 4. billing_history
Payment history, credit purchases, and billing events.

**Key Fields:**
- `fiat_amount`: Amount in fiat currency
- `credit_amount`: Amount in ooumph coins
- `exchange_rate`: Conversion rate at transaction time
- `payment_method`: Payment method used

#### 5. workflow_cost_estimates
Pre-calculated cost estimates for workflows based on workflow_parser.py analysis.

**Key Fields:**
- `estimated_cost_per_run`: Calculated cost per workflow execution
- `complexity_score`: Workflow complexity from parser
- `cost_prediction_accuracy`: Accuracy of previous predictions
- `validation_status`: Workflow validation status

## Edge Functions API

### 1. Credit Deduction (`/functions/v1/credit-deduction`)

**Purpose:** Deducts credits for workflow execution with atomic transactions.

**Method:** POST

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "workflowId": "550e8400-e29b-41d4-a716-446655440000",
  "workflowRunId": "550e8400-e29b-41d4-a716-446655440001",
  "workflowName": "AI Content Generator",
  "estimatedCost": 0.15,
  "resourceBreakdown": {
    "cpu_cores": 1.5,
    "memory_mb": 1024,
    "gpu_cores": 0.1,
    "ai_nodes": 2
  },
  "executionRegion": "us-east-1",
  "priority": "normal"
}
```

**Response (Success):**
```json
{
  "data": {
    "success": true,
    "transactionId": "550e8400-e29b-41d4-a716-446655440002",
    "workflowRunId": "550e8400-e29b-41d4-a716-446655440001",
    "creditsDeducted": 0.15,
    "remainingBalance": 24.85,
    "previousBalance": 25.00,
    "timestamp": "2024-12-19T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `402`: Insufficient credits
- `429`: Daily limit exceeded
- `500`: Internal server error

### 2. Balance Check (`/functions/v1/balance-check`)

**Purpose:** Retrieves comprehensive user credit information.

**Method:** GET or POST

**Authentication:** Required (Bearer token)

**Query Parameters (GET):**
- `includeTransactions`: Include recent transactions (default: false)
- `includeUsage`: Include usage statistics (default: false)
- `transactionLimit`: Number of transactions to include (max: 100)

**Request Body (POST):**
```json
{
  "includeTransactions": true,
  "includeUsage": true,
  "transactionLimit": 20
}
```

**Response:**
```json
{
  "data": {
    "userId": "user-123",
    "currentBalance": 24.85,
    "totalEarned": 100.00,
    "totalSpent": 75.15,
    "totalPurchased": 100.00,
    "accountStatus": "active",
    "billingTier": "standard",
    "dailySpendLimit": 50.00,
    "monthlySpendLimit": 500.00,
    "dailySpent": 12.50,
    "monthlySpent": 75.15,
    "dailyRemaining": 37.50,
    "monthlyRemaining": 424.85,
    "isLowBalance": false,
    "canSpendMore": true,
    "needsAutoRecharge": false,
    "recentTransactions": [...],
    "usageStatistics": {
      "totalRuns": 150,
      "completedRuns": 142,
      "successRate": 0.9467,
      "averageCostPerRun": 0.08,
      "averageExecutionTimeSeconds": 45
    }
  },
  "timestamp": "2024-12-19T10:30:00.000Z"
}
```

### 3. Usage Analytics (`/functions/v1/usage-analytics`)

**Purpose:** Provides comprehensive analytics and reporting for credit usage.

**Method:** POST

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "timeframe": "30d",
  "reportType": "summary",
  "groupBy": "day",
  "includeBreakdown": true,
  "workflowIds": ["workflow-1", "workflow-2"],
  "dateFrom": "2024-11-19T00:00:00.000Z",
  "dateTo": "2024-12-19T00:00:00.000Z"
}
```

**Parameters:**
- `timeframe`: "7d", "30d", "90d", "1y"
- `reportType`: "summary", "detailed", "trends"
- `groupBy`: "hour", "day", "week", "month"
- `includeBreakdown`: Include per-workflow breakdown
- `workflowIds`: Filter by specific workflows (optional)

**Response:**
```json
{
  "data": {
    "summary": {
      "period": {
        "startDate": "2024-11-19T00:00:00.000Z",
        "endDate": "2024-12-19T00:00:00.000Z",
        "timeframe": "30d"
      },
      "execution": {
        "totalRuns": 150,
        "completedRuns": 142,
        "failedRuns": 6,
        "cancelledRuns": 2,
        "successRate": 94.67
      },
      "costs": {
        "totalCreditsSpent": 12.50,
        "averageCostPerRun": 0.083,
        "totalResourceCost": 12.35,
        "averageResourceCost": 0.082
      },
      "performance": {
        "averageExecutionTimeSeconds": 45.2,
        "totalExecutionTimeSeconds": 6414
      }
    },
    "workflowBreakdown": {
      "workflow-1": {
        "workflowName": "Content Generator",
        "totalRuns": 85,
        "completedRuns": 82,
        "totalCost": 7.50,
        "averageCost": 0.088,
        "successRate": 96.47
      }
    },
    "trends": [...]
  },
  "meta": {
    "userId": "user-123",
    "reportType": "summary",
    "generatedAt": "2024-12-19T10:30:00.000Z"
  }
}
```

### 4. Credit Purchase (`/functions/v1/credit-purchase`)

**Purpose:** Handles credit purchases and account top-ups.

**Method:** POST

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "purchaseType": "manual",
  "creditAmount": 50.0,
  "fiatAmount": 49.99,
  "currency": "USD",
  "exchangeRate": 1.0002,
  "packageName": "Standard Credit Pack",
  "packageTier": "standard",
  "paymentMethod": "stripe_card",
  "paymentProcessor": "stripe",
  "externalTransactionId": "pi_1234567890",
  "promotionalCode": "WELCOME10",
  "bonusCredits": 5.0,
  "discountApplied": 10.0,
  "metadata": {
    "card_last_four": "4242",
    "card_brand": "visa"
  }
}
```

**Response:**
```json
{
  "data": {
    "success": true,
    "transactionId": "550e8400-e29b-41d4-a716-446655440003",
    "billingTransactionId": "OC-1703001234-user123",
    "creditsAdded": 55.0,
    "creditsPurchased": 50.0,
    "bonusCredits": 5.0,
    "previousBalance": 24.85,
    "newBalance": 79.85,
    "fiatAmount": 49.99,
    "currency": "USD",
    "exchangeRate": 1.0002,
    "timestamp": "2024-12-19T10:30:00.000Z"
  }
}
```

## Security Features

### Row Level Security (RLS)
- Users can only access their own credit data
- Service role has full access for edge function operations
- Audit functions available to authenticated users

### Security Functions
```sql
-- Check if user has sufficient credits
SELECT check_sufficient_credits(0.15);

-- Get current user balance
SELECT get_current_balance();

-- Get daily spending for current user
SELECT get_daily_spending();
```

### Audit Trail
- All credit operations are logged in `credit_transactions`
- Automatic balance verification with before/after snapshots
- Trigger-based audit logging for critical operations

## Error Handling

### Common Error Codes
- `INSUFFICIENT_CREDITS`: User doesn't have enough credits
- `DAILY_LIMIT_EXCEEDED`: Daily spending limit reached
- `CREDIT_DEDUCTION_FAILED`: General deduction error
- `BALANCE_CHECK_FAILED`: Error retrieving balance information
- `USAGE_ANALYTICS_FAILED`: Analytics generation error
- `CREDIT_PURCHASE_FAILED`: Purchase processing error

### Error Response Format
```json
{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "Insufficient credits to run workflow",
    "details": {
      "required": 0.15,
      "available": 0.05,
      "shortfall": 0.10
    },
    "timestamp": "2024-12-19T10:30:00.000Z"
  }
}
```

## Rate Limiting

- Balance checks: 100 requests per minute per user
- Credit deductions: 50 requests per minute per user
- Analytics: 10 requests per minute per user
- Credit purchases: 5 requests per minute per user

## Monitoring and Observability

### Key Metrics
- Credit deduction success rate
- Average balance check response time
- Cost prediction accuracy
- Daily/monthly spending patterns
- Failed transaction rates

### Logging
- All edge functions log request/response details
- Error conditions are logged with full context
- Performance metrics are tracked for optimization