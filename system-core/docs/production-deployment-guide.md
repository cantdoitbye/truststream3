# TrustStream v4.2 - Production Deployment Guide

**Version:** 4.2.0  
**Generated:** 2025-09-20  
**Author:** MiniMax Agent

## 🚀 Quick Start Production Deployment

### Prerequisites
- Node.js 18+ and npm/yarn
- Supabase account and project
- Domain name with SSL certificate
- Basic understanding of React and TypeScript

### 1. Environment Setup

Create production environment files in each application directory:

```bash
# Main application
cp .env.test .env.production

# Admin interfaces
cp admin-interfaces/*/`env.local .env.production
```

**Required Environment Variables:**
```env
# Supabase Configuration
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key

# Security Configuration
NODE_ENV=production
LOG_LEVEL=error
ENABLE_METRICS=true
CACHE_ENABLED=true

# Performance Configuration
MAX_CONCURRENT_USERS=1000
RATE_LIMIT_ENABLED=true
```

### 2. Database Setup

1. **Create Supabase Project:**
   ```bash
   # Initialize Supabase (if not already done)
   npx supabase init
   npx supabase start
   ```

2. **Apply Database Schema:**
   ```bash
   # Run all migrations
   npx supabase db push
   
   # Enable Row Level Security
   npx supabase db reset --linked
   ```

3. **Verify Database:**
   - Check all 621 tables are created
   - Verify RLS policies are active
   - Test authentication flows

### 3. Application Build & Deployment

#### Frontend Applications
```bash
# Build all admin interfaces
cd admin-interfaces/admin-interface/mcp-a2a-admin
npm install && npm run build

cd ../truststream-versioning-admin  
npm install && npm run build

cd ../frontend/truststream-community-dashboard
npm install && npm run build

cd ../truststream-frontend
npm install && npm run build

cd ../truststream-workflow-admin
npm install && npm run build
```

#### Deploy to Vercel/Netlify
```bash
# Example Vercel deployment
npm i -g vercel
vercel --prod

# Or Netlify
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### 4. Edge Functions Deployment

Deploy Supabase Edge Functions:
```bash
# Deploy all edge functions
npx supabase functions deploy --legacy-bundle

# Verify deployment
npx supabase functions list
```

### 5. Domain & SSL Configuration

1. **Configure Custom Domain:**
   - Add CNAME record pointing to your hosting provider
   - Configure SSL certificate (automatically handled by Vercel/Netlify)

2. **Update CORS Settings:**
   In Supabase dashboard → Settings → API:
   ```
   https://yourdomain.com
   https://admin.yourdomain.com
   ```

### 6. Production Monitoring

#### Health Checks
- `/api/health` - Application health
- `/api/auth/status` - Authentication status
- `/api/database/status` - Database connectivity

#### Monitoring Setup
```javascript
// Add to your main application
const healthCheck = async () => {
  const response = await fetch('/api/health');
  return response.status === 200;
};

// Monitor every 5 minutes
setInterval(healthCheck, 300000);
```

## 🔧 Configuration Management

### Security Configuration
```typescript
// security.config.ts
export const securityConfig = {
  corsOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'],
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  },
};
```

### Performance Configuration
```typescript
// performance.config.ts
export const performanceConfig = {
  caching: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxSize: 1000
  },
  compression: {
    enabled: true,
    level: 6
  },
  lazyLoading: true,
  bundleSplitting: true
};
```

## 📊 Monitoring & Analytics

### Application Metrics
- Response times (target: <200ms)
- Error rates (target: <1%)
- User sessions
- Database query performance

### Dashboard URLs
- **Main Dashboard:** `https://yourdomain.com/dashboard`
- **Admin Panel:** `https://yourdomain.com/admin`
- **Governance Console:** `https://yourdomain.com/governance`
- **Analytics Dashboard:** `https://yourdomain.com/analytics`

## 🔒 Security Best Practices

### Authentication
- Implement Multi-Factor Authentication (MFA)
- Use strong password policies
- Enable session timeout
- Monitor failed login attempts

### Database Security
- Enable Row Level Security (RLS) on all tables
- Use parameterized queries only
- Regular security audits
- Monitor database access logs

### API Security
- Rate limiting on all endpoints
- Input validation and sanitization
- HTTPS only in production
- API key rotation policy

## 🆘 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Database Connection Issues
1. Check Supabase project status
2. Verify environment variables
3. Test connection with:
   ```bash
   npx supabase db ping
   ```

#### Performance Issues
1. Check server resources
2. Analyze slow queries in Supabase dashboard
3. Monitor application metrics

### Emergency Contacts
- **Technical Lead:** [Your Contact]
- **DevOps Team:** [DevOps Contact]
- **Supabase Support:** support@supabase.com

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- CDN setup for static assets
- Database read replicas
- Edge function scaling

### Vertical Scaling
- Monitor CPU and memory usage
- Database connection pooling
- Cache optimization
- Bundle size optimization

## 🔄 Maintenance & Updates

### Regular Maintenance
- **Weekly:** Security patches
- **Monthly:** Dependency updates
- **Quarterly:** Performance review
- **Annually:** Security audit

### Update Procedure
1. Test in staging environment
2. Backup production database
3. Deploy during low-traffic hours
4. Monitor for 24 hours post-deployment
5. Rollback plan ready

---

## 📞 Support & Documentation

- **Full Documentation:** `/docs/`
- **API Reference:** `/docs/api/`
- **User Guide:** `/docs/user-guide/`
- **Troubleshooting:** `/docs/troubleshooting/`

**Production Readiness Status:** ✅ **READY FOR DEPLOYMENT**
