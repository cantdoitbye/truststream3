# Developer Onboarding Guide

**Welcome to the Agentic Ecosystem Development Team!**

This comprehensive guide will get you up and running with our multi-phase AI-powered platform in under 30 minutes.

## 🎯 Quick Start Overview

**What You'll Learn:**
1. System architecture and phase structure
2. Development environment setup
3. Codebase navigation and key components
4. Database schema and data flow
5. Development workflow and best practices
6. Testing and deployment procedures

**Prerequisites:**
- Node.js 18+ installed
- Git and VS Code (or preferred IDE)
- Basic React/TypeScript knowledge
- Understanding of REST APIs and databases

## 🛠️ Development Environment Setup

### Step 1: Clone the Repository

```bash
# Clone the main repository
git clone [repository-url]
cd agentic-ecosystem

# Check current branch and status
git status
git branch -a
```

### Step 2: Install Dependencies

```bash
# Install global dependencies
npm install -g @supabase/cli vite

# Navigate to Phase 1 project (main frontend)
cd agentic-ecosystem-phase1

# Install project dependencies
npm install
# or if using pnpm
pnpm install

# Verify installation
npm run build
```

### Step 3: Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
code .env.local
```

**Required Environment Variables:**
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://etretluugvclmydzlfte.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# AI Provider Keys (for Phase 2)
VITE_OPENAI_API_KEY=your_openai_key
VITE_ANTHROPIC_API_KEY=your_anthropic_key
VITE_GOOGLE_AI_API_KEY=your_google_key

# Development Settings
VITE_NODE_ENV=development
VITE_SECURITY_VERSION=3.1.0
```

### Step 4: Supabase Setup

```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Link to production project
supabase link --project-ref etretluugvclmydzlfte

# Pull remote schema (optional for dev)
supabase db pull
```

### Step 5: Start Development Server

```bash
# Start the development server
npm run dev

# Open in browser
open http://localhost:3000
```

🎉 **Success!** You should see the Agentic Ecosystem dashboard running locally.

## 📋 Project Structure Overview

### **Root Directory Structure**

```
agentic-ecosystem/
├── agentic-ecosystem-phase1/     # Main React application
├── docs/                        # Enhanced documentation
├── truststream-organized/       # Production-ready codebase
├── supabase/                    # Backend functions & migrations
├── user_input_files/            # Project resources & references
└── API_REFERENCE.md             # API documentation
```

### **Phase 1 Frontend Structure**

```
agentic-ecosystem-phase1/
├── src/
│   ├── components/              # React components
│   │   ├── AgentDashboard.tsx   # Main dashboard
│   │   ├── EnhancedTrustAnalytics.tsx
│   │   ├── CommunityDebateInterface.tsx
│   │   ├── WorkflowManager.tsx
│   │   └── TrustVibeDashboard.tsx  # Phase 4 component
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Utilities and config
│   │   └── supabase.ts          # Supabase client
│   └── types/                   # TypeScript definitions
├── docs/                        # Phase-specific documentation
├── public/                      # Static assets
└── package.json                 # Dependencies and scripts
```

### **Backend Structure**

```
supabase/
├── functions/                   # Edge functions (Deno)
│   ├── phase4-trust-calculator/
│   ├── phase4-vibe-analyzer/
│   ├── multi-ai-orchestrator/
│   └── [other functions]/
├── migrations/                  # Database migrations
├── tables/                      # Table definitions
└── seed-data.sql               # Sample data
```

## 🧠 Understanding the Codebase

### **Phase 1: Live Data Integration**

**Key Component**: `EnhancedTrustAnalytics.tsx`

```typescript
// This component was the main focus of Phase 1
// It was converted from mock data to live Supabase integration

const EnhancedTrustAnalytics = () => {
  // Load real trust data from Supabase
  const loadRealTrustData = async () => {
    const { data: trustData } = await supabase
      .from('trust_network_analytics')
      .select(`
        user_id, trust_score, network_size, influence_score,
        profiles(username, full_name, avatar_url)
      `)
      .order('trust_score', { ascending: false })
    
    return trustData
  }
  
  // Component renders live trust analytics
  return (
    <div className="trust-analytics">
      {/* Real-time trust score visualizations */}
    </div>
  )
}
```

**Key Database Tables:**
- `trust_network_analytics` - Trust scores and metrics
- `profiles` - User profile information
- `user_vibe_ratings` - Community contribution data

### **Phase 2: Multi-AI Orchestration**

**Key Edge Function**: `multi-ai-orchestrator`

