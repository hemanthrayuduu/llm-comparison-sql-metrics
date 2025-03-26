import axios from 'axios';

// Define the types for our API responses
export interface ModelResponse {
  provider?: string;
  model: string;
  prompt?: string;
  response: string;
  explanation?: string;
  executionTime?: number;
  responseLength?: number;
  sqlQualityScore?: number;
  memoryUsage?: number;
  tokensGenerated?: number;
  tokensPerSecond?: number;
  complexityEstimate?: string;
  executionAccuracy?: number;
  exactMathAccuracy?: number;
  validEfficiencyScore?: number;
  rawResponse?: string;
  inferenceLatency?: number;
  complexityHandling?: number;
  zeroShotPerformance?: number;
}

export interface QueryRequest {
  query: string;
  schema?: string;
}

// API Keys - In a production app, these should be in environment variables
const API_KEYS = {
  OPENAI: import.meta.env.VITE_OPENAI_API_KEY || 'your-openai-api-key',
  OPENAI_FINETUNED: import.meta.env.VITE_OPENAI_API_KEY || 'your-openai-api-key',
  GPT4O_MINI: import.meta.env.VITE_OPENAI_API_KEY || 'your-openai-api-key',
};

// Model configuration
export const MODEL_CONFIG = {
  GPT_BASE: {
    name: 'GPT-3.5 Turbo (Base)',
    provider: 'OpenAI',
    isFineTuned: false
  },
  GPT_FINETUNED: {
    name: 'GPT-3.5 Turbo (Fine-tuned)',
    provider: 'OpenAI',
    isFineTuned: true
  },
  GPT4O_MINI_BASE: {
    name: 'GPT-4o-mini (Base)',
    provider: 'Together',
    isFineTuned: false
  },
  GPT4O_MINI_FINETUNED: {
    name: 'GPT-4o-mini (Fine-tuned)',
    provider: 'Together',
    isFineTuned: true
  }
};

// Helper function to round numbers to 2 decimal places
const roundToTwoDecimals = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Mock function to simulate model responses
const mockModelResponse = async (_modelName: string, prompt: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  return `SELECT * FROM users WHERE query = '${prompt}' LIMIT 10;`;
};

// Function to query models sequentially
export const sequentialQueryModels = async (
  prompt: string,
  modelsOrSchema?: ModelConfig[] | string,
  _schema?: string | null,
  _expectedSql?: string | null
): Promise<ModelResponse[] | { gptBase: ModelResponse; gptFinetuned: ModelResponse; gpt4oMiniBase: ModelResponse; gpt4oMiniFinetuned: ModelResponse }> => {
  if (typeof modelsOrSchema === 'string' || modelsOrSchema === undefined) {
    console.log('Using backward compatibility mode for sequentialQueryModels');
  
    console.log('Step 1: Querying GPT 3.5 Base model...');
    const gptBaseResult = await mockModelResponse(MODEL_CONFIG.GPT_BASE.name, prompt);
  
    console.log('Step 2: Querying GPT 3.5 Fine-tuned model...');
    const gptFinetunedResult = await mockModelResponse(MODEL_CONFIG.GPT_FINETUNED.name, prompt);
  
    console.log('Step 3: Querying GPT-4o-mini Base model...');
    const gpt4oMiniBaseResult = await mockModelResponse(MODEL_CONFIG.GPT4O_MINI_BASE.name, prompt);
  
    console.log('Step 4: Querying GPT-4o-mini Fine-tuned model...');
    const gpt4oMiniFinetunedResult = await mockModelResponse(MODEL_CONFIG.GPT4O_MINI_FINETUNED.name, prompt);
    
    const createResponse = (response: string, model: string, provider: string): ModelResponse => {
      const executionTime = Math.random() * 1000;
      const tokensGenerated = Math.floor(response.length / 4);
      const tokensPerSecond = tokensGenerated / (executionTime / 1000);
      
      return {
        provider,
        model,
        prompt,
        response,
        executionTime: roundToTwoDecimals(executionTime),
        responseLength: response.length,
        sqlQualityScore: 85,
        executionAccuracy: 90,
        exactMathAccuracy: 95,
        validEfficiencyScore: 88,
        complexityEstimate: 'Moderate',
        tokensGenerated,
        tokensPerSecond: roundToTwoDecimals(tokensPerSecond)
      };
    };

    return {
      gptBase: createResponse(gptBaseResult, MODEL_CONFIG.GPT_BASE.name, MODEL_CONFIG.GPT_BASE.provider),
      gptFinetuned: createResponse(gptFinetunedResult, MODEL_CONFIG.GPT_FINETUNED.name, MODEL_CONFIG.GPT_FINETUNED.provider),
      gpt4oMiniBase: createResponse(gpt4oMiniBaseResult, MODEL_CONFIG.GPT4O_MINI_BASE.name, MODEL_CONFIG.GPT4O_MINI_BASE.provider),
      gpt4oMiniFinetuned: createResponse(gpt4oMiniFinetunedResult, MODEL_CONFIG.GPT4O_MINI_FINETUNED.name, MODEL_CONFIG.GPT4O_MINI_FINETUNED.provider)
    };
  }

  const responses: ModelResponse[] = [];
  const models = modelsOrSchema as ModelConfig[];

  for (const model of models) {
    try {
      const startTime = Date.now();
      const response = await mockModelResponse(model.name, prompt);
      const executionTime = Date.now() - startTime;
      const tokensGenerated = Math.floor(response.length / 4);
      const tokensPerSecond = tokensGenerated / (executionTime / 1000);

      const modelResponse: ModelResponse = {
        provider: model.provider,
        model: model.name,
        prompt,
        response,
        executionTime: roundToTwoDecimals(executionTime),
        responseLength: response.length,
        sqlQualityScore: 85,
        executionAccuracy: 90,
        exactMathAccuracy: 95,
        validEfficiencyScore: 88,
        complexityEstimate: 'Moderate',
        tokensGenerated,
        tokensPerSecond: roundToTwoDecimals(tokensPerSecond)
      };
      
      responses.push(modelResponse);
    } catch (error) {
      const errorResponse: ModelResponse = {
        provider: model.provider,
        model: model.name,
        prompt,
        response: `Error: ${error instanceof Error ? error.message : String(error)}`,
        executionTime: 0,
        responseLength: 0,
        sqlQualityScore: 0,
        executionAccuracy: 0,
        exactMathAccuracy: 0,
        validEfficiencyScore: 0,
        complexityEstimate: 'N/A',
        tokensGenerated: 0,
        tokensPerSecond: 0
      };
      responses.push(errorResponse);
    }
  }
  
  return responses;
};

// Define the ModelConfig interface
interface ModelConfig {
  provider: string;
  name: string;
  isFineTuned?: boolean;
}

// Export the functions we want to expose
export const queryModel = sequentialQueryModels;
export const queryGptBase = (prompt: string) => sequentialQueryModels(prompt, [MODEL_CONFIG.GPT_BASE]);
export const queryGptFinetuned = (prompt: string) => sequentialQueryModels(prompt, [MODEL_CONFIG.GPT_FINETUNED]);
export const queryGpt4oMiniBase = (prompt: string) => sequentialQueryModels(prompt, [MODEL_CONFIG.GPT4O_MINI_BASE]);
export const queryGpt4oMiniFinetuned = (prompt: string) => sequentialQueryModels(prompt, [MODEL_CONFIG.GPT4O_MINI_FINETUNED]);

export default {
  queryModel,
  queryGptBase,
  queryGptFinetuned,
  queryGpt4oMiniBase,
  queryGpt4oMiniFinetuned
};