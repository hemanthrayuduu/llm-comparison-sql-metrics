import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ModelResponse } from '../services/api';
import './ModelComparison.css';

interface ModelComparisonProps {
  gptBase?: ModelResponse;
  gptFinetuned?: ModelResponse;
  gpt4oMiniBase?: ModelResponse;
  gpt4oMiniFinetuned?: ModelResponse;
}

const ModelComparison: React.FC<ModelComparisonProps> = ({
  gptBase,
  gptFinetuned,
  gpt4oMiniBase,
  gpt4oMiniFinetuned
}) => {
  // Format tooltip values
  const formatTooltipValue = (value: number) => {
    return value.toFixed(2);
  };

  // Prepare data for charts
  const prepareExecutionTimeData = () => {
    return [
      {
        name: 'Execution Time (s)',
        'GPT-3.5 Base': gptBase?.executionTime || 0,
        'GPT-3.5 Fine-tuned': gptFinetuned?.executionTime || 0,
        'GPT-4o-mini Base': gpt4oMiniBase?.executionTime || 0,
        'GPT-4o-mini Fine-tuned': gpt4oMiniFinetuned?.executionTime || 0
      }
    ];
  };

  const prepareSqlQualityData = () => {
    return [
      {
        name: 'SQL Quality Score',
        'GPT-3.5 Base': gptBase?.sqlQualityScore || 0,
        'GPT-3.5 Fine-tuned': gptFinetuned?.sqlQualityScore || 0,
        'GPT-4o-mini Base': gpt4oMiniBase?.sqlQualityScore || 0,
        'GPT-4o-mini Fine-tuned': gpt4oMiniFinetuned?.sqlQualityScore || 0
      }
    ];
  };

  const prepareResponseLengthData = () => {
    return [
      {
        name: 'Response Length',
        'GPT-3.5 Base': gptBase?.responseLength || 0,
        'GPT-3.5 Fine-tuned': gptFinetuned?.responseLength || 0,
        'GPT-4o-mini Base': gpt4oMiniBase?.responseLength || 0,
        'GPT-4o-mini Fine-tuned': gpt4oMiniFinetuned?.responseLength || 0
      }
    ];
  };

  return (
    <div className="model-comparison">
      <div className="chart-container">
        <h3>Execution Time Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={prepareExecutionTimeData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={formatTooltipValue} />
            <Bar dataKey="GPT-3.5 Base" fill="#8884d8" />
            <Bar dataKey="GPT-3.5 Fine-tuned" fill="#82ca9d" />
            <Bar dataKey="GPT-4o-mini Base" fill="#ffc658" />
            <Bar dataKey="GPT-4o-mini Fine-tuned" fill="#ff7300" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3>SQL Quality Score Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={prepareSqlQualityData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={formatTooltipValue} />
            <Bar dataKey="GPT-3.5 Base" fill="#8884d8" />
            <Bar dataKey="GPT-3.5 Fine-tuned" fill="#82ca9d" />
            <Bar dataKey="GPT-4o-mini Base" fill="#ffc658" />
            <Bar dataKey="GPT-4o-mini Fine-tuned" fill="#ff7300" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-container">
        <h3>Response Length Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={prepareResponseLengthData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={formatTooltipValue} />
            <Bar dataKey="GPT-3.5 Base" fill="#8884d8" />
            <Bar dataKey="GPT-3.5 Fine-tuned" fill="#82ca9d" />
            <Bar dataKey="GPT-4o-mini Base" fill="#ffc658" />
            <Bar dataKey="GPT-4o-mini Fine-tuned" fill="#ff7300" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ModelComparison; 