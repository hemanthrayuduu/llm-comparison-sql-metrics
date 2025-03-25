import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line
} from 'recharts';
import { ModelResponse, MODEL_CONFIG } from '../services/api';
import './ModelComparison.css';

interface ModelComparisonProps {
  gptBase?: ModelResponse;
  gptFinetuned?: ModelResponse;
  gpt4oMiniBase?: ModelResponse;
  gpt4oMiniFinetuned?: ModelResponse;
}

interface MetricData {
  name: string;
  'GPT-3.5 Turbo (Base)': number;
  'GPT-3.5 Turbo (Fine-tuned)': number;
  'GPT-4o-mini (Base)': number;
  'GPT-4o-mini (Fine-tuned)': number;
}

interface RadarMetricData {
  metric: string;
  'GPT-3.5 Turbo (Base)': number;
  'GPT-3.5 Turbo (Fine-tuned)': number;
  'GPT-4o-mini (Base)': number;
  'GPT-4o-mini (Fine-tuned)': number;
  fullMark: number;
}

const ModelComparison: React.FC<ModelComparisonProps> = ({ 
  gptBase, 
  gptFinetuned, 
  gpt4oMiniBase, 
  gpt4oMiniFinetuned 
}) => {
  const [executionTimeData, setExecutionTimeData] = useState<MetricData[]>([]);
  const [sqlQualityData, setSqlQualityData] = useState<MetricData[]>([]);
  const [responseLengthData, setResponseLengthData] = useState<MetricData[]>([]);
  const [tokensPerSecondData, setTokensPerSecondData] = useState<MetricData[]>([]);
  const [radarData, setRadarData] = useState<RadarMetricData[]>([]);
  const [activeTab, setActiveTab] = useState<'execution' | 'quality' | 'length' | 'speed' | 'radar'>('execution');

  // Check if data is from real API or simulated
  const isGpt35Real = gptBase?.response && !gptBase.response.includes("Using mock response instead");
  const isGpt35FtReal = gptFinetuned?.response && !gptFinetuned.response.includes("Using mock response instead");
  const isGpt4oMiniReal = gpt4oMiniBase?.response && !gpt4oMiniBase.response.includes("Using mock response instead");
  const isGpt4oMiniFtReal = gpt4oMiniFinetuned?.response && !gpt4oMiniFinetuned.response.includes("Using mock response instead");
  
  // Calculate percentage of real data
  const realDataPercentage = [isGpt35Real, isGpt35FtReal, isGpt4oMiniReal, isGpt4oMiniFtReal]
    .filter(Boolean).length / 4 * 100;

  // Function to determine data source status message
  const getDataSourceStatus = () => {
    if (realDataPercentage === 100) {
      return "All metrics are calculated from real API responses";
    } else if (realDataPercentage > 0) {
      return `${realDataPercentage}% of metrics are from real API responses, others are simulated`;
    } else {
      return "All metrics are simulated due to API connection issues";
    }
  };

  // Get data source status color
  const getStatusColor = () => {
    if (realDataPercentage === 100) {
      return '#4caf50';
    } else if (realDataPercentage > 0) {
      return '#ff9800';
    } else {
      return '#f44336';
    }
  };

  useEffect(() => {
    // Prepare execution time data
    const timeData: MetricData = {
      name: 'Total Response Time (ms)',
      'GPT-3.5 Turbo (Base)': gptBase?.executionTime || 0,
      'GPT-3.5 Turbo (Fine-tuned)': gptFinetuned?.executionTime || 0,
      'GPT-4o-mini (Base)': gpt4oMiniBase?.executionTime || 0,
      'GPT-4o-mini (Fine-tuned)': gpt4oMiniFinetuned?.executionTime || 0
    };
    setExecutionTimeData([timeData]);

    // Prepare SQL quality data
    const qualityData: MetricData = {
      name: 'SQL Quality Score',
      'GPT-3.5 Turbo (Base)': gptBase?.sqlQualityScore || 0,
      'GPT-3.5 Turbo (Fine-tuned)': gptFinetuned?.sqlQualityScore || 0,
      'GPT-4o-mini (Base)': gpt4oMiniBase?.sqlQualityScore || 0,
      'GPT-4o-mini (Fine-tuned)': gpt4oMiniFinetuned?.sqlQualityScore || 0
    };
    setSqlQualityData([qualityData]);

    // Prepare response length data
    const lengthData: MetricData = {
      name: 'Response Length (chars)',
      'GPT-3.5 Turbo (Base)': gptBase?.responseLength || 0,
      'GPT-3.5 Turbo (Fine-tuned)': gptFinetuned?.responseLength || 0,
      'GPT-4o-mini (Base)': gpt4oMiniBase?.responseLength || 0,
      'GPT-4o-mini (Fine-tuned)': gpt4oMiniFinetuned?.responseLength || 0
    };
    setResponseLengthData([lengthData]);

    // Prepare tokens per second data
    const speedData: MetricData = {
      name: 'Generation Speed (tokens/sec)',
      'GPT-3.5 Turbo (Base)': gptBase?.tokensPerSecond || 0,
      'GPT-3.5 Turbo (Fine-tuned)': gptFinetuned?.tokensPerSecond || 0,
      'GPT-4o-mini (Base)': gpt4oMiniBase?.tokensPerSecond || 0,
      'GPT-4o-mini (Fine-tuned)': gpt4oMiniFinetuned?.tokensPerSecond || 0
    };
    setTokensPerSecondData([speedData]);

    // Prepare radar data
    setRadarData(prepareRadarData());
  }, [gptBase, gptFinetuned, gpt4oMiniBase, gpt4oMiniFinetuned]);

  // Prepare data for tokens per second chart
  const prepareTokensPerSecondData = (): MetricData[] => {
    const speedData: MetricData = {
      name: 'Tokens Per Second',
      'GPT-3.5 Turbo (Base)': gptBase?.tokensPerSecond || 0,
      'GPT-3.5 Turbo (Fine-tuned)': gptFinetuned?.tokensPerSecond || 0,
      'GPT-4o-mini (Base)': gpt4oMiniBase?.tokensPerSecond || 0,
      'GPT-4o-mini (Fine-tuned)': gpt4oMiniFinetuned?.tokensPerSecond || 0
    };
    return [speedData];
  };

  // Prepare data for radar chart
  const prepareRadarData = (): RadarMetricData[] => {
    return [
      {
        metric: 'SQL Quality',
        'GPT-3.5 Turbo (Base)': gptBase?.sqlQualityScore || 0,
        'GPT-3.5 Turbo (Fine-tuned)': gptFinetuned?.sqlQualityScore || 0,
        'GPT-4o-mini (Base)': gpt4oMiniBase?.sqlQualityScore || 0,
        'GPT-4o-mini (Fine-tuned)': gpt4oMiniFinetuned?.sqlQualityScore || 0,
        fullMark: 100
      },
      {
        metric: 'Execution Accuracy',
        'GPT-3.5 Turbo (Base)': gptBase?.executionAccuracy || 0,
        'GPT-3.5 Turbo (Fine-tuned)': gptFinetuned?.executionAccuracy || 0,
        'GPT-4o-mini (Base)': gpt4oMiniBase?.executionAccuracy || 0,
        'GPT-4o-mini (Fine-tuned)': gpt4oMiniFinetuned?.executionAccuracy || 0,
        fullMark: 100
      },
      {
        metric: 'Math Accuracy',
        'GPT-3.5 Turbo (Base)': gptBase?.exactMathAccuracy || 0,
        'GPT-3.5 Turbo (Fine-tuned)': gptFinetuned?.exactMathAccuracy || 0,
        'GPT-4o-mini (Base)': gpt4oMiniBase?.exactMathAccuracy || 0,
        'GPT-4o-mini (Fine-tuned)': gpt4oMiniFinetuned?.exactMathAccuracy || 0,
        fullMark: 100
      },
      {
        metric: 'Efficiency',
        'GPT-3.5 Turbo (Base)': gptBase?.validEfficiencyScore || 0,
        'GPT-3.5 Turbo (Fine-tuned)': gptFinetuned?.validEfficiencyScore || 0,
        'GPT-4o-mini (Base)': gpt4oMiniBase?.validEfficiencyScore || 0,
        'GPT-4o-mini (Fine-tuned)': gpt4oMiniFinetuned?.validEfficiencyScore || 0,
        fullMark: 100
      },
      {
        metric: 'Complexity Handling',
        'GPT-3.5 Turbo (Base)': gptBase?.complexityHandling || 0,
        'GPT-3.5 Turbo (Fine-tuned)': gptFinetuned?.complexityHandling || 0,
        'GPT-4o-mini (Base)': gpt4oMiniBase?.complexityHandling || 0,
        'GPT-4o-mini (Fine-tuned)': gpt4oMiniFinetuned?.complexityHandling || 0,
        fullMark: 100
      },
      {
        metric: 'Zero-shot Performance',
        'GPT-3.5 Turbo (Base)': gptBase?.zeroShotPerformance || 0,
        'GPT-3.5 Turbo (Fine-tuned)': gptFinetuned?.zeroShotPerformance || 0,
        'GPT-4o-mini (Base)': gpt4oMiniBase?.zeroShotPerformance || 0,
        'GPT-4o-mini (Fine-tuned)': gpt4oMiniFinetuned?.zeroShotPerformance || 0,
        fullMark: 100
      },
      {
        metric: 'Response Speed',
        'GPT-3.5 Turbo (Base)': gptBase?.executionTime ? 100 - Math.min((gptBase.executionTime / 5000) * 100, 100) : 0,
        'GPT-3.5 Turbo (Fine-tuned)': gptFinetuned?.executionTime ? 100 - Math.min((gptFinetuned.executionTime / 5000) * 100, 100) : 0,
        'GPT-4o-mini (Base)': gpt4oMiniBase?.executionTime ? 100 - Math.min((gpt4oMiniBase.executionTime / 5000) * 100, 100) : 0,
        'GPT-4o-mini (Fine-tuned)': gpt4oMiniFinetuned?.executionTime ? 100 - Math.min((gpt4oMiniFinetuned.executionTime / 5000) * 100, 100) : 0,
        fullMark: 100
      },
      {
        metric: 'Generation Speed',
        'GPT-3.5 Turbo (Base)': normalizeSpeed(gptBase?.tokensPerSecond),
        'GPT-3.5 Turbo (Fine-tuned)': normalizeSpeed(gptFinetuned?.tokensPerSecond),
        'GPT-4o-mini (Base)': normalizeSpeed(gpt4oMiniBase?.tokensPerSecond),
        'GPT-4o-mini (Fine-tuned)': normalizeSpeed(gpt4oMiniFinetuned?.tokensPerSecond),
        fullMark: 100
      }
    ];
  };

  // Helper function to normalize speed values to 0-100 scale
  const normalizeSpeed = (tokensPerSec: number | undefined) => {
    if (!tokensPerSec) return 0;
    return Math.min(tokensPerSec * 5, 100); // 20 tokens/sec = 100%
  };

  // Format tooltip values
  const formatTooltipValue = (value: number, _props: any) => {
    return `${value.toFixed(2)}`;
  };

  // Function to get model data status icon
  const getModelStatusIcon = (isReal: boolean | undefined) => {
    if (isReal === undefined) return null;
    return isReal ? 
      '✓' : // Real data indicator
      '⚠️'; // Simulated data indicator
  };

  // Check if we have any data to display
  const hasData = gptBase || gptFinetuned || gpt4oMiniBase || gpt4oMiniFinetuned;

  if (!hasData) {
    return (
      <div className="model-comparison-container empty-state">
        <h3>Model Comparison</h3>
        <p>Submit a query to see model comparison metrics</p>
      </div>
    );
  }

  return (
    <div className="model-comparison-container">
      <h3>Model Comparison</h3>
      
      <div className="metrics-info-box">
        <div className="metrics-source-info">
          <div className="info-badge" style={{ 
            backgroundColor: getStatusColor() 
          }}>
            <span className="info-icon">ℹ️</span>
            <span>{getDataSourceStatus()}</span>
          </div>
        </div>
        <div className="metrics-calculation-info">
          <p>
            <strong>How metrics are calculated:</strong> All metrics are based on SQL quality assessment algorithms that analyze structure, 
            complexity, and adherence to best practices. Advanced metrics (Execution Accuracy, Math Accuracy, Efficiency) 
            measure different aspects of SQL quality.
          </p>
        </div>
      </div>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'execution' ? 'active' : ''}`}
          onClick={() => setActiveTab('execution')}
        >
          Response Time
        </button>
        <button 
          className={`tab ${activeTab === 'quality' ? 'active' : ''}`}
          onClick={() => setActiveTab('quality')}
        >
          SQL Quality
        </button>
        <button 
          className={`tab ${activeTab === 'length' ? 'active' : ''}`}
          onClick={() => setActiveTab('length')}
        >
          Response Length
        </button>
        <button 
          className={`tab ${activeTab === 'speed' ? 'active' : ''}`}
          onClick={() => setActiveTab('speed')}
        >
          Generation Rate
        </button>
        <button 
          className={`tab ${activeTab === 'radar' ? 'active' : ''}`}
          onClick={() => setActiveTab('radar')}
        >
          Overall
        </button>
      </div>

      <div className="chart-container">
        {activeTab === 'execution' && (
          <>
            <p className="metric-explanation">
              Total time from request initiation to response completion, including network latency and server processing time.
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={executionTimeData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={formatTooltipValue} />
                <Legend />
                <Bar dataKey="GPT-3.5 Turbo (Base)" fill="#8884d8" />
                <Bar dataKey="GPT-3.5 Turbo (Fine-tuned)" fill="#4834d8" />
                <Bar dataKey="GPT-4o-mini (Base)" fill="#82ca9d" />
                <Bar dataKey="GPT-4o-mini (Fine-tuned)" fill="#41a85f" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {activeTab === 'quality' && (
          <>
            <p className="metric-explanation">
              Assessment of SQL structure, correctness, best practices, and complexity. Higher scores indicate better quality SQL.
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={sqlQualityData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Score (0-100)', angle: -90, position: 'insideLeft' }} domain={[0, 100]} />
                <Tooltip formatter={formatTooltipValue} />
                <Legend />
                <Bar dataKey="GPT-3.5 Turbo (Base)" fill="#8884d8" />
                <Bar dataKey="GPT-3.5 Turbo (Fine-tuned)" fill="#4834d8" />
                <Bar dataKey="GPT-4o-mini (Base)" fill="#82ca9d" />
                <Bar dataKey="GPT-4o-mini (Fine-tuned)" fill="#41a85f" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {activeTab === 'length' && (
          <>
            <p className="metric-explanation">
              Total character count of the generated response. Shorter is not always better; context and completeness matter.
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={responseLengthData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Length (characters)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={formatTooltipValue} />
                <Legend />
                <Bar dataKey="GPT-3.5 Turbo (Base)" fill="#8884d8" />
                <Bar dataKey="GPT-3.5 Turbo (Fine-tuned)" fill="#4834d8" />
                <Bar dataKey="GPT-4o-mini (Base)" fill="#82ca9d" />
                <Bar dataKey="GPT-4o-mini (Fine-tuned)" fill="#41a85f" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {activeTab === 'speed' && (
          <>
            <p className="metric-explanation">
              Tokens generated per second, calculated as total tokens divided by response time. Influenced by network latency.
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={tokensPerSecondData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Tokens per second', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={formatTooltipValue} />
                <Legend />
                <Bar dataKey="GPT-3.5 Turbo (Base)" fill="#8884d8" />
                <Bar dataKey="GPT-3.5 Turbo (Fine-tuned)" fill="#4834d8" />
                <Bar dataKey="GPT-4o-mini (Base)" fill="#82ca9d" />
                <Bar dataKey="GPT-4o-mini (Fine-tuned)" fill="#41a85f" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {activeTab === 'radar' && (
          <>
            <p className="metric-explanation">
              Normalized comparison across all metrics (0-100 scale). Higher values indicate better performance in each category.
            </p>
            <div className="radar-chart-container">
              <ResponsiveContainer width="100%" height={450}>
                <RadarChart 
                  outerRadius={150} 
                  data={radarData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <PolarGrid gridType="polygon" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#333', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tickCount={6} />
                  <Radar 
                    name="GPT-3.5 Turbo (Base)" 
                    dataKey="GPT-3.5 Turbo (Base)" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.15} 
                    strokeWidth={2}
                  />
                  <Radar 
                    name="GPT-3.5 Turbo (Fine-tuned)" 
                    dataKey="GPT-3.5 Turbo (Fine-tuned)" 
                    stroke="#4834d8" 
                    fill="#4834d8" 
                    fillOpacity={0.25} 
                    strokeWidth={2}
                  />
                  <Radar 
                    name="GPT-4o-mini (Base)" 
                    dataKey="GPT-4o-mini (Base)" 
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                    fillOpacity={0.2} 
                    strokeWidth={2}
                  />
                  <Radar 
                    name="GPT-4o-mini (Fine-tuned)" 
                    dataKey="GPT-4o-mini (Fine-tuned)" 
                    stroke="#41a85f" 
                    fill="#41a85f" 
                    fillOpacity={0.3} 
                    strokeWidth={2}
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, '']}
                    labelFormatter={(label) => `${label} Performance`} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      <div className="comparison-summary">
        <h4>Performance Summary</h4>
        <div className="summary-metrics">
          <div className="summary-metric">
            <span className="metric-label">Fastest Response:</span>
            <span className="metric-value" title="Model with the shortest total response time">
              {[gptBase, gptFinetuned, gpt4oMiniBase, gpt4oMiniFinetuned]
                .filter(m => m?.executionTime)
                .sort((a, b) => (a!.executionTime || 0) - (b!.executionTime || 0))[0]?.model || 'N/A'}
              <span className="data-source-indicator">
                {(() => {
                  const fastestModel = [gptBase, gptFinetuned, gpt4oMiniBase, gpt4oMiniFinetuned]
                    .filter(m => m?.executionTime)
                    .sort((a, b) => (a!.executionTime || 0) - (b!.executionTime || 0))[0]?.model;
                    
                  if (fastestModel === MODEL_CONFIG.GPT_BASE.name) {
                    return isGpt35Real ? '✓' : '⚠️';
                  } else if (fastestModel === MODEL_CONFIG.GPT_FINETUNED.name) {
                    return isGpt35FtReal ? '✓' : '⚠️';
                  } else if (fastestModel === MODEL_CONFIG.GPT4O_MINI_BASE.name) {
                    return isGpt4oMiniReal ? '✓' : '⚠️';
                  } else if (fastestModel === MODEL_CONFIG.GPT4O_MINI_FINETUNED.name) {
                    return isGpt4oMiniFtReal ? '✓' : '⚠️';
                  }
                  return '';
                })()}
              </span>
            </span>
          </div>
          <div className="summary-metric">
            <span className="metric-label">Best SQL Quality:</span>
            <span className="metric-value" title="Fine-tuned model with the highest SQL quality score">
              {[gptFinetuned, gpt4oMiniFinetuned]
                .filter(m => m?.sqlQualityScore !== undefined)
                .sort((a, b) => (b!.sqlQualityScore || 0) - (a!.sqlQualityScore || 0))[0]?.model || 'N/A'}
              <span className="data-source-indicator">
                {(() => {
                  const bestQualityModel = [gptFinetuned, gpt4oMiniFinetuned]
                    .filter(m => m?.sqlQualityScore !== undefined)
                    .sort((a, b) => (b!.sqlQualityScore || 0) - (a!.sqlQualityScore || 0))[0]?.model;
                    
                  if (bestQualityModel === MODEL_CONFIG.GPT_FINETUNED.name) {
                    return isGpt35FtReal ? '✓' : '⚠️';
                  } else if (bestQualityModel === MODEL_CONFIG.GPT4O_MINI_FINETUNED.name) {
                    return isGpt4oMiniFtReal ? '✓' : '⚠️';
                  }
                  return '';
                })()}
              </span>
            </span>
          </div>
          <div className="summary-metric">
            <span className="metric-label">Highest Generation Rate:</span>
            <span className="metric-value" title="Fine-tuned model generating the most tokens per second">
              {[gptFinetuned, gpt4oMiniFinetuned]
                .filter(m => m?.tokensPerSecond)
                .sort((a, b) => (b!.tokensPerSecond || 0) - (a!.tokensPerSecond || 0))[0]?.model || 'N/A'}
              <span className="data-source-indicator">
                {(() => {
                  const fastestGenerationModel = [gptFinetuned, gpt4oMiniFinetuned]
                    .filter(m => m?.tokensPerSecond)
                    .sort((a, b) => (b!.tokensPerSecond || 0) - (a!.tokensPerSecond || 0))[0]?.model;
                    
                  if (fastestGenerationModel === MODEL_CONFIG.GPT_FINETUNED.name) {
                    return isGpt35FtReal ? '✓' : '⚠️';
                  } else if (fastestGenerationModel === MODEL_CONFIG.GPT4O_MINI_FINETUNED.name) {
                    return isGpt4oMiniFtReal ? '✓' : '⚠️';
                  }
                  return '';
                })()}
              </span>
            </span>
          </div>
          <div className="summary-metric">
            <span className="metric-label">Most Concise:</span>
            <span className="metric-value" title="Fine-tuned model with the shortest response">
              {[gptFinetuned, gpt4oMiniFinetuned]
                .filter(m => m?.responseLength)
                .sort((a, b) => (a!.responseLength || 0) - (b!.responseLength || 0))[0]?.model || 'N/A'}
              <span className="data-source-indicator">
                {(() => {
                  const mostConciseModel = [gptFinetuned, gpt4oMiniFinetuned]
                    .filter(m => m?.responseLength)
                    .sort((a, b) => (a!.responseLength || 0) - (b!.responseLength || 0))[0]?.model;
                    
                  if (mostConciseModel === MODEL_CONFIG.GPT_FINETUNED.name) {
                    return isGpt35FtReal ? '✓' : '⚠️';
                  } else if (mostConciseModel === MODEL_CONFIG.GPT4O_MINI_FINETUNED.name) {
                    return isGpt4oMiniFtReal ? '✓' : '⚠️';
                  }
                  return '';
                })()}
              </span>
            </span>
          </div>
        </div>
        
        {/* Advanced SQL Metrics Section */}
        <div className="advanced-metrics-section">
          <h4>Advanced SQL Metrics</h4>
          <div className="metrics-grid">
            {/* SQL-Specific Metrics */}
            <div className="metric-card">
              <h5>Execution Accuracy</h5>
              <div className="metric-values">
                <div className="model-metric">
                  <span className="model-name">GPT-3.5 Turbo (Base):</span>
                  <span className="metric-value">{gptBase?.executionAccuracy?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt35Real ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-3.5 Turbo (Fine-tuned):</span>
                  <span className="metric-value">{gptFinetuned?.executionAccuracy?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt35FtReal ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-4o-mini (Base):</span>
                  <span className="metric-value">{gpt4oMiniBase?.executionAccuracy?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt4oMiniReal ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-4o-mini (Fine-tuned):</span>
                  <span className="metric-value">{gpt4oMiniFinetuned?.executionAccuracy?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt4oMiniFtReal ? '✓' : '⚠️'}</span>
                </div>
              </div>
              <p className="metric-description">Percentage of generated SQL queries that produce the correct result when executed against the database.</p>
            </div>
            
            {/* <div className="metric-card">
              <h5>Exact Match Accuracy</h5>
              <div className="metric-values">
                <div className="model-metric">
                  <span className="model-name">GPT-3.5 Turbo (Base):</span>
                  <span className="metric-value">{gptBase?.exactMatchAccuracy?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt35Real ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-3.5 Turbo (Fine-tuned):</span>
                  <span className="metric-value">{gptFinetuned?.exactMatchAccuracy?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt35FtReal ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-4o-mini (Base):</span>
                  <span className="metric-value">{gpt4oMiniBase?.exactMatchAccuracy?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt4oMiniReal ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-4o-mini (Fine-tuned):</span>
                  <span className="metric-value">{gpt4oMiniFinetuned?.exactMatchAccuracy?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt4oMiniFtReal ? '✓' : '⚠️'}</span>
                </div>
              </div>
              <p className="metric-description">Percentage of generated queries that exactly match the reference queries.</p>
            </div>
            
            <div className="metric-card">
              <h5>Logical Form Accuracy</h5>
              <div className="metric-values">
                <div className="model-metric">
                  <span className="model-name">GPT-3.5 Turbo (Base):</span>
                  <span className="metric-value">{gptBase?.logicalFormAccuracy?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt35Real ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-3.5 Turbo (Fine-tuned):</span>
                  <span className="metric-value">{gptFinetuned?.logicalFormAccuracy?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt35FtReal ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-4o-mini (Base):</span>
                  <span className="metric-value">{gpt4oMiniBase?.logicalFormAccuracy?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt4oMiniReal ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-4o-mini (Fine-tuned):</span>
                  <span className="metric-value">{gpt4oMiniFinetuned?.logicalFormAccuracy?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt4oMiniFtReal ? '✓' : '⚠️'}</span>
                </div>
              </div>
              <p className="metric-description">Whether the generated queries are logically equivalent to the reference queries even if syntactically different.</p>
            </div> */}
            
            {/* General Performance Metrics */}
            <div className="metric-card">
              <h5>Inference Latency</h5>
              <div className="metric-values">
                <div className="model-metric">
                  <span className="model-name">GPT-3.5 Turbo (Base):</span>
                  <span className="metric-value">{gptBase?.inferenceLatency || gptBase?.executionTime || 'N/A'} ms</span>
                  <span className="data-source-indicator">{isGpt35Real ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-3.5 Turbo (Fine-tuned):</span>
                  <span className="metric-value">{gptFinetuned?.inferenceLatency || gptFinetuned?.executionTime || 'N/A'} ms</span>
                  <span className="data-source-indicator">{isGpt35FtReal ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-4o-mini (Base):</span>
                  <span className="metric-value">{gpt4oMiniBase?.inferenceLatency || gpt4oMiniBase?.executionTime || 'N/A'} ms</span>
                  <span className="data-source-indicator">{isGpt4oMiniReal ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-4o-mini (Fine-tuned):</span>
                  <span className="metric-value">{gpt4oMiniFinetuned?.inferenceLatency || gpt4oMiniFinetuned?.executionTime || 'N/A'} ms</span>
                  <span className="data-source-indicator">{isGpt4oMiniFtReal ? '✓' : '⚠️'}</span>
                </div>
              </div>
              <p className="metric-description">Time taken to generate SQL queries, including model processing time.</p>
            </div>
            
            <div className="metric-card">
              <h5>Complexity Handling</h5>
              <div className="metric-values">
                <div className="model-metric">
                  <span className="model-name">GPT-3.5 Turbo (Base):</span>
                  <span className="metric-value">{gptBase?.complexityHandling?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt35Real ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-3.5 Turbo (Fine-tuned):</span>
                  <span className="metric-value">{gptFinetuned?.complexityHandling?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt35FtReal ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-4o-mini (Base):</span>
                  <span className="metric-value">{gpt4oMiniBase?.complexityHandling?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt4oMiniReal ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-4o-mini (Fine-tuned):</span>
                  <span className="metric-value">{gpt4oMiniFinetuned?.complexityHandling?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt4oMiniFtReal ? '✓' : '⚠️'}</span>
                </div>
              </div>
              <p className="metric-description">Performance across different query complexity levels (simple, medium, complex).</p>
            </div>
            
            <div className="metric-card">
              <h5>Zero-shot Performance</h5>
              <div className="metric-values">
                <div className="model-metric">
                  <span className="model-name">GPT-3.5 Turbo (Base):</span>
                  <span className="metric-value">{gptBase?.zeroShotPerformance?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt35Real ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-3.5 Turbo (Fine-tuned):</span>
                  <span className="metric-value">{gptFinetuned?.zeroShotPerformance?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt35FtReal ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-4o-mini (Base):</span>
                  <span className="metric-value">{gpt4oMiniBase?.zeroShotPerformance?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt4oMiniReal ? '✓' : '⚠️'}</span>
                </div>
                <div className="model-metric">
                  <span className="model-name">GPT-4o-mini (Fine-tuned):</span>
                  <span className="metric-value">{gpt4oMiniFinetuned?.zeroShotPerformance?.toFixed(1) || 'N/A'}%</span>
                  <span className="data-source-indicator">{isGpt4oMiniFtReal ? '✓' : '⚠️'}</span>
                </div>
              </div>
              <p className="metric-description">How well the model generalizes to unseen database schemas.</p>
            </div>
          </div>
        </div>
        
        <p className="summary-note">
          <strong>Note:</strong> The Performance Summary section compares fine-tuned models only, except for "Fastest Response" which includes all models. Response times include network latency and server processing. Fine-tuned models may take longer but produce higher quality output.
        </p>
        <div className="data-source-legend">
          <div className="legend-item">
            <span className="legend-icon">✓</span>
            <span className="legend-text">Real API data</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon">⚠️</span>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelComparison; 