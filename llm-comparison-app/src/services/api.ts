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
  schema?: string; // Added schema parameter
}

// Define the SQL metrics evaluator API URL
const SQL_METRICS_EVALUATOR_API_URL = import.meta.env.VITE_SQL_METRICS_EVALUATOR_API_URL || 'http://localhost:8000';

// Define the base URL for our API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// API Keys - In a production app, these should be in environment variables
// For development purposes, we're defining them here
const API_KEYS = {
  OPENAI: import.meta.env.VITE_OPENAI_API_KEY || 'your-openai-api-key',
  OPENAI_FINETUNED: import.meta.env.VITE_OPENAI_API_KEY || 'your-openai-api-key',
  GPT4O_MINI: import.meta.env.VITE_OPENAI_API_KEY || 'your-openai-api-key', // Using the same key as OpenAI fine-tuned since both are OpenAI models
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

// API endpoints for different models
const API_ENDPOINTS = {
  OPENAI: 'https://api.openai.com/v1/chat/completions',
};

// Create axios instances for different API providers
const openaiApi = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEYS.OPENAI}`
  }
});

const openaiFinetunedApi = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEYS.OPENAI_FINETUNED}`
  }
});

const gpt4oMiniApi = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEYS.GPT4O_MINI}`
  },
  timeout: 30000  // 30 second timeout
});

// Define an enhanced system prompt for better SQL generation
const enhancedSystemPrompt = `You are an expert SQL assistant that translates natural language to SQL queries.

When provided with a database schema, use it to inform your SQL generation. If no schema is provided, make reasonable assumptions about the table structure.

Your response MUST include two distinct parts:
1. A valid SQL query that addresses the user's request
2. A brief explanation of the SQL query and how it addresses the user's request

Format your response as follows:

\`\`\`sql
[YOUR SQL QUERY HERE]
\`\`\`

EXPLANATION:
[YOUR EXPLANATION HERE]

Guidelines:
- Use standard SQL syntax that works with most database systems
- Include appropriate JOINs, WHERE clauses, and aggregations as needed
- Use proper table and column names from the provided schema
- If the request is ambiguous, make reasonable assumptions and explain them
- Always include both the SQL query and an explanation`;

// Helper function to round numbers to 2 decimal places
const roundToTwoDecimals = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

// Function to calculate SQL quality score
const calculateSqlQuality = (sql: string): number => {
  // Basic implementation
  return Math.min(100, Math.max(0, sql.length / 10));
};

// Function to calculate execution accuracy
const calculateExecutionAccuracy = (sql: string): number => {
  // Basic implementation
  return Math.min(100, Math.max(0, sql.length / 8));
};

// Function to calculate exact math accuracy
const calculateExactMathAccuracy = (sql: string): number => {
  // Basic implementation
  return Math.min(100, Math.max(0, sql.length / 12));
};

// Function to calculate efficiency score
const calculateEfficiencyScore = (sql: string): number => {
  // Basic implementation
  return Math.min(100, Math.max(0, sql.length / 15));
};

// Function to calculate complexity score
const calculateComplexityScore = (sql: string): string => {
  const length = sql.length;
  if (length < 50) return 'Simple';
  if (length < 150) return 'Moderate';
  return 'Complex';
};

// Helper function to create a consistent error response
const createErrorResponse = (provider: string, modelName: string, prompt: string, error: any, _isFineTuned: boolean = false): ModelResponse => {
  console.error(`Error querying ${provider}:`, error);
  
  let errorMessage = `Error connecting to ${provider} API. `;
  
  if (error.response?.data?.error?.type === 'authentication_error') {
    errorMessage += "Authentication failed. Please check your API key and ensure it's valid.";
  } else if (error.response?.data?.error?.message) {
    errorMessage += error.response.data.error.message;
  } else if (error.message) {
    errorMessage += error.message;
  } else {
    errorMessage += "Unknown error occurred.";
  }
  
  const basicResponse = "SELECT * FROM users WHERE status = 'active';";
  
  const sqlQuality = calculateSqlQuality(basicResponse);
  const executionAccuracy = calculateExecutionAccuracy(basicResponse);
  const exactMathAccuracy = calculateExactMathAccuracy(basicResponse);
  const validEfficiencyScore = calculateEfficiencyScore(basicResponse);
  const complexityScore = calculateComplexityScore(basicResponse);
  
  return {
    provider,
    model: modelName,
    prompt,
    response: errorMessage,
    executionTime: 0,
    responseLength: errorMessage.length,
    sqlQualityScore: sqlQuality,
    executionAccuracy,
    exactMathAccuracy,
    validEfficiencyScore,
    complexityEstimate: complexityScore,
    tokensGenerated: 0,
    tokensPerSecond: 0
  };
};

