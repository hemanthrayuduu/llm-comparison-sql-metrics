import { useState } from 'react';
import { ModelResponse } from '../services/api';
import ModelComparison from './ModelComparison';
import { 
  compareModels,
} from '../services/api';

const handleCompare = async () => {
  try {
    setIsLoading(true);
    const results = await compareModels(userQuery, selectedSchema);
    if (Array.isArray(results)) {
      // Handle array response
      setResponses(results);
    } else {
      // Handle object response
      setGptBaseResponse(results.gptBase);
      setGptFineTunedResponse(results.gptFinetuned);
      setGpt4oMiniBaseResponse(results.gpt4oMiniBase);
      setGpt4oMiniFineTunedResponse(results.gpt4oMiniFinetuned);
    }
  } catch (error) {
    console.error('Error comparing models:', error);
    setError(error instanceof Error ? error.message : 'An error occurred');
  } finally {
    setIsLoading(false);
  }
}; 