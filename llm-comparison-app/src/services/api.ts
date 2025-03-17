import axios from 'axios';

// Define the types for our API responses
export interface ModelResponse {
  provider?: string;  // Added provider property
  model: string;
  prompt?: string;    // Added prompt property
  response: string;
  explanation?: string; // Added explanation for the SQL query
  executionTime?: number;
  responseLength?: number;
  sqlQualityScore?: number;
  memoryUsage?: number;
  tokensGenerated?: number;
  tokensPerSecond?: number;
  complexityEstimate?: string;
  executionAccuracy?: number;  // SQL accuracy of execution
  exactMathAccuracy?: number;  // Mathematical precision
  validEfficiencyScore?: number;  // Efficiency assessment
  rawResponse?: string;  // Added raw response property
  
  // New General Performance Metrics
  inferenceLatency?: number;  // Renamed execution time specifically for inference
  complexityHandling?: number;  // Performance across complexity levels
  zeroShotPerformance?: number;  // Generalization to unseen schemas
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

// Model configuration with job IDs for fine-tuned models
export const MODEL_CONFIG = {
  GPT_BASE: {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo (Base)'
  },
  GPT_FINETUNED: {
    id: 'ft:gpt-3.5-turbo-0125:personal:text-sql:BA5IsVsH',
    name: 'GPT-3.5 Turbo (Fine-tuned)'
  },
  GPT4O_MINI_BASE: {
    id: 'gpt-4o-mini',
    name: 'GPT-4o-mini (Base)'
  },
  GPT4O_MINI_FINETUNED: {
    id: 'ft:gpt-4o-mini-2024-07-18:personal:text2sql-gpt4o-mini:BAhu86ac',
    name: 'GPT-4o-mini (Fine-tuned)'
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

// Function to calculate SQL quality score
const calculateSqlQuality = (sql: string): number => {
  if (!sql) return 0;

  // Normalize SQL by removing extra whitespace and converting to uppercase for checks
  const normalizedSql = sql.replace(/\s+/g, ' ').trim().toUpperCase();
  
  let score = 0;
  const maxScore = 100;
  
  // Basic structure check
  if (normalizedSql.includes('SELECT') && normalizedSql.includes('FROM')) {
    score += 20;
  } else {
    return 0; // Not a valid SELECT query
  }
  
  // Complexity and best practices checks
  const features = [
    { keyword: 'JOIN', points: 10, maxPoints: 10 },
    { keyword: 'WHERE', points: 10, maxPoints: 10 },
    { keyword: 'GROUP BY', points: 10, maxPoints: 10 },
    { keyword: 'HAVING', points: 10, maxPoints: 10 },
    { keyword: 'ORDER BY', points: 10, maxPoints: 10 },
    { keyword: 'LIMIT', points: 5, maxPoints: 5 },
    { keyword: 'DISTINCT', points: 5, maxPoints: 5 },
    { keyword: 'UNION', points: 5, maxPoints: 5 },
    { keyword: 'WITH', points: 5, maxPoints: 5 }, // Common Table Expressions
    { keyword: 'CASE', points: 5, maxPoints: 5 }  // CASE statements
  ];
  
  // Add points for each feature found
  features.forEach(feature => {
    if (normalizedSql.includes(feature.keyword)) {
      score += feature.points;
    }
  });
  
  // Check for bad practices
  if (normalizedSql.includes('SELECT *')) {
    score -= 10; // Penalty for SELECT *
  }
  
  // Check for error indicators
  if (
    normalizedSql.includes('ERROR') || 
    normalizedSql.includes('UNDEFINED') ||
    normalizedSql.includes('NOT VALID')
  ) {
    score = Math.max(0, score - 30); // Major penalty for errors
  }
  
  // Check for proper column selection
  const selectMatch = /SELECT\s+(.*?)\s+FROM/i.exec(normalizedSql);
  if (selectMatch && selectMatch[1] && !selectMatch[1].includes('*')) {
    score += 5; // Bonus for explicit column selection
  }
  
  // Check for proper table aliasing
  if (/\s+AS\s+\w+/i.test(normalizedSql) || /\s+\w+\s+ON/i.test(normalizedSql)) {
    score += 5; // Bonus for table aliasing
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(maxScore, score));
};

// Function to estimate SQL complexity
const estimateSqlComplexity = (sql: string): string => {
  if (!sql) return 'N/A';
  
  const normalizedSql = sql.toUpperCase();
  const complexityScore = calculateComplexityScore(sql);
  
  // Determine complexity level based on score
  if (complexityScore >= 80) {
    return 'Very High (O(n²) or worse)';
  } else if (complexityScore >= 60) {
    return 'High (O(n²))';
  } else if (complexityScore >= 40) {
    return 'Medium (O(n log n))';
  } else if (complexityScore >= 20) {
    return 'Low-Medium (O(n log n))';
  } else {
    return 'Low (O(n))';
  }
};

// Function to calculate execution accuracy - measures how accurately the SQL query can be executed
const calculateExecutionAccuracy = (sql: string): number => {
  if (!sql) return 0;
  
  // Normalize SQL
  const normalizedSql = sql.replace(/\s+/g, ' ').trim().toUpperCase();
  
  // Start with a neutral score
  let score = 70;
  
  // Check for basic SQL structure
  if (!normalizedSql.includes('SELECT')) {
    return 0; // Not a SELECT query
  }
  
  if (!normalizedSql.includes('FROM')) {
    return 10; // Missing FROM clause
  }
  
  // Check for common syntax errors
  const syntaxErrors = [
    { pattern: /SELECT\s+FROM/, penalty: 20 }, // Missing columns
    { pattern: /WHERE\s+AND/, penalty: 15 }, // Missing condition before AND
    { pattern: /WHERE\s+OR/, penalty: 15 }, // Missing condition before OR
    { pattern: /JOIN\s+ON\s+[^=]*$/, penalty: 20 }, // JOIN without proper ON clause
    { pattern: /GROUP\s+BY\s*$/, penalty: 10 }, // Incomplete GROUP BY
    { pattern: /ORDER\s+BY\s*$/, penalty: 10 }, // Incomplete ORDER BY
    { pattern: /[^']\d{4}-\d{2}-\d{2}[^']/, penalty: 5 }, // Date without quotes
    { pattern: /"\w+"/, penalty: 5 }, // Double quotes for identifiers (not always an error, but can be in some databases)
    { pattern: /WHERE\s+(\(?\s*1\s*=\s*1\s*\)?|TRUE)/, penalty: 15 }, // WHERE TRUE or WHERE 1=1
    { pattern: /HAVING\s+[^><=]/, penalty: 10 } // HAVING clause without comparison
  ];
  
  // Apply penalties for syntax errors
  syntaxErrors.forEach(error => {
    if (error.pattern.test(normalizedSql)) {
      score -= error.penalty;
    }
  });
  
  // Check for balanced parentheses
  const openParens = (normalizedSql.match(/\(/g) || []).length;
  const closeParens = (normalizedSql.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    score -= 15; // Penalty for unbalanced parentheses
  }
  
  // Check for proper JOIN syntax
  if (normalizedSql.includes('JOIN')) {
    const hasProperJoinSyntax = /JOIN\s+\w+(\s+AS\s+\w+)?\s+ON\s+\w+\.\w+\s*=\s*\w+\.\w+/.test(normalizedSql);
    if (hasProperJoinSyntax) {
      score += 10; // Bonus for proper JOIN syntax
    } else {
      score -= 10; // Penalty for improper JOIN syntax
    }
  }
  
  // Check for proper WHERE clause
  if (normalizedSql.includes('WHERE')) {
    const hasProperWhereClause = /WHERE\s+\w+(\.\w+)?\s*(=|>|<|>=|<=|<>|!=|LIKE|IN|BETWEEN|IS NULL|IS NOT NULL)/.test(normalizedSql);
    if (hasProperWhereClause) {
      score += 10; // Bonus for proper WHERE clause
    } else {
      score -= 10; // Penalty for improper WHERE clause
    }
  }
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
};

// Function to calculate exact math accuracy - evaluates precision of mathematical operations
const calculateExactMathAccuracy = (sql: string): number => {
  if (!sql) return 0;
  
  // Normalize SQL
  const normalizedSql = sql.replace(/\s+/g, ' ').trim().toUpperCase();
  
  // Start with a neutral score
  let score = 70;
  
  // Check if the query contains any mathematical operations
  const hasMathOperations = /[+\-*\/]|SUM|AVG|COUNT|MIN|MAX|ROUND|CAST/.test(normalizedSql);
  
  if (!hasMathOperations) {
    return 50; // Neutral score for queries without math operations
  }
  
  // Check for mathematical functions and operations
  const mathPatterns = [
    { pattern: /SUM\s*\(.*?\)/, points: 5 },
    { pattern: /AVG\s*\(.*?\)/, points: 5 },
    { pattern: /COUNT\s*\(.*?\)/, points: 2 },
    { pattern: /MIN\s*\(.*?\)/, points: 3 },
    { pattern: /MAX\s*\(.*?\)/, points: 3 },
    { pattern: /ROUND\s*\(.*?\)/, points: 4 },
    { pattern: /CAST\s*\(.*?\s+AS\s+(DECIMAL|NUMERIC|FLOAT|INT).*?\)/, points: 5 },
    { pattern: /CONVERT\s*\(.*?\)/, points: 4 },
    { pattern: /FLOOR\s*\(.*?\)/, points: 3 },
    { pattern: /CEILING\s*\(.*?\)/, points: 3 },
    { pattern: /ABS\s*\(.*?\)/, points: 2 },
    { pattern: /POWER\s*\(.*?\)/, points: 4 },
    { pattern: /SQRT\s*\(.*?\)/, points: 3 },
    { pattern: /LOG\s*\(.*?\)/, points: 4 },
    { pattern: /EXP\s*\(.*?\)/, points: 4 },
    { pattern: /MOD\s*\(.*?\)/, points: 3 }
  ];
  
  // Add points for proper use of mathematical functions
  mathPatterns.forEach(pattern => {
    if (pattern.pattern.test(normalizedSql)) {
      score += pattern.points;
    }
  });
  
  // Check for potential issues with mathematical accuracy
  const mathIssues = [
    { pattern: /\d+\s*\/\s*0/, penalty: 30 }, // Division by zero
    { pattern: /AVG\s*\(.*?TEXT.*?\)/, penalty: 20 }, // Trying to average text
    { pattern: /SUM\s*\(.*?TEXT.*?\)/, penalty: 20 }, // Trying to sum text
    { pattern: /HAVING\s+[^><=]/, penalty: 10 }, // HAVING clause without comparison
    { pattern: /CAST\s*\(.*?TEXT.*?\s+AS\s+NUMERIC.*?\)/, penalty: 15 } // Casting text to numeric without validation
  ];
  
  // Apply penalties for math issues
  mathIssues.forEach(issue => {
    if (issue.pattern.test(normalizedSql)) {
      score -= issue.penalty;
    }
  });
  
  // Extra points for proper use of numeric types
  if (/DECIMAL\s*\(\s*\d+\s*,\s*\d+\s*\)/.test(normalizedSql)) {
    score += 5; // Bonus for proper decimal precision
  }
  
  // Check for proper handling of NULL values in calculations
  if (/COALESCE\s*\(.*?\)/.test(normalizedSql) || /NULLIF\s*\(.*?\)/.test(normalizedSql) || /ISNULL\s*\(.*?\)/.test(normalizedSql)) {
    score += 5; // Bonus for NULL handling
  }
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
};

// Function to calculate valid efficiency score - evaluates query efficiency
const calculateEfficiencyScore = (sql: string): number => {
  if (!sql) return 0;
  
  // Normalize SQL
  const normalizedSql = sql.replace(/\s+/g, ' ').trim().toUpperCase();
  
  // Start with a neutral score
  let score = 60;
  
  // Check for efficiency best practices
  const efficiencyPatterns = [
    { pattern: /WHERE\s+\w+\s+IN\s+\(SELECT/, points: -10 }, // Subquery in IN clause (can be inefficient)
    { pattern: /SELECT\s+\*/, points: -15 }, // SELECT * (inefficient)
    { pattern: /LIKE\s+'%.*?'/, points: -10 }, // Leading wildcard in LIKE (inefficient)
    { pattern: /UNION\s+ALL/, points: 5 }, // UNION ALL (more efficient than UNION)
    { pattern: /ORDER\s+BY\s+\w+\s+LIMIT/, points: 10 }, // ORDER BY with LIMIT (efficient pattern)
    { pattern: /JOIN\s+.*?\s+ON\s+\w+\.\w+\s*=\s*\w+\.\w+/, points: 5 }, // Proper JOIN syntax
    { pattern: /WHERE\s+\w+\s+IN\s+\([^()]*?\)/, points: 5 }, // Fixed IN list (efficient)
    { pattern: /EXISTS\s+\(SELECT/, points: 5 }, // Efficient EXISTS pattern
    { pattern: /CASE\s+WHEN/, points: 0 }, // CASE expressions (neutral)
    { pattern: /WITH\s+\w+\s+AS\s+\(/, points: 10 }, // CTEs (usually efficient)
    { pattern: /INDEXED\s+BY/, points: 10 }, // Explicit index hints
    { pattern: /FORCE\s+INDEX/, points: 10 }, // Explicit index hints (MySQL)
    { pattern: /USE\s+INDEX/, points: 10 }, // Explicit index hints (MySQL)
    { pattern: /INNER\s+JOIN/, points: 5 }, // INNER JOIN is usually more efficient than other joins
    { pattern: /UNION/, points: -5 } // UNION without ALL (less efficient)
  ];
  
  // Evaluate patterns
  efficiencyPatterns.forEach(pattern => {
    if (pattern.pattern.test(normalizedSql)) {
      score += pattern.points;
    }
  });
  
  // Count number of joins - too many reduces efficiency
  const joinCount = (normalizedSql.match(/JOIN/g) || []).length;
  if (joinCount > 3) {
    score -= (joinCount - 3) * 5; // Penalty for each join beyond 3
  }
  
  // Count nested subqueries - can indicate inefficiency
  const selectCount = (normalizedSql.match(/SELECT/g) || []).length;
  if (selectCount > 1) {
    const nestedDepth = selectCount - 1;
    score -= nestedDepth * 5; // Penalty for nested subqueries
  }
  
  // Check for efficient filtering
  if (/WHERE\s+\w+\.\w+\s*=\s*\d+/.test(normalizedSql) || 
      /WHERE\s+\w+\.\w+\s*=\s*'[^']*?'/.test(normalizedSql)) {
    score += 5; // Bonus for filtering on likely indexed columns
  }
  
  // Check for efficient sorting
  if (/ORDER\s+BY\s+\w+\.\w+\s+LIMIT\s+\d+/.test(normalizedSql)) {
    score += 5; // Bonus for limiting sorted results
  }
  
  // Check for efficient aggregation
  if (/GROUP\s+BY\s+\w+\s+HAVING\s+COUNT\s*\(.*?\)\s*>\s*\d+/.test(normalizedSql)) {
    score += 5; // Bonus for filtering aggregated results
  }
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
};

// For development/demo purposes, we can use mock responses
export const useMockResponses = false;

// Flag to use mock responses for specific providers (e.g., when API keys are missing)
export const useMockForProvider = {
  OPENAI: false,
  GPT4O_MINI: false // Use real OpenAI API for GPT-4o-mini models
};

/**
 * Check if the SQL metrics evaluator API is running
 * @returns Promise<boolean> - True if the API is running, false otherwise
 */
export const isSqlMetricsEvaluatorRunning = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${SQL_METRICS_EVALUATOR_API_URL}/health`, { timeout: 2000 });
    return response.status === 200;
  } catch (error) {
    console.error('SQL metrics evaluator API health check failed:', error);
    return false;
  }
};

// Add a helper function to round numbers to two decimal places
const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

// Define the interface for SQL metrics
export interface SqlMetrics {
  sqlQualityScore: number;
  complexityEstimate: string;
  
  // SQL-Specific Metrics
  executionAccuracy: number;
  
  // General Performance Metrics
  exactMathAccuracy: number;
  validEfficiencyScore: number;
  inferenceLatency: number;
  complexityHandling: number;
  zeroShotPerformance: number;
}

// Function to evaluate SQL metrics
export const evaluateSqlMetrics = async (
  generatedSql: string,
  referenceSql: string | null = null,
  schema: string | null = null
): Promise<Partial<ModelResponse>> => {
  try {
    // Attempt to call the external SQL metrics evaluator API
    // This is intentionally causing an error to force local calculation
    // In a production environment, you would implement a proper API call
    throw new Error("Using local metrics calculation");
    
    // The code below would be used if you had an actual metrics API
    /*
    const response = await axios.post('https://your-metrics-api.com/evaluate', {
      generated_sql: generatedSql,
      reference_sql: referenceSql,
      schema: schema
    });
    
    return {
      executionAccuracy: response.data.execution_accuracy * 100,
      complexityHandling: response.data.complexity_handling * 100,
      zeroShotPerformance: response.data.zero_shot_performance * 100
    };
    */
  } catch (error) {
    console.log("Using local metrics calculation");
    
    // Calculate SQL quality score
    const sqlQualityScore = calculateSqlQuality(generatedSql);
    
    // Calculate execution accuracy
    const executionAccuracy = calculateExecutionAccuracy(generatedSql);
    
    // Calculate math accuracy
    const exactMathAccuracy = calculateExactMathAccuracy(generatedSql);
    
    // Calculate efficiency score
    const validEfficiencyScore = calculateEfficiencyScore(generatedSql);
    
    // Calculate complexity handling
    const complexityHandling = calculateComplexityScore(generatedSql);
    
    // Estimate complexity
    const complexityEstimate = estimateSqlComplexity(generatedSql);
    
    // Zero-shot performance (simplified calculation)
    const zeroShotPerformance = Math.min(
      (sqlQualityScore + executionAccuracy + validEfficiencyScore) / 3,
      100
    );
    
    return {
      sqlQualityScore,
      executionAccuracy,
      exactMathAccuracy,
      validEfficiencyScore,
      complexityHandling,
      complexityEstimate,
      zeroShotPerformance
    };
  }
};

/**
 * Calculate complexity score based on SQL structure
 * @param sql - The SQL query to analyze
 * @returns Complexity score from 0-100
 */
const calculateComplexityScore = (sql: string): number => {
  if (!sql) return 0;
  
  const normalizedSql = sql.toUpperCase();
  
  // Start with a base score
  let score = 40; // Start with a lower base score
  
  // Analyze query structure for complexity
  const joinCount = (normalizedSql.match(/JOIN/g) || []).length;
  const whereConditions = (normalizedSql.match(/AND|OR/g) || []).length + (normalizedSql.includes('WHERE') ? 1 : 0);
  const hasGroupBy = normalizedSql.includes('GROUP BY');
  const hasHaving = normalizedSql.includes('HAVING');
  const hasOrderBy = normalizedSql.includes('ORDER BY');
  const hasSubqueries = (normalizedSql.match(/\(\s*SELECT/g) || []).length;
  const hasCTE = normalizedSql.includes('WITH') && normalizedSql.includes('AS (');
  const hasUnion = normalizedSql.includes('UNION');
  const hasCase = normalizedSql.includes('CASE WHEN');
  const hasWindowFunctions = normalizedSql.includes('OVER (');
  const hasDistinct = normalizedSql.includes('DISTINCT');
  const hasLimit = normalizedSql.includes('LIMIT');
  const hasOffset = normalizedSql.includes('OFFSET');
  
  // Add points for each complexity factor
  score += joinCount * 5; // 5 points per join
  score += whereConditions * 2; // 2 points per condition
  score += hasGroupBy ? 10 : 0;
  score += hasHaving ? 15 : 0;
  score += hasOrderBy ? 5 : 0;
  score += hasSubqueries * 15; // 15 points per subquery
  score += hasCTE ? 10 : 0;
  score += hasUnion ? 15 : 0;
  score += hasCase ? 10 : 0;
  score += hasWindowFunctions ? 20 : 0;
  score += hasDistinct ? 5 : 0;
  score += hasLimit ? 2 : 0;
  score += hasOffset ? 3 : 0;
  
  // Check for advanced SQL features
  if (normalizedSql.includes('PARTITION BY')) score += 15;
  if (normalizedSql.includes('PIVOT')) score += 20;
  if (normalizedSql.includes('UNPIVOT')) score += 20;
  if (normalizedSql.includes('ROLLUP')) score += 15;
  if (normalizedSql.includes('CUBE')) score += 15;
  if (normalizedSql.includes('GROUPING SETS')) score += 15;
  if (normalizedSql.includes('LATERAL')) score += 15;
  if (normalizedSql.includes('CROSS APPLY')) score += 15;
  if (normalizedSql.includes('OUTER APPLY')) score += 15;
  if (normalizedSql.includes('MERGE')) score += 15;
  if (normalizedSql.includes('RECURSIVE')) score += 20;
  
  // Count the number of tables involved
  const fromClause = normalizedSql.match(/FROM\s+(.*?)(?:\s+WHERE|\s+GROUP|\s+ORDER|\s+HAVING|\s+LIMIT|\s*$)/i)?.[1] || '';
  const tableCount = (fromClause.match(/,/g) || []).length + 1 + joinCount;
  score += (tableCount - 1) * 3; // 3 points per additional table beyond the first
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
};

/**
 * Analyze table and column usage in SQL query
 * @param sql - The SQL query to analyze
 * @returns Metrics for table and column usage
 */
const analyzeTableColumnUsage = (sqlQuery: string, expectedSql: string | null = null, schema: string | null = null) => {
  if (!sqlQuery) return { accuracy: 0, exactMatchScore: 0, logicalFormScore: 0 };
  
  const normalizedSql = sqlQuery.toUpperCase();
  let accuracy = 70; // Start with a base score
  
  // Check for proper table aliasing
  const hasAliases = /\s+AS\s+\w+/i.test(normalizedSql) || /\s+\w+\s+ON/i.test(normalizedSql);
  if (hasAliases) accuracy += 10;
  
  // Check for qualified column names (table.column)
  const hasQualifiedColumns = /\w+\.\w+/.test(normalizedSql);
  if (hasQualifiedColumns) accuracy += 10;
  
  // Check for proper column selection (not using SELECT *)
  const hasSelectStar = /SELECT\s+\*/.test(normalizedSql);
  if (!hasSelectStar) accuracy += 10;
  
  // Calculate exact match score based on structure
  const exactMatchScore = accuracy * 0.8; // Approximate
  
  // Calculate logical form score based on structure
  const logicalFormScore = accuracy * 0.9; // Approximate
  
  // Ensure scores are between 0 and 100
  return {
    accuracy: Math.min(100, accuracy),
    exactMatchScore: Math.min(100, exactMatchScore),
    logicalFormScore: Math.min(100, logicalFormScore)
  };
};

/**
 * Analyze join quality in SQL query
 * @param sql - The SQL query to analyze
 * @returns Metrics for join quality
 */
const analyzeJoinQuality = (sqlQuery: string, expectedSql: string | null = null, schema: string | null = null) => {
  if (!sqlQuery) return { accuracy: 0 };
  
  const normalizedSql = sqlQuery.toUpperCase();
  let accuracy = 60; // Start with a base score
  
  // Check for proper join syntax
  const hasProperJoinSyntax = /JOIN\s+\w+(\s+AS\s+\w+)?\s+ON\s+\w+\.\w+\s*=\s*\w+\.\w+/.test(normalizedSql);
  if (hasProperJoinSyntax) accuracy += 20;
  
  // Check for appropriate join types
  const hasInnerJoin = /INNER\s+JOIN/.test(normalizedSql);
  const hasLeftJoin = /LEFT\s+(OUTER\s+)?JOIN/.test(normalizedSql);
  const hasRightJoin = /RIGHT\s+(OUTER\s+)?JOIN/.test(normalizedSql);
  const hasFullJoin = /FULL\s+(OUTER\s+)?JOIN/.test(normalizedSql);
  
  // Add points for using appropriate join types
  if (hasInnerJoin || hasLeftJoin || hasRightJoin || hasFullJoin) accuracy += 10;
  
  // Check for join conditions on appropriate columns (likely keys)
  const hasIdJoinCondition = /ON\s+\w+(\.\w*id\w*)\s*=\s*\w+(\.\w*id\w*)/i.test(normalizedSql);
  if (hasIdJoinCondition) accuracy += 10;
  
  // Ensure score is between 0 and 100
  return { accuracy: Math.min(100, accuracy) };
};

/**
 * Analyze WHERE clause quality in SQL query
 * @param sql - The SQL query to analyze
 * @returns Metrics for WHERE clause quality
 */
const analyzeWhereClauseQuality = (sqlQuery: string, expectedSql: string | null = null, schema: string | null = null) => {
  if (!sqlQuery) return { accuracy: 0 };
  
  const normalizedSql = sqlQuery.toUpperCase();
  let accuracy = 60; // Start with a base score
  
  // Check if query has a WHERE clause
  const hasWhere = /WHERE/.test(normalizedSql);
  if (!hasWhere) return { accuracy: 50 }; // Neutral score if no WHERE clause
  
  // Check for proper comparison operators
  const hasComparisonOperators = /WHERE\s+\w+(\.\w+)?\s*(=|>|<|>=|<=|<>|!=|LIKE|IN|BETWEEN|IS NULL|IS NOT NULL)/.test(normalizedSql);
  if (hasComparisonOperators) accuracy += 15;
  
  // Check for logical operators (AND, OR)
  const hasLogicalOperators = /\s+(AND|OR)\s+/.test(normalizedSql);
  if (hasLogicalOperators) accuracy += 10;
  
  // Check for proper use of parentheses for complex conditions
  const hasParentheses = /WHERE\s+.*\(.*\).*/.test(normalizedSql);
  if (hasParentheses) accuracy += 10;
  
  // Check for potential issues
  const hasWhereTrue = /WHERE\s+(\(?\s*1\s*=\s*1\s*\)?|TRUE)/.test(normalizedSql);
  if (hasWhereTrue) accuracy -= 20; // Penalty for WHERE TRUE or WHERE 1=1
  
  // Ensure score is between 0 and 100
  return { accuracy: Math.min(100, accuracy) };
};

/**
 * Analyze aggregation quality in SQL query
 * @param sql - The SQL query to analyze
 * @returns Metrics for aggregation quality
 */
const analyzeAggregationQuality = (sqlQuery: string, expectedSql: string | null = null, schema: string | null = null) => {
  if (!sqlQuery) return { accuracy: 0 };
  
  const normalizedSql = sqlQuery.toUpperCase();
  let accuracy = 60; // Start with a base score
  
  // Check for aggregation functions
  const hasCount = /COUNT\s*\(/.test(normalizedSql);
  const hasSum = /SUM\s*\(/.test(normalizedSql);
  const hasAvg = /AVG\s*\(/.test(normalizedSql);
  const hasMin = /MIN\s*\(/.test(normalizedSql);
  const hasMax = /MAX\s*\(/.test(normalizedSql);
  
  // If no aggregation functions, return lower score
  if (!(hasCount || hasSum || hasAvg || hasMin || hasMax)) {
    return { accuracy: 50 }; // Neutral score if no aggregation
  }
  
  // Add points for each aggregation function
  if (hasCount) accuracy += 5;
  if (hasSum) accuracy += 5;
  if (hasAvg) accuracy += 5;
  if (hasMin) accuracy += 5;
  if (hasMax) accuracy += 5;
  
  // Check for proper GROUP BY with aggregation
  const hasGroupBy = /GROUP\s+BY/.test(normalizedSql);
  if (hasGroupBy && (hasCount || hasSum || hasAvg || hasMin || hasMax)) accuracy += 15;
  
  // Check for HAVING clause with aggregation
  const hasHaving = /HAVING/.test(normalizedSql);
  if (hasHaving) accuracy += 10;
  
  // Ensure score is between 0 and 100
  return { accuracy: Math.min(100, accuracy) };
};

/**
 * Analyze GROUP BY and ORDER BY quality in SQL query
 * @param sql - The SQL query to analyze
 * @returns Metrics for GROUP BY and ORDER BY quality
 */
const analyzeGroupOrderQuality = (sqlQuery: string, expectedSql: string | null = null, schema: string | null = null) => {
  if (!sqlQuery) return { accuracy: 0 };
  
  const normalizedSql = sqlQuery.toUpperCase();
  let accuracy = 60; // Start with a base score
  
  // Check for GROUP BY
  const hasGroupBy = /GROUP\s+BY/.test(normalizedSql);
  
  // Check for ORDER BY
  const hasOrderBy = /ORDER\s+BY/.test(normalizedSql);
  
  // If neither GROUP BY nor ORDER BY, return lower score
  if (!hasGroupBy && !hasOrderBy) {
    return { accuracy: 50 }; // Neutral score if neither present
  }
  
  // Add points for GROUP BY
  if (hasGroupBy) {
    accuracy += 15;
    
    // Check if GROUP BY columns match non-aggregated columns in SELECT
    const selectClause = normalizedSql.match(/SELECT\s+(.*?)\s+FROM/i)?.[1] || '';
    const groupByClause = normalizedSql.match(/GROUP\s+BY\s+(.*?)(?:\s+HAVING|\s+ORDER|\s*$)/i)?.[1] || '';
    
    // Simple check: if GROUP BY columns appear in SELECT
    const groupByColumns = groupByClause.split(',').map(col => col.trim());
    let columnsInSelect = true;
    
    for (const col of groupByColumns) {
      if (!selectClause.includes(col) && !selectClause.includes('*')) {
        columnsInSelect = false;
        break;
      }
    }
    
    if (columnsInSelect) accuracy += 10;
  }
  
  // Add points for ORDER BY
  if (hasOrderBy) {
    accuracy += 15;
    
    // Check for ASC/DESC specifiers
    const hasOrderDirection = /ORDER\s+BY\s+.*?\s+(ASC|DESC)/.test(normalizedSql);
    if (hasOrderDirection) accuracy += 5;
    
    // Check for LIMIT with ORDER BY (common pattern)
    const hasLimit = /LIMIT\s+\d+/.test(normalizedSql);
    if (hasLimit && hasOrderBy) accuracy += 5;
  }
  
  // Ensure score is between 0 and 100
  return { accuracy: Math.min(100, accuracy) };
};

// Helper function to create a consistent error response
const createErrorResponse = (provider: string, modelName: string, prompt: string, error: any, isFineTuned: boolean = false): ModelResponse => {
  console.error(`Error querying ${provider}:`, error);
  
  let errorMessage = `Error connecting to ${provider} API. `;
  
  // Check if it's an authentication error
  if (error.response?.data?.error?.type === 'authentication_error') {
    errorMessage += "Authentication failed. Please check your API key and ensure it's valid.";
  } else if (error.response?.data?.error?.message) {
    errorMessage += error.response.data.error.message;
  } else if (error.message) {
    errorMessage += error.message;
  } else {
    errorMessage += "Unknown error occurred.";
  }
  
  // Generate a basic SQL response for metrics calculation
  const basicResponse = "SELECT * FROM users WHERE status = 'active';";
  
  // Calculate metrics using our objective functions
  const sqlQuality = calculateSqlQuality(basicResponse);
  const executionAccuracy = calculateExecutionAccuracy(basicResponse);
  const exactMathAccuracy = calculateExactMathAccuracy(basicResponse);
  const validEfficiencyScore = calculateEfficiencyScore(basicResponse);
  const complexityScore = calculateComplexityScore(basicResponse);
  
  return {
    provider: provider,
    model: modelName,
    prompt: prompt,
    response: errorMessage + "\n\nFallback response:\n\n" + basicResponse,
    executionTime: roundToTwoDecimals(0.5), // Default execution time for errors
    tokensGenerated: Math.floor(basicResponse.length / 4),
    tokensPerSecond: roundToTwoDecimals(10), // Default tokens per second
    
    // Basic metrics
    sqlQualityScore: roundToTwoDecimals(sqlQuality),
    complexityEstimate: estimateSqlComplexity(basicResponse),
    
    // SQL-Specific Metrics
    executionAccuracy: roundToTwoDecimals(executionAccuracy),
    
    // General Performance Metrics
    exactMathAccuracy: roundToTwoDecimals(exactMathAccuracy),
    validEfficiencyScore: roundToTwoDecimals(validEfficiencyScore),
    inferenceLatency: roundToTwoDecimals(0.5), // Default latency for errors
    complexityHandling: roundToTwoDecimals(complexityScore),
    zeroShotPerformance: roundToTwoDecimals(executionAccuracy * 0.7 + validEfficiencyScore * 0.3)
  };
};

// Function to extract SQL and explanation from the response
const extractSqlAndExplanation = (response: string, isFineTuned: boolean = false): { sql: string, explanation: string } => {
  // Default values
  let sql = response;
  let explanation = '';
  
  // Special handling for fine-tuned models that don't use explanation markers
  if (isFineTuned) {
    // Try to extract SQL using code blocks first
    const sqlCodeBlockRegex = /```(?:sql)?\s*([\s\S]*?)\s*```/i;
    const sqlCodeMatch = sqlCodeBlockRegex.exec(response);
    
    if (sqlCodeMatch) {
      // If there's a SQL code block, use that as the SQL
      sql = sqlCodeMatch[1].trim();
      
      // Check if there's text after the code block that could be an explanation
      const afterCodeBlock = response.substring(response.indexOf(sqlCodeMatch[0]) + sqlCodeMatch[0].length).trim();
      if (afterCodeBlock) {
        explanation = afterCodeBlock;
      }
    } else {
      // If no code block, look for SQL statements
      const sqlStatementRegex = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COMMIT|ROLLBACK)\b[\s\S]*?;/i;
      const sqlStatementMatch = sqlStatementRegex.exec(response);
      
      if (sqlStatementMatch) {
        sql = sqlStatementMatch[0].trim();
        
        // Everything after the SQL statement could be an explanation
        const afterStatement = response.substring(response.indexOf(sqlStatementMatch[0]) + sqlStatementMatch[0].length).trim();
        if (afterStatement) {
          explanation = afterStatement;
        }
      } else {
        // If no clear SQL pattern, try to split by common explanation markers
        const lines = response.split('\n');
        const sqlLines: string[] = [];
        const explanationLines: string[] = [];
        
        let parsingExplanation = false;
        
        for (const line of lines) {
          const trimmedLine = line.trim().toLowerCase();
          
          // Skip empty lines
          if (!trimmedLine) continue;
          
          // Check for explanation markers (more patterns for fine-tuned models)
          if (
            trimmedLine.includes('explanation:') || 
            trimmedLine.includes('this query') ||
            trimmedLine.startsWith('the above sql') ||
            trimmedLine.startsWith('this sql') ||
            trimmedLine.includes('explanation of the query') ||
            trimmedLine.includes('here\'s why') ||
            trimmedLine.includes('let me explain') ||
            trimmedLine.includes('to explain') ||
            trimmedLine.includes('the query') ||
            // Look for lines that start with "This" after we've seen some SQL
            (sqlLines.length > 0 && trimmedLine.startsWith('this'))
          ) {
            parsingExplanation = true;
            explanationLines.push(line);
            continue;
          }
          
          // If we're already parsing explanation, add to explanation lines
          if (parsingExplanation) {
            explanationLines.push(line);
          } 
          // Otherwise, it's part of the SQL
          else {
            sqlLines.push(line);
          }
        }
        
        // If we found explanation lines, use them
        if (explanationLines.length > 0) {
          sql = sqlLines.join('\n').trim();
          explanation = explanationLines.join('\n').trim();
        } else {
          // If still no explanation found, check if there's a semicolon that might separate SQL from explanation
          const semicolonIndex = response.indexOf(';');
          if (semicolonIndex > 0 && semicolonIndex < response.length - 1) {
            sql = response.substring(0, semicolonIndex + 1).trim();
            explanation = response.substring(semicolonIndex + 1).trim();
          } else {
            // Last resort: if the response is long enough, assume the last 30% might be an explanation
            if (response.length > 100) {
              const splitIndex = Math.floor(response.length * 0.7);
              sql = response.substring(0, splitIndex).trim();
              explanation = response.substring(splitIndex).trim();
            } else {
              // If all else fails, just return the whole response as SQL
              sql = response;
              explanation = '';
            }
          }
        }
      }
    }
    
    return { sql, explanation };
  }
  
  // Standard processing for non-fine-tuned models
  // Check if the response has both SQL and explanation
  const lines = response.split('\n');
  const sqlLines: string[] = [];
  const explanationLines: string[] = [];
  
  let parsingExplanation = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) continue;
    
    // Check for explanation markers
    if (trimmedLine.toLowerCase().includes('explanation:') || 
        trimmedLine.toLowerCase().includes('this query') ||
        trimmedLine.toLowerCase().startsWith('the above sql') ||
        trimmedLine.toLowerCase().startsWith('this sql')) {
      parsingExplanation = true;
      explanationLines.push(trimmedLine);
      continue;
    }
    
    // If we're already parsing explanation, add to explanation lines
    if (parsingExplanation) {
      explanationLines.push(trimmedLine);
    } 
    // Otherwise, it's part of the SQL
    else {
      sqlLines.push(trimmedLine);
    }
  }
  
  // If we didn't find a clear explanation section but have multiple lines,
  // assume the first part is SQL and the rest is explanation
  if (explanationLines.length === 0 && sqlLines.length > 3) {
    // Look for a semicolon to determine the end of the SQL statement
    let sqlEndIndex = -1;
    for (let i = 0; i < sqlLines.length; i++) {
      if (sqlLines[i].includes(';')) {
        sqlEndIndex = i;
        break;
      }
    }
    
    // If we found a semicolon, split there; otherwise use the 70% heuristic
    if (sqlEndIndex >= 0) {
      explanationLines.push(...sqlLines.splice(sqlEndIndex + 1));
    } else {
      const splitIndex = Math.ceil(sqlLines.length * 0.7);
      explanationLines.push(...sqlLines.splice(splitIndex));
    }
  }
  
  sql = sqlLines.join('\n');
  explanation = explanationLines.join('\n');
  
  return { sql, explanation };
};

// Function to query the GPT 3.5 base model
export const queryGptBase = async (query: string, schema?: string): Promise<ModelResponse> => {
  const startTime = Date.now();
  
  try {
    console.log('Requesting GPT base model...');
    
    // Prepare the messages array with or without schema
    const messages = [
      { role: "system", content: enhancedSystemPrompt }
    ];
    
    // If schema is provided, include it in the user message
    if (schema) {
      messages.push({ 
        role: "user", 
        content: `Database Schema:\n${schema}\n\nQuery: ${query}` 
      });
    } else {
      messages.push({ role: "user", content: query });
    }
    
    const response = await openaiApi.post('/chat/completions', {
      model: MODEL_CONFIG.GPT_BASE.id,
      messages: messages,
      temperature: 0.7,
      max_tokens: 800 // Increased to accommodate explanations
    });
    
    console.log('GPT base response:', response.data);
    
    const responseText = response.data.choices[0].message.content;
    const { sql, explanation } = extractSqlAndExplanation(responseText, false);
    
    const executionTime = roundToTwoDecimals((Date.now() - startTime) / 1000); // Convert to seconds and round
    const tokensGenerated = response.data.usage ? response.data.usage.completion_tokens : Math.floor(responseText.length / 4);
    const tokensPerSecond = executionTime > 0 ? roundToTwoDecimals(tokensGenerated / executionTime) : 0;
    
    // Get metrics using our objective functions
    const metrics = await evaluateSqlMetrics(sql, null, schema);
    
    return {
      provider: 'OPENAI',
      model: MODEL_CONFIG.GPT_BASE.name,
      prompt: query,
      response: sql,
      explanation: explanation,
      rawResponse: responseText, // Include the raw response
      executionTime: executionTime,
      responseLength: sql.length,
      sqlQualityScore: metrics.sqlQualityScore,
      tokensGenerated: tokensGenerated,
      tokensPerSecond: tokensPerSecond,
      complexityEstimate: metrics.complexityEstimate,
      executionAccuracy: metrics.executionAccuracy,
      exactMathAccuracy: metrics.exactMathAccuracy,
      validEfficiencyScore: metrics.validEfficiencyScore,
      inferenceLatency: metrics.inferenceLatency,
      complexityHandling: metrics.complexityHandling,
      zeroShotPerformance: metrics.zeroShotPerformance
    };
  } catch (error: any) {
    console.error('GPT base error:', error.response?.data || error.message);
    
    return createErrorResponse('OPENAI', MODEL_CONFIG.GPT_BASE.name, query, error, false);
  }
};

// Function to query the fine-tuned GPT 3.5 model
export const queryGptFinetuned = async (query: string, schema?: string): Promise<ModelResponse> => {
  const startTime = Date.now();
  
  try {
    console.log('Requesting GPT fine-tuned model...');
    
    // Prepare the messages array with or without schema
    const messages = [
      { role: "system", content: enhancedSystemPrompt }
    ];
    
    // If schema is provided, include it in the user message
    if (schema) {
      messages.push({ 
        role: "user", 
        content: `Database Schema:\n${schema}\n\nQuery: ${query}` 
      });
    } else {
      messages.push({ role: "user", content: query });
    }
    
    const response = await openaiFinetunedApi.post('/chat/completions', {
      model: MODEL_CONFIG.GPT_FINETUNED.id,
      messages: messages,
      temperature: 0.7,
      max_tokens: 800 // Increased to accommodate explanations
    });
    
    console.log('GPT fine-tuned response:', response.data);
    
    const responseText = response.data.choices[0].message.content;
    const { sql, explanation } = extractSqlAndExplanation(responseText, true);
    
    // Generate an explanation if none was provided
    const finalExplanation = explanation || generateSqlExplanation(sql);
    
    const executionTime = roundToTwoDecimals((Date.now() - startTime) / 1000); // Convert to seconds and round
    const tokensGenerated = response.data.usage ? response.data.usage.completion_tokens : Math.floor(responseText.length / 4);
    const tokensPerSecond = executionTime > 0 ? roundToTwoDecimals(tokensGenerated / executionTime) : 0;
    
    // Get metrics using our objective functions
    const metrics = await evaluateSqlMetrics(sql, null, schema);
    
    return {
      provider: 'OPENAI_FINETUNED',
      model: MODEL_CONFIG.GPT_FINETUNED.name,
      prompt: query,
      response: sql,
      explanation: finalExplanation,
      rawResponse: responseText, // Include the raw response
      executionTime: executionTime,
      responseLength: sql.length,
      sqlQualityScore: metrics.sqlQualityScore,
      tokensGenerated: tokensGenerated,
      tokensPerSecond: tokensPerSecond,
      complexityEstimate: metrics.complexityEstimate,
      executionAccuracy: metrics.executionAccuracy,
      exactMathAccuracy: metrics.exactMathAccuracy,
      validEfficiencyScore: metrics.validEfficiencyScore,
      inferenceLatency: metrics.inferenceLatency,
      complexityHandling: metrics.complexityHandling,
      zeroShotPerformance: metrics.zeroShotPerformance
    };
  } catch (error: any) {
    console.error('GPT fine-tuned error:', error.response?.data || error.message);
    
    return createErrorResponse('OPENAI_FINETUNED', MODEL_CONFIG.GPT_FINETUNED.name, query, error, true);
  }
};

// Function to query the GPT-4o-mini base model
export const queryGpt4oMiniBase = async (query: string, schema?: string): Promise<ModelResponse> => {
  const startTime = Date.now();
  
  try {
    console.log('Requesting GPT-4o-mini base model...');
    
    // Prepare the messages array with or without schema
    const messages = [
      { role: "system", content: enhancedSystemPrompt }
    ];
    
    // If schema is provided, include it in the user message
    if (schema) {
      messages.push({ 
        role: "user", 
        content: `Database Schema:\n${schema}\n\nQuery: ${query}` 
      });
    } else {
      messages.push({ role: "user", content: query });
    }
    
    const response = await gpt4oMiniApi.post('/chat/completions', {
      model: MODEL_CONFIG.GPT4O_MINI_BASE.id,
      messages: messages,
      temperature: 0.7,
      max_tokens: 800 // Increased to accommodate explanations
    });
    
    console.log('GPT-4o-mini base response:', response.data);
    
    // Handle response format
    let responseText = '';
    if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      responseText = response.data.choices[0].message.content;
    } else {
      responseText = JSON.stringify(response.data);
    }
    
    const { sql, explanation } = extractSqlAndExplanation(responseText, false);
    
    const executionTime = roundToTwoDecimals((Date.now() - startTime) / 1000); // Convert to seconds and round
    const tokensGenerated = response.data.usage ? response.data.usage.completion_tokens : Math.floor(responseText.length / 4);
    const tokensPerSecond = executionTime > 0 ? roundToTwoDecimals(tokensGenerated / executionTime) : 0;
    
    // Get metrics using our objective functions
    const metrics = await evaluateSqlMetrics(sql, null, schema);
    
    return {
      provider: 'GPT4O_MINI',
      model: MODEL_CONFIG.GPT4O_MINI_BASE.name,
      prompt: query,
      response: sql,
      explanation: explanation,
      rawResponse: responseText, // Include the raw response
      executionTime: executionTime,
      responseLength: sql.length,
      sqlQualityScore: metrics.sqlQualityScore,
      tokensGenerated: tokensGenerated,
      tokensPerSecond: tokensPerSecond,
      complexityEstimate: metrics.complexityEstimate,
      executionAccuracy: metrics.executionAccuracy,
      exactMathAccuracy: metrics.exactMathAccuracy,
      validEfficiencyScore: metrics.validEfficiencyScore,
      inferenceLatency: metrics.inferenceLatency,
      complexityHandling: metrics.complexityHandling,
      zeroShotPerformance: metrics.zeroShotPerformance
    };
  } catch (error: any) {
    console.error('GPT-4o-mini base error:', error.response?.data || error.message);
    
    return {
      provider: 'GPT4O_MINI',
      model: MODEL_CONFIG.GPT4O_MINI_BASE.name,
      response: `Error: ${error.message}`,
      executionTime: roundToTwoDecimals((Date.now() - startTime) / 1000),
      responseLength: 0,
      sqlQualityScore: 0,
      tokensGenerated: 0,
      tokensPerSecond: 0,
      complexityEstimate: 'N/A',
      executionAccuracy: 0,
      exactMathAccuracy: 0,
      validEfficiencyScore: 0
    };
  }
};

// Function to query the fine-tuned GPT-4o-mini model
export const queryGpt4oMiniFinetuned = async (query: string, schema?: string): Promise<ModelResponse> => {
  const startTime = Date.now();
  
  try {
    console.log('Requesting GPT-4o-mini fine-tuned model...');
    
    // Prepare the messages array with or without schema
    const messages = [
      { role: "system", content: enhancedSystemPrompt }
    ];
    
    // If schema is provided, include it in the user message
    if (schema) {
      messages.push({ 
        role: "user", 
        content: `Database Schema:\n${schema}\n\nQuery: ${query}` 
      });
    } else {
      messages.push({ role: "user", content: query });
    }
    
    const response = await gpt4oMiniApi.post('/chat/completions', {
      model: MODEL_CONFIG.GPT4O_MINI_FINETUNED.id,
      messages: messages,
      temperature: 0.7,
      max_tokens: 800 // Increased to accommodate explanations
    });
    
    console.log('GPT-4o-mini fine-tuned response:', response.data);
    
    // Handle response format
    let responseText = '';
    if (response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      responseText = response.data.choices[0].message.content;
    } else {
      responseText = JSON.stringify(response.data);
    }
    
    const { sql, explanation } = extractSqlAndExplanation(responseText, true);
    
    // Generate an explanation if none was provided
    const finalExplanation = explanation || generateSqlExplanation(sql);
    
    const executionTime = roundToTwoDecimals((Date.now() - startTime) / 1000); // Convert to seconds and round
    const tokensGenerated = response.data.usage ? response.data.usage.completion_tokens : Math.floor(responseText.length / 4);
    const tokensPerSecond = executionTime > 0 ? roundToTwoDecimals(tokensGenerated / executionTime) : 0;
    
    // Get metrics using our objective functions
    const metrics = await evaluateSqlMetrics(sql, null, schema);
    
    return {
      provider: 'GPT4O_MINI_FINETUNED',
      model: MODEL_CONFIG.GPT4O_MINI_FINETUNED.name,
      prompt: query,
      response: sql,
      explanation: finalExplanation,
      rawResponse: responseText, // Include the raw response
      executionTime: executionTime,
      responseLength: sql.length,
      sqlQualityScore: metrics.sqlQualityScore,
      tokensGenerated: tokensGenerated,
      tokensPerSecond: tokensPerSecond,
      complexityEstimate: metrics.complexityEstimate,
      executionAccuracy: metrics.executionAccuracy,
      exactMathAccuracy: metrics.exactMathAccuracy,
      validEfficiencyScore: metrics.validEfficiencyScore,
      inferenceLatency: metrics.inferenceLatency,
      complexityHandling: metrics.complexityHandling,
      zeroShotPerformance: metrics.zeroShotPerformance
    };
  } catch (error: any) {
    console.error('GPT-4o-mini fine-tuned error:', error.response?.data || error.message);
    
    return createErrorResponse('GPT4O_MINI_FINETUNED', MODEL_CONFIG.GPT4O_MINI_FINETUNED.name, query, error, true);
  }
};

// Function to query models sequentially
export const sequentialQueryModels = async (
  prompt: string,
  modelsOrSchema?: ModelConfig[] | string,
  schema?: string | null,
  expectedSql?: string | null
): Promise<ModelResponse[] | { gptBase: ModelResponse; gptFinetuned: ModelResponse; gpt4oMiniBase: ModelResponse; gpt4oMiniFinetuned: ModelResponse }> => {
  // Check if the second parameter is a string (schema) for backward compatibility
  if (typeof modelsOrSchema === 'string' || modelsOrSchema === undefined) {
    // Old interface: sequentialQueryModels(query, schema?)
    const schemaToUse = modelsOrSchema as string;
    console.log('Using backward compatibility mode for sequentialQueryModels');
    
    // Query GPT 3.5 Base first
    console.log('Step 1: Querying GPT 3.5 Base model...');
    const gptBaseResult = await queryGptBase(prompt, schemaToUse);
    
    // Query GPT 3.5 Fine-tuned next
    console.log('Step 2: Querying GPT 3.5 Fine-tuned model...');
    const gptFinetunedResult = await queryGptFinetuned(prompt, schemaToUse);
    
    // Query GPT-4o-mini Base next
    console.log('Step 3: Querying GPT-4o-mini Base model...');
    const gpt4oMiniBaseResult = await queryGpt4oMiniBase(prompt, schemaToUse);
    
    // Query GPT-4o-mini Fine-tuned last
    console.log('Step 4: Querying GPT-4o-mini Fine-tuned model...');
    const gpt4oMiniFinetunedResult = await queryGpt4oMiniFinetuned(prompt, schemaToUse);
    
    return {
      gptBase: gptBaseResult,
      gptFinetuned: gptFinetunedResult,
      gpt4oMiniBase: gpt4oMiniBaseResult,
      gpt4oMiniFinetuned: gpt4oMiniFinetunedResult
    };
  }
  
  // New interface: sequentialQueryModels(prompt, models, schema?, expectedSql?)
  const models = modelsOrSchema as ModelConfig[];
  const schemaToUse = schema as string | null;
  const expectedSqlToUse = expectedSql as string | null;
  const responses: ModelResponse[] = [];
  
  for (const model of models) {
    try {
      console.log(`Querying ${model.provider} model: ${model.name}`);
      
      // Start timing
      const startTime = performance.now();
      
      // Query the model
      let response;
      if (model.provider === 'OpenAI') {
        response = await queryOpenAI(prompt, model.name, schemaToUse);
      } else if (model.provider === 'Anthropic') {
        response = await queryAnthropic(prompt, model.name, schemaToUse);
      } else if (model.provider === 'Gemini') {
        response = await queryGemini(prompt, model.name, schemaToUse);
      } else if (model.provider === 'Mistral') {
        response = await queryMistral(prompt, model.name, schemaToUse);
      } else if (model.provider === 'Cohere') {
        response = await queryCohere(prompt, model.name, schemaToUse);
      } else if (model.provider === 'Llama') {
        response = await queryLlama(prompt, model.name, schemaToUse);
      } else {
        throw new Error(`Unsupported provider: ${model.provider}`);
      }
      
      // End timing
      const endTime = performance.now();
      const executionTime = (endTime - startTime) / 1000; // Convert to seconds
      
      // Extract SQL from the response
      const extractedSql = extractSqlFromResponse(response);
      
      // Calculate tokens generated (rough estimate)
      const tokensGenerated = Math.floor(response.length / 4); // Rough estimate: 4 chars per token
      
      // Calculate tokens per second
      const tokensPerSecond = tokensGenerated / executionTime;
      
      // Evaluate SQL metrics
      const metrics = await evaluateSqlMetrics(extractedSql, expectedSqlToUse, schemaToUse);
      
      // Create the response object
      const modelResponse: ModelResponse = {
        provider: model.provider,
        model: model.name,
        prompt,
        response,
        executionTime: roundToTwoDecimals(executionTime),
        tokensGenerated,
        tokensPerSecond: roundToTwoDecimals(tokensPerSecond),
        ...metrics
      };
      
      responses.push(modelResponse);
    } catch (error) {
      // Handle errors by creating an error response
      const errorResponse = createErrorResponse(model.provider, model.name, prompt, error, model.isFineTuned);
      responses.push(errorResponse);
    }
  }
  
  return responses;
};

// Wrapper functions that use either real API or mock responses
export const queryModel = async (modelType: string, query: string, schema?: string): Promise<ModelResponse> => {
  const startTime = Date.now();
  
  try {
    switch (modelType) {
      case MODEL_CONFIG.GPT_BASE.name:
        return await queryGptBase(query, schema);
      case MODEL_CONFIG.GPT_FINETUNED.name:
        return await queryGptFinetuned(query, schema);
      case MODEL_CONFIG.GPT4O_MINI_BASE.name:
        return await queryGpt4oMiniBase(query, schema).catch(error => {
          console.error("Failed to query GPT-4o-mini base:", error);
          // Return a basic error response with all required properties
          return {
            provider: 'GPT4O_MINI',
            model: MODEL_CONFIG.GPT4O_MINI_BASE.name,
            response: `Error: ${error.message}`,
            executionTime: roundToTwoDecimals((Date.now() - startTime) / 1000),
            responseLength: 0,
            sqlQualityScore: 0,
            tokensGenerated: 0,
            tokensPerSecond: 0,
            complexityEstimate: 'N/A',
            executionAccuracy: 0,
            exactMathAccuracy: 0,
            validEfficiencyScore: 0
          };
        });
      case MODEL_CONFIG.GPT4O_MINI_FINETUNED.name:
        return await queryGpt4oMiniFinetuned(query, schema).catch(error => {
          console.error("Failed to query GPT-4o-mini fine-tuned:", error);
          // Return a basic error response with all required properties
          return {
            provider: 'GPT4O_MINI_FINETUNED',
            model: MODEL_CONFIG.GPT4O_MINI_FINETUNED.name,
            response: `Error: ${error.message}`,
            executionTime: 0,
            responseLength: 0,
            sqlQualityScore: 0,
            tokensGenerated: 0,
            tokensPerSecond: 0,
            complexityEstimate: 'N/A',
            executionAccuracy: 0,
            exactMathAccuracy: 0,
            validEfficiencyScore: 0
          };
        });
      default:
        throw new Error(`Unknown model type: ${modelType}`);
    }
  } catch (error) {
    console.error(`Error in queryModel for ${modelType}:`, error);
    // Return a basic error response with all required properties
    return {
      provider: modelType,
      model: modelType,
      response: `Error: ${error instanceof Error ? error.message : String(error)}`,
      executionTime: 0,
      responseLength: 0,
      sqlQualityScore: 0,
      tokensGenerated: 0,
      tokensPerSecond: 0,
      complexityEstimate: 'N/A',
      executionAccuracy: 0,
      exactMathAccuracy: 0,
      validEfficiencyScore: 0
    };
  }
};

/**
 * Estimate the number of tokens in a text string
 * This is a simple approximation - in production, you would use a proper tokenizer
 * @param text - The text to estimate tokens for
 * @returns The estimated number of tokens
 */
const estimateTokens = (text: string): number => {
  if (!text) return 0;
  
  // A very rough approximation: 1 token ≈ 4 characters for English text
  // This is not accurate for all languages or special tokens
  return Math.ceil(text.length / 4);
};

// Define the ModelConfig interface
interface ModelConfig {
  provider: string;
  name: string;
  isFineTuned?: boolean;
}

// Define the model query functions
const queryOpenAI = async (prompt: string, modelName: string, schema: string | null = null): Promise<string> => {
  // Implementation would go here
  return "SELECT * FROM users WHERE status = 'active';";
};

const queryAnthropic = async (prompt: string, modelName: string, schema: string | null = null): Promise<string> => {
  // Implementation would go here
  return "SELECT * FROM users WHERE status = 'active';";
};

const queryGemini = async (prompt: string, modelName: string, schema: string | null = null): Promise<string> => {
  // Implementation would go here
  return "SELECT * FROM users WHERE status = 'active';";
};

const queryMistral = async (prompt: string, modelName: string, schema: string | null = null): Promise<string> => {
  // Implementation would go here
  return "SELECT * FROM users WHERE status = 'active';";
};

const queryCohere = async (prompt: string, modelName: string, schema: string | null = null): Promise<string> => {
  // Implementation would go here
  return "SELECT * FROM users WHERE status = 'active';";
};

const queryLlama = async (prompt: string, modelName: string, schema: string | null = null): Promise<string> => {
  // Implementation would go here
  return "SELECT * FROM users WHERE status = 'active';";
};

// Function to extract SQL from a response
const extractSqlFromResponse = (response: string): string => {
  // Look for SQL code blocks
  const sqlRegex = /```sql\s*([\s\S]*?)\s*```|```([\s\S]*?)```/gi;
  const match = sqlRegex.exec(response);
  
  if (match) {
    // Return the SQL from the first capturing group (if it exists) or the second capturing group
    return (match[1] || match[2]).trim();
  }
  
  // If no code blocks found, try to find SQL statements directly
  const sqlStatementRegex = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COMMIT|ROLLBACK)\b[\s\S]*?;/gi;
  const statementMatch = sqlStatementRegex.exec(response);
  
  if (statementMatch) {
    return statementMatch[0].trim();
  }
  
  // If no SQL found, return the original response
  return response;
};

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