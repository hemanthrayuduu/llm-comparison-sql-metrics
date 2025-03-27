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

type TabType = 'sql' | 'explanation' | 'raw';

const ModelResponseComponent: React.FC<ModelResponseProps> = ({ data, isLoading, error }) => {
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('sql');
  
  // Function to detect if the response is SQL
  const isSqlResponse = (response: string): boolean => {
    const sqlKeywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT'];
    return sqlKeywords.some(keyword => response.toUpperCase().includes(keyword));
  };

  // Function to extract SQL from a response that might contain explanatory text
  const extractSql = (response: string): string => {
    // Check for SQL in markdown code blocks first
    if (response.includes('```sql')) {
      const parts = response.split('```sql');
      if (parts.length >= 2) {
        const sqlAndRest = parts[1].split('```');
        if (sqlAndRest.length > 0) {
          return sqlAndRest[0].trim();
        }
      }
    }
    
    // Check for any code blocks as fallback
    if (response.includes('```')) {
      const parts = response.split('```');
      // If we have an odd number of ``` markers and at least 3, assume the even-indexed parts are code
      if (parts.length >= 3) {
        return parts[1].trim();
      }
    }
    
    // If it's already just SQL, return it
    if (response.trim().toUpperCase().startsWith('SELECT')) {
      return response;
    }
    
    // Try to find SQL in the response by keywords
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

  // Function to get quality score class
  const getScoreClass = (score?: number): string => {
    if (!score && score !== 0) return '';
    
    if (score >= 80) return 'good';
    if (score >= 60) return 'average';
    return 'poor';
  };

  // Helper function to format numbers (only show decimals if needed)
  const formatNumber = (value: number): string => {
    if (Math.floor(value) === value) {
      return value.toString(); // Show as integer if it's a whole number
    }
    return value.toFixed(2); // Round to 2 decimal places otherwise
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
          <span className="model-name">{data.model}</span>
        </div>
      )}
      
      {data && (
        <div className="model-metrics">
          {data.sqlQualityScore !== undefined && (
            <div className="metric">
              <span className="metric-name">SQL Quality Score</span>
              <span className={`metric-value ${getScoreClass(data.sqlQualityScore)}`}>
                {formatNumber(data.sqlQualityScore || 0)}
              </span>
            </div>
          )}
          
          {data.executionTime !== undefined && (
            <div className="metric">
              <span className="metric-name">Response Time</span>
              <span className="metric-value">
                {formatNumber(data.executionTime || 0)} ms
              </span>
            </div>
          )}
          
          {data.responseLength !== undefined && (
            <div className="metric">
              <span className="metric-name">Response Length</span>
              <span className="metric-value">
                {data.responseLength || 0}
              </span>
            </div>
          )}
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
              <div className="response-tabs">
                <button 
                  className={`tab-button ${activeTab === 'sql' ? 'active' : ''}`}
                  onClick={() => setActiveTab('sql')}
                >
                  SQL Query
                </button>
                <button 
                  className={`tab-button ${activeTab === 'explanation' ? 'active' : ''}`}
                  onClick={() => setActiveTab('explanation')}
                >
                  Explanation
                </button>
                <button 
                  className={`tab-button ${activeTab === 'raw' ? 'active' : ''}`}
                  onClick={() => setActiveTab('raw')}
                >
                  Raw Response
                </button>
                <div className="tab-actions">
                  {activeTab === 'sql' && (
                    <button 
                      className={`copy-button ${copySuccess ? 'success' : ''}`}
                      onClick={() => copyToClipboard(extractSql(data.response))}
                    >
                      {copySuccess ? 'Copied!' : 'Copy SQL'}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="tab-content">
                {activeTab === 'sql' && (
                  <div className="sql-tab">
                    {data.complexityEstimate && (
                      <div className="complexity-info">
                        <span className="complexity-badge">
                          Complexity: {data.complexityEstimate}
                        </span>
                      </div>
                    )}
                    <SyntaxHighlighter 
                      language="sql" 
                      style={vscDarkPlus}
                      customStyle={{ borderRadius: '8px', margin: '0' }}
                    >
                      {extractSql(data.response)}
                    </SyntaxHighlighter>
                  </div>
                )}
                
                {activeTab === 'explanation' && (
                  <div className="explanation-tab">
                    <p>{data.explanation || 'No explanation provided by the model.'}</p>
                  </div>
                )}
                
                {activeTab === 'raw' && data.rawResponse && (
                  <div className="raw-tab">
                    <pre>{data.rawResponse}</pre>
                  </div>
                )}
              </div>
              
              <div className="advanced-metrics">
                <h4>Advanced Metrics</h4>
                <div className="metrics-grid">
                  {data.executionAccuracy !== undefined && (
                    <div className="advanced-metric">
                      <span className="metric-label">Execution Accuracy:</span>
                      <span className="metric-value" style={{ color: getQualityLabel(data.executionAccuracy).color }}>
                        {formatNumber(data.executionAccuracy || 0)}/100
                      </span>
                      <span className="metric-description">Measures how accurately the SQL query can be executed</span>
                    </div>
                  )}
                  
                  {data.exactMathAccuracy !== undefined && (
                    <div className="advanced-metric">
                      <span className="metric-label">Math Accuracy:</span>
                      <span className="metric-value" style={{ color: getQualityLabel(data.exactMathAccuracy).color }}>
                        {formatNumber(data.exactMathAccuracy || 0)}/100
                      </span>
                      <span className="metric-description">Evaluates precision of mathematical operations</span>
                    </div>
                  )}
                  
                  {data.validEfficiencyScore !== undefined && (
                    <div className="advanced-metric">
                      <span className="metric-label">Efficiency Score:</span>
                      <span className="metric-value" style={{ color: getQualityLabel(data.validEfficiencyScore).color }}>
                        {formatNumber(data.validEfficiencyScore || 0)}/100
                      </span>
                      <span className="metric-description">Assesses query optimization and efficiency</span>
                    </div>
                  )}
                </div>
              </div>
              
              {(data.tokensGenerated || data.tokensPerSecond) && (
                <div className="tokens-info">
                  {data.tokensGenerated && (
                    <span title="Approximate number of tokens in the generated response">
                      <strong>Tokens:</strong> ~{Math.round(data.tokensGenerated || 0)}
                    </span>
                  )}
                  {data.tokensPerSecond && (
                    <span title="Tokens generated per second (includes network latency)">
                      <strong>Generation Rate:</strong> {formatNumber(data.tokensPerSecond)}/sec
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <pre className="text-response">{data.response}</pre>
          )}
        </div>
      ) : (
        <div className="empty-response">
          <p>No response available</p>
        </div>
      )}
    </div>
  );
};

export default ModelResponseComponent; 
