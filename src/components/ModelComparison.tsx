import { ModelResponse } from '../services/api';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import './ModelComparison.css';

const formatTooltipValue = (value: number, _name: string, _props: any) => {
  return `${value.toFixed(2)}`;
}; 