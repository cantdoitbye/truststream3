/**
 * AI Service Abstraction Layer
 * Main export file for AI service components
 */

// Local LLM Interface
export {
  ILocalLLMInterface,
  LocalLLMConfig,
  LocalLLMRequest,
  LocalLLMResponse,
  OllamaLLMInterface,
  createLocalLLMInterface,
  createLocalLLMInterfaceFromEnv
} from './LocalLLMInterface';

// Hybrid AI Service
export {
  HybridAIService,
  HybridAIConfig,
  HybridAIRequest,
  HybridAIResponse,
  createHybridAIService
} from './HybridAIService';

// Default export for convenience
import { createHybridAIService } from './HybridAIService';
import { createLocalLLMInterfaceFromEnv } from './LocalLLMInterface';

const AIService = {
  createHybridAIService,
  createLocalLLMInterfaceFromEnv
};

export default AIService;