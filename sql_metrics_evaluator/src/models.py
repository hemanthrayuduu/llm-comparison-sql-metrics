"""Data models for SQL metrics evaluation."""

from enum import Enum
from typing import Dict, List, Optional, Union

from pydantic import BaseModel, Field


class QueryComplexity(str, Enum):
    """Enum for query complexity levels."""

    SIMPLE = "simple"
    MEDIUM = "medium"
    COMPLEX = "complex"


class SQLMetrics(BaseModel):
    """Model for SQL evaluation metrics."""

    # SQL-Specific Metrics
    execution_accuracy: float = Field(
        default=0.0,
        description="Percentage of generated SQL queries that produce the correct result when executed",
        ge=0.0,
        le=1.0,
    )
    exact_match_accuracy: float = Field(
        default=0.0,
        description="Percentage of generated queries that exactly match the reference queries",
        ge=0.0,
        le=1.0,
    )
    logical_form_accuracy: float = Field(
        default=0.0,
        description="Whether the generated queries are logically equivalent to the reference queries",
        ge=0.0,
        le=1.0,
    )

    # General Performance Metrics
    inference_latency: float = Field(
        default=0.0, description="Time taken to generate SQL queries in milliseconds", ge=0.0
    )
    complexity_handling: float = Field(
        default=0.0,
        description="Performance across different query complexity levels",
        ge=0.0,
        le=1.0,
    )
    zero_shot_performance: Optional[float] = Field(
        default=None,
        description="How well the model generalizes to unseen database schemas",
        ge=0.0,
        le=1.0,
    )

    # Additional detailed metrics
    execution_details: Optional[Dict[str, Union[str, bool, List[str]]]] = Field(
        default=None, description="Details about query execution"
    )
    parsing_details: Optional[Dict[str, Union[str, bool, List[str]]]] = Field(
        default=None, description="Details about query parsing"
    )
    error_messages: Optional[List[str]] = Field(
        default=None, description="Error messages encountered during evaluation"
    )


class EvaluationRequest(BaseModel):
    """Model for evaluation request."""

    generated_query: str = Field(..., description="The SQL query generated by the model")
    reference_query: str = Field(..., description="The reference SQL query to compare against")
    query_complexity: QueryComplexity = Field(
        default=QueryComplexity.MEDIUM, description="Complexity level of the query"
    )
    database_schema: Optional[str] = Field(
        default=None, description="Database schema for zero-shot evaluation"
    )
    execution_timeout: Optional[int] = Field(
        default=5000, description="Timeout for query execution in milliseconds"
    )


class EvaluationResponse(BaseModel):
    """Model for evaluation response."""

    metrics: SQLMetrics = Field(..., description="Evaluation metrics")
    generated_query: str = Field(..., description="The SQL query that was evaluated")
    reference_query: str = Field(..., description="The reference SQL query")
    query_complexity: QueryComplexity = Field(..., description="Complexity level of the query")
    evaluation_time: float = Field(
        ..., description="Total time taken for evaluation in milliseconds"
    ) 