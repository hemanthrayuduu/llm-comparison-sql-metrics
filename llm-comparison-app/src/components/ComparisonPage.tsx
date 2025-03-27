import React, { useState } from 'react';
import { ModelResponse as ModelResponseType } from '../services/api';
import { queryModel } from '../services/api';
import { MODEL_CONFIG } from '../services/api';
import ModelResponse from './ModelResponse';
import ModelComparison from './ModelComparison';
import { sampleQueries } from '../data/sampleQueries';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './ComparisonPage.css';

interface ComparisonPageProps {
  // Add any props if needed
}

const ComparisonPage: React.FC<ComparisonPageProps> = () => {
  const [query, setQuery] = useState<string>('');
  const [selectedSample, setSelectedSample] = useState<string>('');
  const [schema, setSchema] = useState<string>('');
  const [showSchemaInput, setShowSchemaInput] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responses, setResponses] = useState<ModelResponseType[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showVisualization, setShowVisualization] = useState<boolean>(false);
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(undefined);
    
    try {
      console.log('Querying models with prompt:', query);
      console.log('Using schema:', schema);
      
      // Create a combined prompt with the schema if provided
      const combinedPrompt = schema 
        ? `Given the following database schema:\n\n${schema}\n\n${query}`
        : query;
      
      const results = await queryModel(combinedPrompt);
      
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
      setShowVisualization(true);
    } catch (error) {
      console.error('General error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while querying the models');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setQuery('');
    setSelectedSample('');
    setSchema('');
    setResponses([]);
    setError(undefined);
    setShowVisualization(false);
  };

  const handleSampleSelect = (sample: string) => {
    if (sample) {
      const selectedQuery = sampleQueries.find(q => q.id === sample);
      if (selectedQuery) {
        setQuery(selectedQuery.query);
        setSchema(selectedQuery.schema || '');
      }
    }
    setSelectedSample(sample);
  };

  // Helper function to format numbers (only show decimals if needed)
  const formatNumber = (value: number): string => {
    if (Math.floor(value) === value) {
      return value.toString(); // Show as integer if it's a whole number
    }
    return value.toFixed(2); // Round to 2 decimal places otherwise
  };

  // Function to determine the best performing model
  const getBestModel = () => {
    if (!responses.length) return null;
    
    let bestScore = -1;
    let bestIndex = -1;
    
    responses.forEach((response, index) => {
      if (response.sqlQualityScore && response.sqlQualityScore > bestScore) {
        bestScore = response.sqlQualityScore;
        bestIndex = index;
      }
    });
    
    if (bestIndex === -1) return null;
    
    const modelNames = ['GPT-3.5 Turbo', 'GPT-3.5 Turbo (Fine-tuned)', 'GPT-4o Mini', 'GPT-4o Mini (Fine-tuned)'];
    
    return {
      name: responses[bestIndex].model || modelNames[bestIndex],
      score: bestScore,
      index: bestIndex
    };
  };

  return (
    <div className="comparison-page">
      <div className="page-header">
        <h1>Text-to-SQL Model Comparison Tool</h1>
        <p>Compare SQL generation capabilities across different Large language models</p>
      </div>

      <div className="input-section">
        <h2>Query Configuration</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-section-grid">
            <div className="input-card">
              <div className="input-card-header">
                <span className="input-card-title">Natural Language Query</span>
                <span className="input-card-subtitle">Enter your query in plain English</span>
              </div>
              <textarea
                className="input-textarea"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., Find all customers who placed orders in the last month"
                required
                aria-label="SQL query in natural language"
              />
            </div>
            
            <div className="input-card">
              <div className="input-card-header">
                <span className="input-card-title">Sample Queries</span>
                <span className="input-card-subtitle">Select from pre-defined examples</span>
              </div>
              <select 
                className="sample-select"
                value={selectedSample}
                onChange={(e) => handleSampleSelect(e.target.value)}
                aria-label="Sample query selection"
              >
                <option value="">Select a sample query...</option>
                {sampleQueries.map(sample => (
                  <option key={sample.id} value={sample.id}>
                    {sample.name}
                  </option>
                ))}
              </select>
              
              {selectedSample && (
                <div className="selected-sample-info">
                  <p>{sampleQueries.find(s => s.id === selectedSample)?.query}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="toggle-container">
            <span className="toggle-label">Show Schema Editor</span>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={showSchemaInput}
                onChange={() => setShowSchemaInput(!showSchemaInput)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          {showSchemaInput && (
            <div className="input-card schema-card">
              <div className="input-card-header">
                <span className="input-card-title">Database Schema</span>
                <span className="input-card-subtitle">Define your database structure using SQL CREATE TABLE statements</span>
              </div>
              <textarea
                className="input-textarea schema-textarea"
                value={schema}
                onChange={(e) => setSchema(e.target.value)}
                placeholder="-- Enter your schema here
-- Example:
CREATE TABLE users (
  id INT PRIMARY KEY,
  username VARCHAR(50),
  email VARCHAR(100)
);"
                aria-label="Database schema"
                rows={8}
              />
            </div>
          )}
          
          <div className="query-actions">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={isLoading}
              aria-label="Reset form"
            >
              Reset
            </button>
            <button 
              type="submit" 
              className={`btn btn-primary ${isLoading ? 'btn-loading' : ''}`}
              disabled={isLoading || !query.trim()}
              aria-label="Compare models"
            >
              {isLoading ? 'Processing...' : 'Compare Models'}
            </button>
          </div>
        </form>
      </div>

      {responses.length > 0 && (
        <div className="results-container">
          <div className="results-section">
            <h2>Model Responses</h2>
            <div className="results-grid">
              {responses.map((response, index) => {
                // Get model name from the response or use a default name
                const modelName = response.model || (
                  index === 0 ? 'GPT-3.5 Turbo (Base)' :
                  index === 1 ? 'GPT-3.5 Turbo (Fine-tuned)' :
                  index === 2 ? 'GPT-4o Mini (Base)' :
                  'GPT-4o Mini (Fine-tuned)'
                );
                
                // Determine if this is a fine-tuned model
                const isFineTuned = modelName.toLowerCase().includes('fine-tuned');
                
                return (
                  <div className="result-card" key={index}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                        {modelName.replace(' (Base)', '').replace(' (Fine-tuned)', '')}
                      </span>
                      <span className={`model-tag ${isFineTuned ? 'tag-finetuned' : 'tag-base'}`}>
                        {isFineTuned ? 'Fine-tuned' : 'Base'}
                      </span>
                    </div>
                    <ModelResponse 
                      data={response} 
                      isLoading={isLoading} 
                      error={error} 
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {showVisualization && (
            <div className="metrics-section">
              <h2>Performance Comparison</h2>
              
              {getBestModel() && (
                <div className="best-model">
                  <p className="best-model-title">
                    Best Performing Model: {getBestModel()?.name}
                  </p>
                  <p className="best-model-description">
                    Achieved the highest SQL quality score of {formatNumber(getBestModel()?.score || 0)}/100 and demonstrated superior performance in generating accurate SQL queries.
                  </p>
                </div>
              )}
              
              <div style={{ marginTop: '1.5rem' }}>
                <ModelComparison 
                  gptBase={responses[0]} 
                  gptFinetuned={responses[1]}
                  gpt4Base={responses[2]}
                  gpt4Finetuned={responses[3]}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComparisonPage; 