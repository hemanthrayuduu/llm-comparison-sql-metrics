import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ModelResponse } from '../services/api';
import './ModelResponse.css';

interface ModelResponseProps {
  data?: ModelResponse;
  isLoading: boolean;
  error?: string;
}

const ModelResponseComponent: React.FC<ModelResponseProps> = ({ data, isLoading, error }) => {
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  
  // Function to detect if the response is SQL
  const isSqlResponse = (response: string): boolean => {
    const sqlKeywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT'];
    return sqlKeywords.some(keyword => response.toUpperCase().includes(keyword));
  };

  // Function to extract SQL from a response that might contain explanatory text
  const extractSql = (response: string): string => {
    // If it's already just SQL, return it
    if (response.trim().toUpperCase().startsWith('SELECT')) {
      return response;
    }
    
    // Try to find SQL in the response
    const lines = response.split('\n');
    const sqlLines = [];
    let inSqlBlock = false;
    
    for (const line of lines) {
      if (line.trim().toUpperCase().startsWith('SELECT') || inSqlBlock) {
        inSqlBlock = true;
        sqlLines.push(line);
      }
    }
    
    return sqlLines.length > 0 ? sqlLines.join('\n') : response;
  };

  // Function to copy SQL to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  // Function to get quality score label and color
  const getQualityLabel = (score?: number): { label: string, color: string } => {
    if (!score && score !== 0) return { label: 'N/A', color: '#888' };
    
    if (score >= 80) return { label: 'Excellent', color: '#4caf50' };
    if (score >= 60) return { label: 'Good', color: '#8bc34a' };
    if (score >= 40) return { label: 'Average', color: '#ffeb3b' };
    if (score >= 20) return { label: 'Fair', color: '#ff9800' };
    return { label: 'Poor', color: '#f44336' };
  };

  return (
    <div className="model-response-container">
      {data?.model && (
        <div className="model-header">
          <h4>{data.model}</h4>
          <div className="metrics-container">
            {data.executionTime !== undefined && (
              <span className="metric execution-time" title="Total time from request to response, including network latency">
                <i className="metric-icon">⏱️</i>
                <span className="metric-label">Response Time:</span> {data.executionTime}ms
              </span>
            )}
            {data.sqlQualityScore !== undefined && (
              <span 
                className="metric quality-score"
                style={{ color: getQualityLabel(data.sqlQualityScore).color }}
                title="Calculated quality score based on SQL structure and best practices"
              >
                <i className="metric-icon">⭐</i>
                <span className="metric-label">Quality:</span> {data.sqlQualityScore}/100
              </span>
            )}
            {data.responseLength !== undefined && (
              <span className="metric response-length" title="Total length of the generated response">
                <i className="metric-icon">📏</i>
                <span className="metric-label">Length:</span> {data.responseLength} chars
              </span>
            )}
          </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
        </div>
      ) : data?.response ? (
        <div className="response-content">
          {isSqlResponse(data.response) ? (
            <div className="sql-response-container">
              <div className="sql-header">
                <div className="sql-info">
                  <span className="sql-label">SQL Query</span>
                  {data.complexityEstimate && (
                    <span className="complexity-badge">
                      Complexity: {data.complexityEstimate}
                    </span>
                  )}
                </div>
                <button 
                  className={`copy-button ${copySuccess ? 'success' : ''}`}
                  onClick={() => copyToClipboard(extractSql(data.response))}
                >
                  {copySuccess ? 'Copied!' : 'Copy SQL'}
                </button>
              </div>
              <SyntaxHighlighter 
                language="sql" 
                style={vscDarkPlus}
                customStyle={{ borderRadius: '8px', margin: '0' }}
              >
                {extractSql(data.response)}
              </SyntaxHighlighter>
              
              <div className="advanced-metrics">
                <h4>Advanced Metrics</h4>
                <div className="metrics-grid">
                  {data.executionAccuracy !== undefined && (
                    <div className="advanced-metric">
                      <span className="metric-label">Execution Accuracy:</span>
                      <span className="metric-value" style={{ color: getQualityLabel(data.executionAccuracy).color }}>
                        {data.executionAccuracy}/100
                      </span>
                      <span className="metric-description">Measures how accurately the SQL query can be executed</span>
                    </div>
                  )}
                  
                  {data.exactMathAccuracy !== undefined && (
                    <div className="advanced-metric">
                      <span className="metric-label">Math Accuracy:</span>
                      <span className="metric-value" style={{ color: getQualityLabel(data.exactMathAccuracy).color }}>
                        {data.exactMathAccuracy}/100
                      </span>
                      <span className="metric-description">Evaluates precision of mathematical operations</span>
                    </div>
                  )}
                  
                  {data.validEfficiencyScore !== undefined && (
                    <div className="advanced-metric">
                      <span className="metric-label">Efficiency Score:</span>
                      <span className="metric-value" style={{ color: getQualityLabel(data.validEfficiencyScore).color }}>
                        {data.validEfficiencyScore}/100
                      </span>
                      <span className="metric-description">Assesses query optimization and efficiency</span>
                    </div>
                  )}
                  
                  {data.exactMatchAccuracy !== undefined && (
                    <div className="advanced-metric">
                      <span className="metric-label">Exact Match:</span>
                      <span className="metric-value" style={{ color: getQualityLabel(data.exactMatchAccuracy).color }}>
                        {data.exactMatchAccuracy}/100
                      </span>
                      <span className="metric-description">Exact match with reference queries</span>
                    </div>
                  )}
                  
                  {data.logicalFormAccuracy !== undefined && (
                    <div className="advanced-metric">
                      <span className="metric-label">Logical Form:</span>
                      <span className="metric-value" style={{ color: getQualityLabel(data.logicalFormAccuracy).color }}>
                        {data.logicalFormAccuracy}/100
                      </span>
                      <span className="metric-description">Logical equivalence with reference queries</span>
                    </div>
                  )}
                  
                  {data.tableColumnAccuracy !== undefined && (
                    <div className="advanced-metric">
                      <span className="metric-label">Table/Column:</span>
                      <span className="metric-value" style={{ color: getQualityLabel(data.tableColumnAccuracy).color }}>
                        {data.tableColumnAccuracy}/100
                      </span>
                      <span className="metric-description">Accuracy of table and column selection</span>
                    </div>
                  )}
                </div>
              </div>
              
              {(data.tokensGenerated || data.tokensPerSecond) && (
                <div className="tokens-info">
                  {data.tokensGenerated && (
                    <span title="Approximate number of tokens in the generated response">
                      <strong>Tokens:</strong> ~{data.tokensGenerated}
                    </span>
                  )}
                  {data.tokensPerSecond && (
                    <span title="Tokens generated per second (includes network latency)">
                      <strong>Generation Rate:</strong> {data.tokensPerSecond} tokens/sec
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-response">{data.response}</p>
          )}
        </div>
      ) : (
        <div className="empty-response">
          <p>No response yet</p>
        </div>
      )}
    </div>
  );
};

export default ModelResponseComponent; 