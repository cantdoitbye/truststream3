# Chat-to-RAG Agent Creation MCP Server

A conversational interface for creating RAG-based AI agents with automatic configuration, knowledge base setup, and seamless TrustStream integration.

## Features

### 🗣️ Conversational Interface
- Natural language requirement gathering
- Interactive RAG configuration guidance
- Step-by-step agent creation workflow
- Template selection and customization

### 🧠 Knowledge Base Management
- Document processing (PDF, DOCX, TXT, MD)
- Web scraping and content extraction
- Embedding generation and storage
- Vector database configuration

### 🤖 Agent Generation
- RAG-specific agent templates
- Custom tool generation
- Retrieval strategy configuration
- Performance optimization

### 💰 TrustStream Integration
- Cost estimation and transparency
- Ooumph coin credit management
- Deployment integration
- Usage tracking

## Tools Available

### Conversation Management
- `start_rag_conversation`: Begin RAG agent creation process
- `continue_conversation`: Continue existing conversation
- `get_conversation_summary`: Get current conversation state

### Requirements Gathering
- `analyze_requirements`: Process user requirements
- `suggest_rag_templates`: Recommend suitable templates
- `estimate_rag_costs`: Calculate costs for RAG setup

### Knowledge Base Creation
- `process_documents`: Handle document upload and processing
- `create_knowledge_base`: Set up vector database
- `configure_embeddings`: Configure embedding strategy
- `test_retrieval`: Test knowledge base retrieval

### Agent Configuration
- `generate_rag_agent`: Create RAG agent configuration
- `customize_retrieval`: Configure retrieval parameters
- `add_rag_tools`: Add specialized RAG tools
- `validate_agent_config`: Validate agent configuration

### TrustStream Integration
- `calculate_deployment_cost`: Estimate deployment costs
- `check_user_credits`: Verify sufficient credits
- `deploy_rag_agent`: Deploy agent to TrustStream
- `track_agent_usage`: Monitor agent performance

## Quick Start

1. **Start Conversation**:
   ```python
   # Begin RAG agent creation
   result = await start_rag_conversation(
       user_description="I need a customer support chatbot for my SaaS product"
   )
   ```

2. **Process Requirements**:
   ```python
   # Analyze and expand requirements
   analysis = await analyze_requirements(
       conversation_id=result['conversation_id'],
       requirements="Handle technical questions, integrate with help docs"
   )
   ```

3. **Create Knowledge Base**:
   ```python
   # Process documentation
   kb_result = await process_documents(
       conversation_id=conversation_id,
       document_sources=['help_docs/', 'api_docs.pdf']
   )
   ```

4. **Generate Agent**:
   ```python
   # Create RAG agent
   agent = await generate_rag_agent(
       conversation_id=conversation_id,
       template='customer_support'
   )
   ```

5. **Deploy**:
   ```python
   # Deploy to TrustStream
   deployment = await deploy_rag_agent(
       conversation_id=conversation_id,
       deployment_config={'type': 'container'}
   )
   ```

## Configuration

### Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# TrustStream Integration
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TRUSTSTREAM_BACKEND_URL=your-backend-url

# Vector Database
CHROMA_PERSIST_DIRECTORY=./chroma_db

# Cost Configuration
BASE_RAG_COST=0.01
EMBEDDING_COST_PER_TOKEN=0.0001
STORAGE_COST_PER_MB=0.001
```

### Deployment Configuration

The MCP server integrates with existing TrustStream deployment infrastructure:

- **Container Deployment**: Docker-based deployment with resource limits
- **Serverless**: Event-driven execution for cost efficiency
- **Edge**: Low-latency deployment for real-time interactions

## RAG Templates

### 1. Customer Support
- Knowledge base: Help docs, FAQs, troubleshooting guides
- Retrieval: Semantic search with fallback to keyword matching
- Tools: Ticket creation, escalation, user lookup

### 2. Documentation Q&A
- Knowledge base: Technical documentation, API specs
- Retrieval: Hierarchical retrieval with code examples
- Tools: Code generation, API testing, documentation updates

### 3. Research Assistant
- Knowledge base: Research papers, articles, reports
- Retrieval: Multi-hop reasoning, citation tracking
- Tools: Literature search, summary generation, fact checking

### 4. Product Expert
- Knowledge base: Product specs, user manuals, case studies
- Retrieval: Feature-based search with context
- Tools: Recommendation engine, comparison analysis

## Cost Structure

### Base Costs
- Conversation management: 0.001 ooumph coins per message
- Document processing: 0.01 ooumph coins per MB
- Embedding generation: 0.0001 ooumph coins per token
- Knowledge base storage: 0.001 ooumph coins per MB/day

### Agent Deployment
- Container: 0.1 ooumph coins per hour
- Serverless: 0.01 ooumph coins per request
- Edge: 0.05 ooumph coins per hour

### Usage Costs
- RAG query: 0.001-0.01 ooumph coins (based on complexity)
- Knowledge base update: 0.005 ooumph coins per update
- Agent customization: 0.02 ooumph coins per modification

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  User Interface │────│   MCP Server    │────│  TrustStream    │
│                 │    │                 │    │   Backend       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                        ┌─────────────────┐
                        │ Knowledge Base  │
                        │ (ChromaDB)      │
                        └─────────────────┘
                                │
                        ┌─────────────────┐
                        │ Vector Database │
                        │ & Embeddings    │
                        └─────────────────┘
```

## License

Integrated with TrustStream enterprise platform.
