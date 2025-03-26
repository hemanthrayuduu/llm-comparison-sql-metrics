import React, { useState, useEffect } from 'react';
import { ModelResponse as ModelResponseType } from '../services/api';
import { queryModel } from '../services/api';
import { MODEL_CONFIG } from '../services/api';
import ModelResponse from './ModelResponse';
import ModelComparison from './ModelComparison';
import { sampleQueries } from '../data/sampleQueries';
import './ComparisonPage.css';

interface ComparisonPageProps {
  // Add any props if needed
}

const ComparisonPage: React.FC<ComparisonPageProps> = () => {
  const [query, setQuery] = useState<string>('');
  const [selectedSample, setSelectedSample] = useState<string>('');
  const [schema, setSchema] = useState<string>('');
  const [showSchemaInput, setShowSchemaInput] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responses, setResponses] = useState<ModelResponseType[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isCustomQuery, setIsCustomQuery] = useState<boolean>(true);
  const [showVisualization, setShowVisualization] = useState<boolean>(false);

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
    setIsCustomQuery(true);
    setShowVisualization(false);
  };

  const handleSampleSelect = (sample: string) => {
    if (sample) {
      const selectedQuery = sampleQueries.find(q => q.id === sample);
      if (selectedQuery) {
        setQuery(selectedQuery.query);
        setSchema(selectedQuery.schema || '');
        setShowSchemaInput(!!selectedQuery.schema);
      }
    }
    setSelectedSample(sample);
  };

  return (
    <div className="comparison-page">
      <div className="query-section">
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <select 
              value={selectedSample}
              onChange={(e) => handleSampleSelect(e.target.value)}
              className="sample-select"
            >
              <option value="">Custom Query</option>
              {sampleQueries.map(sample => (
                <option key={sample.id} value={sample.id}>
                  {sample.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your query here..."
              rows={4}
              required
            />
          </div>

          {showSchemaInput && (
            <div className="input-group">
              <textarea
                value={schema}
                onChange={(e) => setSchema(e.target.value)}
                placeholder="Enter schema here (optional)..."
                rows={4}
              />
            </div>
          )}

          <div className="button-group">
            <button type="submit" disabled={isLoading || !query.trim()}>
              {isLoading ? 'Processing...' : 'Compare Models'}
            </button>
            <button type="button" onClick={handleReset}>
              Reset
            </button>
          </div>
        </form>
      </div>

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

      {showVisualization && responses.length > 0 && (
        <div className="visualization-section">
          <h2>Performance Comparison</h2>
          <ModelComparison 
            gptBase={responses[0]} 
            gptFinetuned={responses[1]}
            gpt4Base={responses[2]}
            gpt4Finetuned={responses[3]}
          />
        </div>
      )}
    </div>
  );
};

export default ComparisonPage; 