import React from 'react';
import { ModelResponse } from '../services/api';
import QualityScoreChart from './QualityScoreChart';
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
  // Helper function to format numbers (only show decimals if needed)
  const formatNumber = (value: number): string => {
    if (value === undefined || value === null) return 'N/A';
    if (Math.floor(value) === value) {
      return value.toString(); // Show as integer if it's a whole number
    }
    return value.toFixed(2); // Round to 2 decimal places otherwise
  };

  const findHighestValue = (metric: keyof ModelResponse) => {
    const values = [
      gptBase[metric] as number || 0,
      gptFinetuned[metric] as number || 0,
      gpt4Base[metric] as number || 0,
      gpt4Finetuned[metric] as number || 0
    ];
    return Math.max(...values);
  };

  const isHighestValue = (value: number | undefined, metric: keyof ModelResponse): boolean => {
    if (value === undefined) return false;
    const maxValue = findHighestValue(metric);
    return value === maxValue && maxValue > 0;
  };

  return (
    <div className="model-comparison">
      <div className="chart-section">
        <QualityScoreChart 
          gptBase={gptBase} 
          gptFinetuned={gptFinetuned}
          gpt4Base={gpt4Base}
          gpt4Finetuned={gpt4Finetuned}
        />
      </div>
      
      <div className="table-section">
        <h3 className="section-title">Detailed Metrics Comparison</h3>
        <div className="metrics-table-container">
          <table className="metrics-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>SQL Quality Score</th>
                <th>Execution Accuracy</th>
                <th>Math Accuracy</th>
                <th>Efficiency Score</th>
                <th>Response Time (ms)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="model-name-cell">
                  GPT-3.5 Turbo
                  <span className="model-tag-small tag-base-small">Base</span>
                </td>
                <td className={`value-cell ${isHighestValue(gptBase.sqlQualityScore, 'sqlQualityScore') ? 'highlight' : ''}`}>
                  {formatNumber(gptBase.sqlQualityScore || 0)}
                </td>
                <td className={`value-cell ${isHighestValue(gptBase.executionAccuracy, 'executionAccuracy') ? 'highlight' : ''}`}>
                  {formatNumber(gptBase.executionAccuracy || 0)}
                </td>
                <td className={`value-cell ${isHighestValue(gptBase.exactMathAccuracy, 'exactMathAccuracy') ? 'highlight' : ''}`}>
                  {formatNumber(gptBase.exactMathAccuracy || 0)}
                </td>
                <td className={`value-cell ${isHighestValue(gptBase.validEfficiencyScore, 'validEfficiencyScore') ? 'highlight' : ''}`}>
                  {formatNumber(gptBase.validEfficiencyScore || 0)}
                </td>
                <td className="value-cell">
                  {formatNumber(gptBase.executionTime || 0)}
                </td>
              </tr>
              <tr>
                <td className="model-name-cell">
                  GPT-3.5 Turbo
                  <span className="model-tag-small tag-finetuned-small">Fine-tuned</span>
                </td>
                <td className={`value-cell ${isHighestValue(gptFinetuned.sqlQualityScore, 'sqlQualityScore') ? 'highlight' : ''}`}>
                  {formatNumber(gptFinetuned.sqlQualityScore || 0)}
                </td>
                <td className={`value-cell ${isHighestValue(gptFinetuned.executionAccuracy, 'executionAccuracy') ? 'highlight' : ''}`}>
                  {formatNumber(gptFinetuned.executionAccuracy || 0)}
                </td>
                <td className={`value-cell ${isHighestValue(gptFinetuned.exactMathAccuracy, 'exactMathAccuracy') ? 'highlight' : ''}`}>
                  {formatNumber(gptFinetuned.exactMathAccuracy || 0)}
                </td>
                <td className={`value-cell ${isHighestValue(gptFinetuned.validEfficiencyScore, 'validEfficiencyScore') ? 'highlight' : ''}`}>
                  {formatNumber(gptFinetuned.validEfficiencyScore || 0)}
                </td>
                <td className="value-cell">
                  {formatNumber(gptFinetuned.executionTime || 0)}
                </td>
              </tr>
              <tr>
                <td className="model-name-cell">
                  GPT-4o Mini
                  <span className="model-tag-small tag-base-small">Base</span>
                </td>
                <td className={`value-cell ${isHighestValue(gpt4Base.sqlQualityScore, 'sqlQualityScore') ? 'highlight' : ''}`}>
                  {formatNumber(gpt4Base.sqlQualityScore || 0)}
                </td>
                <td className={`value-cell ${isHighestValue(gpt4Base.executionAccuracy, 'executionAccuracy') ? 'highlight' : ''}`}>
                  {formatNumber(gpt4Base.executionAccuracy || 0)}
                </td>
                <td className={`value-cell ${isHighestValue(gpt4Base.exactMathAccuracy, 'exactMathAccuracy') ? 'highlight' : ''}`}>
                  {formatNumber(gpt4Base.exactMathAccuracy || 0)}
                </td>
                <td className={`value-cell ${isHighestValue(gpt4Base.validEfficiencyScore, 'validEfficiencyScore') ? 'highlight' : ''}`}>
                  {formatNumber(gpt4Base.validEfficiencyScore || 0)}
                </td>
                <td className="value-cell">
                  {formatNumber(gpt4Base.executionTime || 0)}
                </td>
              </tr>
              <tr>
                <td className="model-name-cell">
                  GPT-4o Mini
                  <span className="model-tag-small tag-finetuned-small">Fine-tuned</span>
                </td>
                <td className={`value-cell ${isHighestValue(gpt4Finetuned.sqlQualityScore, 'sqlQualityScore') ? 'highlight' : ''}`}>
                  {formatNumber(gpt4Finetuned.sqlQualityScore || 0)}
                </td>
                <td className={`value-cell ${isHighestValue(gpt4Finetuned.executionAccuracy, 'executionAccuracy') ? 'highlight' : ''}`}>
                  {formatNumber(gpt4Finetuned.executionAccuracy || 0)}
                </td>
                <td className={`value-cell ${isHighestValue(gpt4Finetuned.exactMathAccuracy, 'exactMathAccuracy') ? 'highlight' : ''}`}>
                  {formatNumber(gpt4Finetuned.exactMathAccuracy || 0)}
                </td>
                <td className={`value-cell ${isHighestValue(gpt4Finetuned.validEfficiencyScore, 'validEfficiencyScore') ? 'highlight' : ''}`}>
                  {formatNumber(gpt4Finetuned.validEfficiencyScore || 0)}
                </td>
                <td className="value-cell">
                  {formatNumber(gpt4Finetuned.executionTime || 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ModelComparison; 