export const evaluateSqlMetrics = (
  sql: string,
  _referenceSql: string | null = null,
  _schema: string | null = null
): SqlMetrics => {
  // ... existing code ...
};

export const createErrorResponse = (
  provider: string,
  modelName: string,
  prompt: string,
  error: any,
  _isFineTuned: boolean = false
): ModelResponse => {
  // ... existing code ...
}; 