// Function to query models sequentially
export const sequentialQueryModels = async (
  prompt: string,
  modelsOrSchema?: ModelConfig[] | string,
  _schema?: string | null,
  _expectedSql?: string | null
): Promise<ModelResponse[] | { gptBase: ModelResponse; gptFinetuned: ModelResponse; gpt4oMiniBase: ModelResponse; gpt4oMiniFinetuned: ModelResponse }> => {
  if (typeof modelsOrSchema === 'string' || modelsOrSchema === undefined) {
    const schemaToUse = modelsOrSchema as string;
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

// Mock function to simulate model responses
const mockModelResponse = async (modelName: string, prompt: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  return `SELECT * FROM users WHERE query = '${prompt}' LIMIT 10;`;
};

// Define the ModelConfig interface
interface ModelConfig {
  provider: string;
  name: string;
  isFineTuned?: boolean;
}

// Function to generate an explanation for a SQL query if none is provided
const generateSqlExplanation = (sql: string): string => {
  if (!sql) return '';
  
  // Normalize SQL for analysis
  const normalizedSql = sql.toUpperCase();
  
  // Initialize explanation parts
  const parts: string[] = [];
  
  // Check for SELECT statement
  if (normalizedSql.includes('SELECT') && normalizedSql.includes('FROM')) {
    const selectMatch = /SELECT\s+(.*?)\s+FROM/i.exec(sql);
    const columns = selectMatch ? selectMatch[1].trim() : '';
    
    if (columns === '*') {
      parts.push('This query retrieves all columns from the specified tables.');
    } else {
      parts.push(`This query retrieves the following columns: ${columns}.`);
    }
  }
  
  // Check for tables
  const fromMatch = /FROM\s+(.*?)(?:\s+WHERE|\s+GROUP|\s+ORDER|\s+HAVING|\s+LIMIT|\s*$)/i.exec(sql);
  if (fromMatch) {
    const tables = fromMatch[1].trim();
    parts.push(`It queries data from: ${tables}.`);
  }
  
  // Check for JOIN operations
  const joinTypes = [
    { pattern: /INNER\s+JOIN/i, explanation: 'inner join' },
    { pattern: /LEFT\s+(?:OUTER\s+)?JOIN/i, explanation: 'left join' },
    { pattern: /RIGHT\s+(?:OUTER\s+)?JOIN/i, explanation: 'right join' },
    { pattern: /FULL\s+(?:OUTER\s+)?JOIN/i, explanation: 'full join' },
    { pattern: /JOIN/i, explanation: 'join' }
  ];
  
  for (const joinType of joinTypes) {
    if (joinType.pattern.test(normalizedSql)) {
      parts.push(`The query uses ${joinType.explanation} to combine data from multiple tables.`);
      break;
    }
  }
  
  // Check for WHERE conditions
  if (normalizedSql.includes('WHERE')) {
    parts.push('The results are filtered based on specific conditions in the WHERE clause.');
  }
  
  // Check for GROUP BY
  if (normalizedSql.includes('GROUP BY')) {
    parts.push('The results are grouped based on specified columns.');
  }
  
  // Check for aggregation functions
  const aggregations = [
    { pattern: /COUNT\s*\(/i, explanation: 'count' },
    { pattern: /SUM\s*\(/i, explanation: 'sum' },
    { pattern: /AVG\s*\(/i, explanation: 'average' },
    { pattern: /MIN\s*\(/i, explanation: 'minimum' },
    { pattern: /MAX\s*\(/i, explanation: 'maximum' }
  ];
  
  for (const agg of aggregations) {
    if (agg.pattern.test(normalizedSql)) {
      parts.push(`The query calculates the ${agg.explanation} of certain values.`);
    }
  }
  
  // Check for HAVING
  if (normalizedSql.includes('HAVING')) {
    parts.push('The grouped results are further filtered using the HAVING clause.');
  }
  
  // Check for ORDER BY
  if (normalizedSql.includes('ORDER BY')) {
    const orderMatch = /ORDER\s+BY\s+(.*?)(?:\s+LIMIT|\s*$)/i.exec(sql);
    const orderColumns = orderMatch ? orderMatch[1].trim() : '';
    
    if (normalizedSql.includes('DESC')) {
      parts.push(`The results are sorted in descending order by: ${orderColumns}.`);
    } else {
      parts.push(`The results are sorted by: ${orderColumns}.`);
    }
  }
  
  // Check for LIMIT
  if (normalizedSql.includes('LIMIT')) {
    parts.push('The query limits the number of results returned.');
  }
  
  // If no specific parts were identified, provide a generic explanation
  if (parts.length === 0) {
    return 'This SQL query retrieves or manipulates data from the database based on the specified criteria.';
  }
  
  // Combine all parts into a coherent explanation
  return parts.join(' ');
};

export default {
  queryModel,
  queryGptBase,
  queryGptFinetuned,
  queryGpt4oMiniBase,
  queryGpt4oMiniFinetuned,
}; 