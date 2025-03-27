import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, TooltipProps } from 'recharts';
import { ModelResponse } from '../services/api';
import './QualityScoreChart.css';

interface QualityScoreChartProps {
  gptBase: ModelResponse;
  gptFinetuned: ModelResponse;
  gpt4Base: ModelResponse;
  gpt4Finetuned: ModelResponse;
}

interface ChartData {
  name: string;
  gptBase: number;
  gptFinetuned: number;
  gpt4Base: number;
  gpt4Finetuned: number;
}

const QualityScoreChart: React.FC<QualityScoreChartProps> = ({
  gptBase,
  gptFinetuned,
  gpt4Base,
  gpt4Finetuned,
}) => {
  // Helper function to format numbers (only show decimals if needed)
  const formatNumber = (value: number): string => {
    if (Math.floor(value) === value) {
      return value.toString(); // Show as integer if it's a whole number
    }
    return value.toFixed(2); // Round to 2 decimal places otherwise
  };

  // Prepare data for the chart
  const data: ChartData[] = [
    {
      name: 'SQL Quality',
      gptBase: gptBase.sqlQualityScore || 0,
      gptFinetuned: gptFinetuned.sqlQualityScore || 0,
      gpt4Base: gpt4Base.sqlQualityScore || 0,
      gpt4Finetuned: gpt4Finetuned.sqlQualityScore || 0,
    },
    {
      name: 'Execution Accuracy',
      gptBase: gptBase.executionAccuracy || 0,
      gptFinetuned: gptFinetuned.executionAccuracy || 0,
      gpt4Base: gpt4Base.executionAccuracy || 0,
      gpt4Finetuned: gpt4Finetuned.executionAccuracy || 0,
    },
    {
      name: 'Math Accuracy',
      gptBase: gptBase.exactMathAccuracy || 0,
      gptFinetuned: gptFinetuned.exactMathAccuracy || 0,
      gpt4Base: gpt4Base.exactMathAccuracy || 0,
      gpt4Finetuned: gpt4Finetuned.exactMathAccuracy || 0,
    },
    {
      name: 'Efficiency Score',
      gptBase: gptBase.validEfficiencyScore || 0,
      gptFinetuned: gptFinetuned.validEfficiencyScore || 0,
      gpt4Base: gpt4Base.validEfficiencyScore || 0,
      gpt4Finetuned: gpt4Finetuned.validEfficiencyScore || 0,
    }
  ];

  // Color palette - updated with distinct but harmonious colors
  const colors = {
    gptBase: '#6366f1',      // Indigo
    gptFinetuned: '#10b981', // Emerald
    gpt4Base: '#f97316',     // Orange
    gpt4Finetuned: '#8b5cf6' // Purple
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <span className="tooltip-label">{label}</span>
          {payload.map((entry, index) => (
            <div key={`tooltip-${index}`} className="tooltip-data">
              <div 
                className="tooltip-color" 
                style={{ backgroundColor: entry.color }}
              />
              <span style={{
                color: entry.name === 'gptBase' ? colors.gptBase : 
                      entry.name === 'gptFinetuned' ? colors.gptFinetuned : 
                      entry.name === 'gpt4Base' ? colors.gpt4Base : 
                      colors.gpt4Finetuned,
                fontWeight: 600
              }}>
                {entry.name === 'gptBase' ? 'GPT-3.5 Turbo' : 
                 entry.name === 'gptFinetuned' ? 'GPT-3.5 Turbo (FT)' :
                 entry.name === 'gpt4Base' ? 'GPT-4o Mini' : 
                 'GPT-4o Mini (FT)'}
              </span>
              <span className="tooltip-value">{formatNumber(entry.value as number)}</span>
            </div>
          ))}
        </div>
      );
    }
  
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        listStyle: 'none', 
        padding: 0,
        margin: '15px 0 40px 0', // Increased bottom margin
        gap: '25px',
        flexWrap: 'wrap'
      }}>
        {payload.map((entry: any, index: number) => (
          <li key={`legend-${index}`} style={{ 
            display: 'flex', 
            alignItems: 'center',
            marginBottom: '10px',
            color: '#4b5563',
            fontSize: '0.875rem',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '6px 12px',
            borderRadius: '20px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            border: '1px solid rgba(99, 102, 241, 0.1)'
          }}>
            <div style={{ 
              width: '14px', 
              height: '14px', 
              backgroundColor: entry.color,
              marginRight: '10px',
              borderRadius: '50%',
              boxShadow: '0 0 0 1px rgba(99, 102, 241, 0.2)'
            }}/>
            <span style={{
              color: entry.value === 'gptBase' ? colors.gptBase : 
                    entry.value === 'gptFinetuned' ? colors.gptFinetuned : 
                    entry.value === 'gpt4Base' ? colors.gpt4Base : 
                    colors.gpt4Finetuned,
              fontWeight: 600
            }}>
              {entry.value === 'gptBase' ? 'GPT-3.5 Turbo' : 
               entry.value === 'gptFinetuned' ? 'GPT-3.5 Turbo (Fine-tuned)' :
               entry.value === 'gpt4Base' ? 'GPT-4o Mini' : 
               'GPT-4o Mini (Fine-tuned)'}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="chart-container">
      <h3 className="chart-title">Performance Metrics Comparison</h3>
      <ResponsiveContainer width="100%" height={420}>
        <BarChart
          data={data}
          margin={{
            top: 15,
            right: 30,
            left: 20,
            bottom: 35,
          }}
          barSize={28}
          barGap={8}
          barCategoryGap={30}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            axisLine={{ strokeWidth: 1 }}
            tickLine={{ strokeWidth: 1 }}
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fontSize: 12 }}
            axisLine={{ strokeWidth: 1 }}
            tickLine={{ strokeWidth: 1 }}
            tickCount={6}
          />
          <Tooltip content={<CustomTooltip />} cursor={{opacity: 0.3}} />
          <Legend content={renderLegend} />
          <Bar 
            dataKey="gptBase" 
            name="gptBase" 
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-gptBase-${index}`} 
                fill={colors.gptBase} 
                style={{ filter: 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.1))' }} 
              />
            ))}
          </Bar>
          <Bar 
            dataKey="gptFinetuned" 
            name="gptFinetuned" 
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-gptFinetuned-${index}`} 
                fill={colors.gptFinetuned} 
                style={{ filter: 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.1))' }} 
              />
            ))}
          </Bar>
          <Bar 
            dataKey="gpt4Base" 
            name="gpt4Base" 
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-gpt4Base-${index}`} 
                fill={colors.gpt4Base} 
                style={{ filter: 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.1))' }} 
              />
            ))}
          </Bar>
          <Bar 
            dataKey="gpt4Finetuned" 
            name="gpt4Finetuned" 
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-gpt4Finetuned-${index}`} 
                fill={colors.gpt4Finetuned} 
                style={{ filter: 'drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.1))' }} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default QualityScoreChart; 