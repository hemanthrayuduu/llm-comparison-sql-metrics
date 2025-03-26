import React from 'react';
import { ModelResponse } from '../services/api';
import './ModelComparison.css';

interface ModelComparisonProps {
  gptBase: ModelResponse;
  gptFinetuned: ModelResponse;
  gpt4Base: ModelResponse;
  gpt4Finetuned: ModelResponse;
}

const ModelComparison: React.FC<ModelComparisonProps> = ({
  gptBase,
  gptFinetuned,
  gpt4Base,
  gpt4Finetuned
}) => {
  const models = [
    { name: 'GPT-3.5 Turbo (Base)', data: gptBase },
    { name: 'GPT-3.5 Turbo (Fine-tuned)', data: gptFinetuned },
    { name: 'GPT-4 Turbo (Base)', data: gpt4Base },
    { name: 'GPT-4 Turbo (Fine-tuned)', data: gpt4Finetuned }
  ];

  return (
    <div className="model-comparison">
      <table>
        <thead>
          <tr>
            <th>Metric</th>
            {models.map(model => (
              <th key={model.name}>{model.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Execution Time (ms)</td>
            {models.map(model => (
              <td key={model.name}>{model.data?.executionTime || 'N/A'}</td>
            ))}
          </tr>
          <tr>
            <td>Response Length</td>
            {models.map(model => (
              <td key={model.name}>{model.data?.responseLength || 'N/A'}</td>
            ))}
          </tr>
          <tr>
            <td>SQL Quality Score</td>
            {models.map(model => (
              <td key={model.name}>{model.data?.sqlQualityScore || 'N/A'}</td>
            ))}
          </tr>
          <tr>
            <td>Execution Accuracy</td>
            {models.map(model => (
              <td key={model.name}>{model.data?.executionAccuracy || 'N/A'}</td>
            ))}
          </tr>
          <tr>
            <td>Exact Math Accuracy</td>
            {models.map(model => (
              <td key={model.name}>{model.data?.exactMathAccuracy || 'N/A'}</td>
            ))}
          </tr>
          <tr>
            <td>Efficiency Score</td>
            {models.map(model => (
              <td key={model.name}>{model.data?.validEfficiencyScore || 'N/A'}</td>
            ))}
          </tr>
          <tr>
            <td>Tokens Generated</td>
            {models.map(model => (
              <td key={model.name}>{model.data?.tokensGenerated || 'N/A'}</td>
            ))}
          </tr>
          <tr>
            <td>Tokens/Second</td>
            {models.map(model => (
              <td key={model.name}>{model.data?.tokensPerSecond || 'N/A'}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ModelComparison; 