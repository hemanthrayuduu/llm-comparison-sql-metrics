# SQL Metrics Evaluator

A comprehensive tool for evaluating SQL generation models with real-time metrics.

## Features

### SQL-Specific Metrics

- **Execution Accuracy**: The percentage of generated SQL queries that produce the correct result when executed against the database
- **Exact Match Accuracy**: The percentage of generated queries that exactly match the reference queries
- **Logical Form Accuracy**: Whether the generated queries are logically equivalent to the reference queries even if syntactically different

### General Performance Metrics

- **Inference Latency**: Time taken to generate SQL queries
- **Complexity Handling**: Performance across different query complexity levels (simple, medium, complex)
- **Zero-shot Performance**: How well the model generalizes to unseen database schemas

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sql-metrics-evaluator.git
cd sql-metrics-evaluator

# Install dependencies
poetry install
```

## Usage

### As a Python Library

```python
from sql_metrics_evaluator import SQLMetricsEvaluator

evaluator = SQLMetricsEvaluator(
    db_connection_string="postgresql://user:password@localhost:5432/database"
)

# Evaluate a single query
metrics = evaluator.evaluate(
    generated_query="SELECT * FROM users WHERE age > 18",
    reference_query="SELECT * FROM users WHERE age > 18",
    query_complexity="simple"
)

print(metrics)
```

### As a REST API

```bash
# Start the API server
poetry run uvicorn sql_metrics_evaluator.api:app --reload
```

Then send requests to the API:

```bash
curl -X POST http://localhost:8000/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "generated_query": "SELECT * FROM users WHERE age > 18",
    "reference_query": "SELECT * FROM users WHERE age > 18",
    "query_complexity": "simple"
  }'
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```
DATABASE_URL=postgresql://user:password@localhost:5432/database
API_PORT=8000
LOG_LEVEL=INFO
```

## License

MIT 