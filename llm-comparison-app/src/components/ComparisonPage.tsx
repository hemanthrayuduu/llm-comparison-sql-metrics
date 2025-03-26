import React, { useState, useEffect } from 'react';
import ModelResponse from './ModelResponse';
import ModelComparison from './ModelComparison';
import { 
  sequentialQueryModels, 
  ModelResponse as ModelResponseType, 
  MODEL_CONFIG,
  queryModel
} from '../services/api';
import { sampleQueries } from '../data/sampleQueries';
import './ComparisonPage.css';

const ComparisonPage: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [selectedSample, setSelectedSample] = useState<string>('');
  const [schema, setSchema] = useState<string>('');
  const [showSchemaInput, setShowSchemaInput] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responses, setResponses] = useState<ModelResponseType[]>([]);
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

  // Handle schema input change
  const handleSchemaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSchema(e.target.value);
  };

  // Toggle schema input visibility
  const toggleSchemaInput = () => {
    setShowSchemaInput(!showSchemaInput);
    if (!showSchemaInput && schema === '') {
      setSchema(schemaTemplate);
    }
  };

  // Function to handle query submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(undefined);
    
    try {
      console.log('Querying models with prompt:', query);
      const results = await queryModel(query);
      
      if (Array.isArray(results)) {
        setResponses(results);
      } else {
        setResponses([
          results.gptBase,
          results.gptFinetuned,
          results.gpt4Base,
          results.gpt4Finetuned
        ]);
      }
    } catch (error) {
      console.error('General error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while querying the models');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to clear all responses and query
  const handleClear = () => {
    setQuery('');
    setSelectedSample('');
    setSchema('');
    setResponses([]);
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

  // Sample schema template
  const schemaTemplate = `CREATE TABLE users (
  id INT PRIMARY KEY,
  username VARCHAR(50),
  email VARCHAR(100),
  created_at TIMESTAMP
);

CREATE TABLE posts (
  id INT PRIMARY KEY,
  user_id INT,
  title VARCHAR(200),
  content TEXT,
  created_at TIMESTAMP
);`;

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

        <div className="schema-toggle">
          <button 
            className={`toggle-button ${showSchemaInput ? 'active' : ''}`}
            onClick={toggleSchemaInput}
          >
            {showSchemaInput ? 'Hide Database Schema' : 'Add Database Schema'}
          </button>
          <span className="schema-info-text">
            {showSchemaInput ? 'Define your database structure to help the LLM generate better SQL' : 'Adding a schema helps the LLM understand your database structure'}
          </span>
        </div>

        {showSchemaInput && (
          <div className="schema-container">
            <textarea
              placeholder={schemaTemplate}
              value={schema}
              onChange={handleSchemaChange}
              className="schema-textarea"
              rows={10}
            />
          </div>
        )}

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
        {responses.map((response, index) => (
          <div className="response-item" key={index}>
            <h3>{MODEL_CONFIG.GPT_BASE.name}</h3>
            <ModelResponse 
              data={response} 
              isLoading={isLoading} 
              error={error} 
            />
          </div>
        ))}
      </div>

      {showVisualization && (
        <div className="comparison-section">
          <h2>Performance Comparison</h2>
          <ModelComparison 
            gptBase={responses[0]} 
            gptFinetuned={responses[1]}
            gpt4oMiniBase={responses[2]}
            gpt4oMiniFinetuned={responses[3]}
          />
        </div>
      )}
    </div>
  );
};

export default ComparisonPage; 