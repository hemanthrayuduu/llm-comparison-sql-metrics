"""REST API for SQL metrics evaluation."""

import logging
import os
import time
from typing import Dict, List, Optional, Union

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from sql_metrics_evaluator.src.evaluator import SQLMetricsEvaluator
from sql_metrics_evaluator.src.models import (
    EvaluationRequest,
    EvaluationResponse,
    QueryComplexity,
    SQLMetrics,
)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SQL Metrics Evaluator API",
    description="API for evaluating SQL generation models with real-time metrics",
    version="0.1.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize evaluator
db_connection_string = os.getenv("DATABASE_URL")
evaluator = SQLMetricsEvaluator(
    db_connection_string=db_connection_string,
    execution_timeout=int(os.getenv("EXECUTION_TIMEOUT", "5000")),
)


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str = Field(..., description="Service status")
    database_connected: bool = Field(..., description="Database connection status")
    version: str = Field(..., description="API version")


class BatchEvaluationRequest(BaseModel):
    """Batch evaluation request model."""

    requests: List[EvaluationRequest] = Field(..., description="List of evaluation requests")


class BatchEvaluationResponse(BaseModel):
    """Batch evaluation response model."""

    responses: List[EvaluationResponse] = Field(..., description="List of evaluation responses")
    total_time: float = Field(..., description="Total time taken for batch evaluation in milliseconds")


@app.get("/health", response_model=HealthResponse)
async def health_check() -> Dict[str, Union[str, bool]]:
    """Health check endpoint.

    Returns:
        Health status information
    """
    return {
        "status": "ok",
        "database_connected": evaluator.db_executor is not None,
        "version": "0.1.0",
    }


@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate(request: EvaluationRequest) -> Dict[str, Union[SQLMetrics, str, float]]:
    """Evaluate a SQL query.

    Args:
        request: Evaluation request

    Returns:
        Evaluation response
    """
    start_time = time.time()
    
    try:
        metrics = evaluator.evaluate(
            generated_query=request.generated_query,
            reference_query=request.reference_query,
            query_complexity=request.query_complexity,
            database_schema=request.database_schema,
            execution_timeout=request.execution_timeout,
        )
        
        evaluation_time = (time.time() - start_time) * 1000
        
        return {
            "metrics": metrics,
            "generated_query": request.generated_query,
            "reference_query": request.reference_query,
            "query_complexity": request.query_complexity,
            "evaluation_time": evaluation_time,
        }
    except Exception as e:
        logger.error(f"Error evaluating query: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error evaluating query: {str(e)}")


@app.post("/evaluate/batch", response_model=BatchEvaluationResponse)
async def evaluate_batch(request: BatchEvaluationRequest) -> Dict[str, Union[List[EvaluationResponse], float]]:
    """Evaluate a batch of SQL queries.

    Args:
        request: Batch evaluation request

    Returns:
        Batch evaluation response
    """
    start_time = time.time()
    
    try:
        responses = evaluator.evaluate_batch(request.requests)
        total_time = (time.time() - start_time) * 1000
        
        return {
            "responses": responses,
            "total_time": total_time,
        }
    except Exception as e:
        logger.error(f"Error evaluating batch: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error evaluating batch: {str(e)}")


@app.get("/complexity-levels", response_model=List[str])
async def get_complexity_levels() -> List[str]:
    """Get available complexity levels.

    Returns:
        List of complexity levels
    """
    return [level.value for level in QueryComplexity]


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("API_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port) 