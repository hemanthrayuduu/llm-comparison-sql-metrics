import React, { useState, useEffect } from 'react';
import ModelResponse from './ModelResponse';
import ModelComparison from './ModelComparison';
import { 
  queryModel, 
  sequentialQueryModels, 
  ModelResponse as ModelResponseType, 
  MODEL_CONFIG 
} from '../services/api';
import { sampleQueries } from '../data/sampleQueries';
import './ComparisonPage.css';

const ComparisonPage: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [selectedSample, setSelectedSample] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [gptBaseResponse, setGptBaseResponse] = useState<ModelResponseType | undefined>(undefined);
  const [gptFineTunedResponse, setGptFineTunedResponse] = useState<ModelResponseType | undefined>(undefined);
  const [gpt4oMiniBaseResponse, setGpt4oMiniBaseResponse] = useState<ModelResponseType | undefined>(undefined);
  const [gpt4oMiniFineTunedResponse, setGpt4oMiniFineTunedResponse] = useState<ModelResponseType | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isCustomQuery, setIsCustomQuery] = useState<boolean>(true);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  const [showVisualization, setShowVisualization] = useState<boolean>(false);

  // Handle sample query selection
  useEffect(() => {
    if (selectedSample) {
      const sample = sampleQueries.find(q => q.id === selectedSample);
      if (sample) {
        setQuery(sample.text);
        setIsCustomQuery(false);
      }
    }
  }, [selectedSample]);

  // Handle query input change
  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    setIsCustomQuery(true);
    
    // Clear sample selection when user types their own query
    if (selectedSample && e.target.value !== sampleQueries.find(q => q.id === selectedSample)?.text) {
      setSelectedSample('');
    }
  };

  // Function to handle query submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query) return;
    
    setIsLoading(true);
    setError(undefined);
    setGptBaseResponse(undefined);
    setGptFineTunedResponse(undefined);
    setGpt4oMiniBaseResponse(undefined);
    setGpt4oMiniFineTunedResponse(undefined);
    setShowVisualization(false);
    
    try {
      console.log('Submitting query:', query);
      
      // Add to query history if it's a new query
      if (!queryHistory.includes(query)) {
        setQueryHistory(prev => [query, ...prev].slice(0, 10)); // Keep last 10 queries
      }

      // Use sequential model querying instead of parallel
      const results = await sequentialQueryModels(query);
      
      setGptBaseResponse(results.gptBase);
      setGptFineTunedResponse(results.gptFinetuned);
      setGpt4oMiniBaseResponse(results.gpt4oMiniBase);
      setGpt4oMiniFineTunedResponse(results.gpt4oMiniFinetuned);
      setShowVisualization(true);
    } catch (err) {
      console.error('General error:', err);
      setError(`Error fetching responses: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to clear all responses and query
  const handleClear = () => {
    setQuery('');
    setSelectedSample('');
    setGptBaseResponse(undefined);
    setGptFineTunedResponse(undefined);
    setGpt4oMiniBaseResponse(undefined);
    setGpt4oMiniFineTunedResponse(undefined);
    setError(undefined);
    setIsCustomQuery(true);
    setShowVisualization(false);
  };

  // Sample query suggestions
  const querySuggestions = [
    "Find all customers who spent more than $1000",
    "Show me the top 10 products by revenue",
    "List all orders from the last month"
  ];

  return (
    <div className="comparison-container">
      <div className="header">
        <h1>LLM Comparison: Text-to-SQL</h1>
        <p>Compare GPT-3.5 Turbo and GPT-4o-mini models before and after fine-tuning</p>
      </div>

      <div className="query-section">
        <div className="query-controls">
          <div className="select-container">
            <select 
              value={selectedSample}
              onChange={(e) => setSelectedSample(e.target.value)}
              className="sample-select"
            >
              <option value="">Select a sample query</option>
              {sampleQueries.map((sample) => (
                <option key={sample.id} value={sample.id}>
                  {sample.text.length > 60 ? `${sample.text.substring(0, 60)}...` : sample.text}
                </option>
              ))}
            </select>
            
            {queryHistory.length > 0 && (
              <select 
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    setQuery(e.target.value);
                    setIsCustomQuery(true);
                    setSelectedSample('');
                  }
                }}
                className="history-select"
              >
                <option value="" disabled>Recent queries</option>
                {queryHistory.map((q, i) => (
                  <option key={i} value={q}>
                    {q.length > 60 ? `${q.substring(0, 60)}...` : q}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div className="button-group">
            <button 
              className="primary-button" 
              onClick={handleSubmit} 
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? 'Loading...' : 'Submit'}
            </button>
            <button 
              className="secondary-button" 
              onClick={handleClear} 
              disabled={isLoading}
            >
              Clear
            </button>
          </div>
        </div>

        <textarea
          placeholder="Enter your query here or select a sample query above..."
          value={query}
          onChange={handleQueryChange}
          className="query-textarea"
          rows={4}
        />

        <div className="query-suggestions">
          {querySuggestions.map((suggestion, i) => (
            <button 
              key={i} 
              className="suggestion-chip"
              onClick={() => {
                setQuery(suggestion);
                setIsCustomQuery(true);
                setSelectedSample('');
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>

        {selectedSample && !isCustomQuery && (
          <div className="expected-sql">
            <p><strong>Expected SQL:</strong></p>
            <pre>
              {sampleQueries.find(q => q.id === selectedSample)?.expectedSql || 'No expected SQL provided'}
            </pre>
          </div>
        )}
        
        {isCustomQuery && query.trim() && (
          <div className="query-hint">
            <p><strong>Custom Query:</strong> Your query will be sent to all models to generate SQL.</p>
          </div>
        )}
      </div>

      <div className="divider"></div>

      <h2>Model Responses</h2>

      <div className="responses-grid">
        <div className="response-item">
          <h3>{MODEL_CONFIG.GPT_BASE.name}</h3>
          <ModelResponse 
            data={gptBaseResponse} 
            isLoading={isLoading} 
            error={error} 
          />
        </div>
        
        <div className="response-item">
          <h3>{MODEL_CONFIG.GPT_FINETUNED.name}</h3>
          <ModelResponse 
            data={gptFineTunedResponse} 
            isLoading={isLoading} 
            error={error} 
          />
        </div>
        
        <div className="response-item">
          <h3>{MODEL_CONFIG.GPT4O_MINI_BASE.name}</h3>
          <ModelResponse 
            data={gpt4oMiniBaseResponse} 
            isLoading={isLoading} 
            error={error} 
          />
        </div>
        
        <div className="response-item">
          <h3>{MODEL_CONFIG.GPT4O_MINI_FINETUNED.name}</h3>
          <ModelResponse 
            data={gpt4oMiniFineTunedResponse} 
            isLoading={isLoading} 
            error={error} 
          />
        </div>
      </div>

      {showVisualization && (
        <ModelComparison
          gptBase={gptBaseResponse}
          gptFinetuned={gptFineTunedResponse}
          gpt4oMiniBase={gpt4oMiniBaseResponse}
          gpt4oMiniFinetuned={gpt4oMiniFineTunedResponse}
        />
      )}
    </div>
  );
};

export default ComparisonPage; 