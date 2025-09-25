# TrustStream v4.5 - Deployment Guide

## 🚀 Production Deployment Options

### Option 1: Supabase + Vercel (Recommended)

**Frontend (Vercel)**
```bash
cd frontend
pnpm build
vercel --prod
```

**Backend (Supabase)**
```bash
cd backend
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy
```

### Option 2: AWS Deployment

**Frontend (S3 + CloudFront)**
```bash
cd frontend
pnpm build
aws s3 sync dist/ s3://your-bucket-name
```

**Backend (Lambda)**
```bash
cd deployment/aws
./deploy-lambda.sh
```

### Option 3: Docker Deployment

**All-in-One Container**
```bash
docker-compose up -d
```

## 🔧 Environment Configuration

### Required Environment Variables

**Supabase:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (backend only)

**Stripe:**
- `STRIPE_PUBLISHABLE_KEY` - Public key (frontend)
- `STRIPE_SECRET_KEY` - Secret key (backend)
- `STRIPE_WEBHOOK_SECRET` - Webhook endpoint secret

**AI Services:**
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `GOOGLE_AI_API_KEY` - Google AI API key

**Vector Database:**
- `QDRANT_URL` - Qdrant instance URL
- `QDRANT_API_KEY` - Qdrant API key

## 🔒 Security Checklist

- [ ] Enable RLS policies on all tables
- [ ] Configure CORS for production domains
- [ ] Set up SSL certificates
- [ ] Enable API rate limiting
- [ ] Configure monitoring and alerts
- [ ] Set up backup procedures

## 📊 Monitoring Setup

### Supabase Dashboard
- Monitor function performance
- Track database usage
- Review error logs

### Custom Monitoring
```bash
cd monitoring
./setup-monitoring.sh
```

## 🧪 Pre-deployment Testing

```bash
# Run all tests
./run-tests.sh

# Performance testing
cd tests/performance
./performance-test.sh

# Security testing
cd tests/security
./security-test.sh
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
name: Deploy TrustStream
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy Frontend
        run: |
          cd frontend
          pnpm install
          pnpm build
          vercel --prod
      - name: Deploy Backend
        run: |
          cd backend
          supabase functions deploy
```