```typescript
// Edge function that routes requests to multiple AI providers
const orchestrateAIRequest = async (request: AIRequest) => {
  const providers = ['openai', 'anthropic', 'google']
  
  for (const provider of providers) {
    try {
      const response = await callAIProvider(provider, request)
      if (response.success) {
        await logProviderSuccess(provider, response)
        return response
      }
    } catch (error) {
      await logProviderError(provider, error)
      continue // Try next provider
    }
  }
  
  throw new Error('All AI providers failed')
}
```

### **Phase 3: Inter-Layer Management**

**Key Component**: `WorkflowManager.tsx`

```typescript
// Manages agent coordination and task distribution
const WorkflowManager = () => {
  const [agents, setAgents] = useState([])
  const [tasks, setTasks] = useState([])
  
  // Real-time agent coordination
  useEffect(() => {
    const subscription = supabase
      .from('agent_coordination')
      .on('*', (payload) => {
        // Update agent status in real-time
        handleAgentUpdate(payload)
      })
      .subscribe()
    
    return () => subscription.unsubscribe()
  }, [])
  
  return (
    <div className="workflow-manager">
      {/* Agent coordination interface */}
    </div>
  )
}
```

### **Phase 4: Trust-Vibe System**

**Key Component**: `TrustVibeDashboard.tsx`

```typescript
// Advanced trust scoring with 0.00-5.00 precision
const TrustVibeDashboard = () => {
  const [trustScore, setTrustScore] = useState(0.00)
  const [vibeAnalysis, setVibeAnalysis] = useState(null)
  
  // Calculate precise trust score
  const calculateTrustScore = async (userId: string) => {
    const response = await fetch('/functions/v1/phase4-trust-calculator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'calculate_trust_score', userId })
    })
    
    const { trust_score } = await response.json()
    setTrustScore(trust_score) // e.g., 3.47, 4.92
  }
  
  return (
    <div className="trust-vibe-dashboard">
      {/* Precision trust visualization */}
      <TrustScoreDisplay score={trustScore} />
      <VibeAnalysisChart data={vibeAnalysis} />
    </div>
  )
}
```

## 📊 Database Schema Quick Reference

### **Core Tables You'll Work With**

```sql
-- User profiles and trust scores
profiles {
  id: UUID (Primary Key)
  username: VARCHAR(50)
  trust_score: INTEGER (0-100)
  is_active: BOOLEAN
  created_at: TIMESTAMP
}

-- Trust analytics (Phase 1 & 4)
trust_network_analytics {
  id: UUID
  user_id: UUID (FK to profiles)
  trust_score: DECIMAL(3,2) -- Phase 4 precision
  network_size: INTEGER
  influence_score: DECIMAL(5,2)
}

-- AI agents and coordination (Phase 2 & 3)
ai_agents {
  id: UUID
  name: VARCHAR(100)
  agent_type: VARCHAR(50)
  is_active: BOOLEAN
  configuration: JSONB
}

agent_coordination {
  id: UUID
  agent_id: UUID (FK)
  user_id: UUID (FK)
  task_type: VARCHAR(50)
  status: VARCHAR(20)
  created_at: TIMESTAMP
}

-- Community features
community_debate_threads {
  id: UUID
  title: VARCHAR(255)
  description: TEXT
  creator_id: UUID (FK)
  is_active: BOOLEAN
}
```

### **Common Query Patterns**

```typescript
// Get user trust data
const getUserTrustData = async (userId: string) => {
  const { data } = await supabase
    .from('trust_network_analytics')
    .select(`
      trust_score,
      network_size,
      influence_score,
      profiles(username, full_name)
    `)
    .eq('user_id', userId)
    .single()
  
  return data
}

// Get active AI agents
const getActiveAgents = async () => {
  const { data } = await supabase
    .from('ai_agents')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  
  return data
}

// Real-time subscription example
const subscribeToAgentUpdates = () => {
  return supabase
    .from('agent_coordination')
    .on('UPDATE', (payload) => {
      console.log('Agent status updated:', payload.new)
    })
    .subscribe()
}
```

## 🔄 Development Workflow

### **Daily Development Process**

1. **Start Your Day**
   ```bash
   # Pull latest changes
   git pull origin main
   
   # Start development server
   npm run dev
   
   # Check system status
   npm run health-check
   ```

2. **Feature Development**
   ```bash
   # Create feature branch
   git checkout -b feature/your-feature-name
   
   # Make changes and test
   npm run test
   npm run lint
   
   # Commit changes
   git add .
   git commit -m "feat: add your feature description"
   ```

3. **Testing Before Push**
   ```bash
   # Run full test suite
   npm run test:all
   npm run test:security
   npm run build
   
   # Check TypeScript
   npm run type-check
   ```

### **Working with Edge Functions**

```bash
# Develop edge functions locally
supabase functions serve

# Test a specific function
curl -X POST 'http://localhost:54321/functions/v1/phase4-trust-calculator' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "calculate_trust_score",
    "userId": "test-user-id"
  }'

# Deploy functions to production
supabase functions deploy phase4-trust-calculator
```

### **Database Migrations**

```bash
# Create new migration
supabase migration new your_migration_name

# Apply migrations locally
supabase db reset

# Apply to production (careful!)
supabase db push
```

## 🧪 Testing Guidelines

### **Test Structure**

```typescript
// Component testing example
import { render, screen, fireEvent } from '@testing-library/react'
import { TrustVibeDashboard } from '../TrustVibeDashboard'

describe('TrustVibeDashboard', () => {
  it('displays trust score correctly', async () => {
    render(<TrustVibeDashboard userId="test-user" />)
    
    // Wait for data to load
    await screen.findByText(/Trust Score:/)
    
    // Check if score is displayed with proper precision
    expect(screen.getByText(/\d+\.\d{2}/)).toBeInTheDocument()
  })
  
  it('handles vibe analysis submission', async () => {
    render(<TrustVibeDashboard userId="test-user" />)
    
    const input = screen.getByPlaceholderText('Enter message to analyze')
    const button = screen.getByRole('button', { name: /Analyze Vibe/ })
    
    fireEvent.change(input, { target: { value: 'This is a positive message!' } })
    fireEvent.click(button)
    
    await screen.findByText(/Vibe Category: very_positive/)
  })
})
```

### **Running Tests**

```bash
# Unit tests
npm run test

# Component tests
npm run test:components

# Edge function tests
npm run test:functions

# End-to-end tests
npm run test:e2e

# Security tests
npm run test:security
```

## 🚀 Deployment Process

### **Development to Staging**

```bash
# Build for staging
NODE_ENV=staging npm run build

# Deploy to staging environment
npm run deploy:staging

# Run staging tests
npm run test:staging
```

### **Staging to Production**

```bash
# Final production build
NODE_ENV=production npm run build

# Deploy to production
npm run deploy:production

# Verify deployment
npm run verify:production
```

## 📚 Learning Resources

### **Phase-Specific Documentation**
- **[Phase 1 Report](../agentic-ecosystem-phase1/docs/PHASE_1_COMPLETION_REPORT.md)** - Live data integration details
- **[Phase 4 Report](../docs/Phase4_Trust_Vibe_System_Implementation_Report.md)** - Trust-vibe system implementation
- **[API Reference](../API_REFERENCE.md)** - Complete API documentation
- **[Database Schema](./database-complete.md)** - Comprehensive database guide

### **External Resources**
- **[React Documentation](https://react.dev/)** - React best practices
- **[Supabase Docs](https://supabase.com/docs)** - Backend platform guide
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)** - TypeScript reference
- **[Tailwind CSS](https://tailwindcss.com/docs)** - Styling framework

## 🎆 Common Development Tasks

### **Adding a New Component**

1. Create component file in `src/components/`
2. Add TypeScript interfaces for props
3. Implement component with Tailwind styling
4. Add to parent component or router
5. Write component tests
6. Update documentation if needed

### **Adding a New Database Table**

1. Create migration: `supabase migration new add_new_table`
2. Define table schema with RLS policies
3. Add table to TypeScript types
4. Create utility functions for table operations
5. Test locally before deploying
6. Update API documentation

### **Adding a New Edge Function**

1. Create function directory in `supabase/functions/`
2. Implement function logic in `index.ts`
3. Add proper error handling and validation
4. Test locally with `supabase functions serve`
5. Deploy with `supabase functions deploy`
6. Update API reference documentation

## ⚠️ Common Gotchas

1. **Environment Variables**: Always use `VITE_` prefix for frontend variables
2. **RLS Policies**: Remember to create RLS policies for new tables
3. **TypeScript**: Keep types up to date with database schema changes
4. **Edge Functions**: Use Deno imports, not Node.js modules
5. **CORS**: Configure CORS headers for edge functions
6. **Trust Scores**: Phase 4 uses DECIMAL(3,2) for 0.00-5.00 precision

## 🚑 Getting Help

**Documentation**:
- Check [troubleshooting guide](./troubleshooting.md) first
- Review relevant phase documentation
- Check API reference for endpoint details

**Code Issues**:
- Search existing issues in repository
- Check commit history for similar changes
- Review test files for usage examples

**Architecture Questions**:
- Review [system architecture](./system-architecture.md)
- Check phase integration documentation
- Review database relationship diagrams

---

**Welcome to the team!** 🎉  
**Start building amazing AI-powered experiences!** 🚀  

**Next Steps:**
1. Complete the environment setup
2. Explore the codebase structure
3. Run your first successful build
4. Make a small test change
5. Review your assigned phase documentation

You're ready to contribute to the Agentic Ecosystem! 💪