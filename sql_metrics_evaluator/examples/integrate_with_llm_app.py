"""Example script to integrate SQL metrics evaluator with the LLM comparison app."""

import json
import os
import sys
import time
from typing import Dict, Any, List

# Add parent directory to path to import the package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sql_metrics_evaluator.src.evaluator import SQLMetricsEvaluator
from sql_metrics_evaluator.src.models import QueryComplexity


def evaluate_model_responses(
    sample_queries: List[Dict[str, Any]], model_responses: Dict[str, Dict[str, Any]]
) -> Dict[str, Dict[str, Any]]:
    """Evaluate model responses against sample queries.

    Args:
        sample_queries: List of sample queries with expected SQL
        model_responses: Dictionary of model responses

    Returns:
        Dictionary of evaluation results by model
    """
    # Initialize evaluator (without database connection for this example)
    evaluator = SQLMetricsEvaluator()
    
    # Initialize results dictionary
    results = {}
    
    # Evaluate each model's responses
    for model_name, responses in model_responses.items():
        model_results = {
            "overall": {
                "exact_match_accuracy": 0.0,
                "logical_form_accuracy": 0.0,
                "complexity_handling": 0.0,
                "inference_latency": 0.0,
                "query_count": len(sample_queries)
            },
            "by_complexity": {
                "simple": {"count": 0, "exact_match": 0, "logical_form": 0},
                "medium": {"count": 0, "exact_match": 0, "logical_form": 0},
                "complex": {"count": 0, "exact_match": 0, "logical_form": 0}
            },
            "queries": []
        }
        
        total_exact_match = 0
        total_logical_form = 0
        total_complexity_handling = 0
        total_inference_latency = 0
        
        # Evaluate each query
        for query in sample_queries:
            query_id = query["id"]
            query_text = query["text"]
            expected_sql = query.get("expectedSql", "")
            complexity = query.get("complexity", "medium")
            
            # Skip if no expected SQL or no response for this query
            if not expected_sql or query_id not in responses:
                continue
            
            # Get model's response
            response = responses[query_id]
            generated_sql = response.get("response", "")
            inference_latency = response.get("executionTime", 0)
            
            # Evaluate the response
            metrics = evaluator.evaluate(
                generated_query=generated_sql,
                reference_query=expected_sql,
                query_complexity=complexity,
                inference_latency=inference_latency
            )
            
            # Update totals
            total_exact_match += metrics.exact_match_accuracy
            total_logical_form += metrics.logical_form_accuracy
            total_complexity_handling += metrics.complexity_handling
            total_inference_latency += inference_latency
            
            # Update complexity-specific results
            complexity_key = complexity.lower() if isinstance(complexity, str) else complexity.value
            model_results["by_complexity"][complexity_key]["count"] += 1
            model_results["by_complexity"][complexity_key]["exact_match"] += metrics.exact_match_accuracy
            model_results["by_complexity"][complexity_key]["logical_form"] += metrics.logical_form_accuracy
            
            # Add query-specific results
            model_results["queries"].append({
                "id": query_id,
                "text": query_text,
                "expected_sql": expected_sql,
                "generated_sql": generated_sql,
                "metrics": {
                    "exact_match_accuracy": metrics.exact_match_accuracy,
                    "logical_form_accuracy": metrics.logical_form_accuracy,
                    "complexity_handling": metrics.complexity_handling,
                    "inference_latency": inference_latency
                }
            })
        
        # Calculate averages for overall results
        query_count = len(model_results["queries"])
        if query_count > 0:
            model_results["overall"]["exact_match_accuracy"] = total_exact_match / query_count
            model_results["overall"]["logical_form_accuracy"] = total_logical_form / query_count
            model_results["overall"]["complexity_handling"] = total_complexity_handling / query_count
            model_results["overall"]["inference_latency"] = total_inference_latency / query_count
        
        # Calculate averages for complexity-specific results
        for complexity in model_results["by_complexity"]:
            count = model_results["by_complexity"][complexity]["count"]
            if count > 0:
                model_results["by_complexity"][complexity]["exact_match"] /= count
                model_results["by_complexity"][complexity]["logical_form"] /= count
        
        # Add to results
        results[model_name] = model_results
    
    return results


def main() -> None:
    """Run the example."""
    # Sample queries from the LLM comparison app
    sample_queries = [
        {
            "id": "1",
            "text": "Find all customers who made purchases in the last 30 days",
            "expectedSql": "SELECT * FROM customers WHERE purchase_date >= CURRENT_DATE - INTERVAL 30 DAY;",
            "complexity": "simple"
        },
        {
            "id": "2",
            "text": "Show me the top 5 products by sales volume",
            "expectedSql": "SELECT products.name, SUM(order_items.quantity) as total_sold FROM products JOIN order_items ON products.id = order_items.product_id GROUP BY products.id ORDER BY total_sold DESC LIMIT 5;",
            "complexity": "medium"
        },
        {
            "id": "3",
            "text": "List all employees who have been with the company for more than 5 years and their departments",
            "expectedSql": "SELECT employees.name, departments.name as department, employees.hire_date FROM employees JOIN departments ON employees.department_id = departments.id WHERE employees.hire_date <= CURRENT_DATE - INTERVAL 5 YEAR;",
            "complexity": "medium"
        },
        {
            "id": "4",
            "text": "What is the average order value by customer segment?",
            "expectedSql": "SELECT customer_segments.name, AVG(orders.total_amount) as avg_order_value FROM orders JOIN customers ON orders.customer_id = customers.id JOIN customer_segments ON customers.segment_id = customer_segments.id GROUP BY customer_segments.id;",
            "complexity": "complex"
        },
        {
            "id": "5",
            "text": "Find products that have never been ordered",
            "expectedSql": "SELECT products.* FROM products LEFT JOIN order_items ON products.id = order_items.product_id WHERE order_items.id IS NULL;",
            "complexity": "medium"
        }
    ]
    
    # Sample model responses (simulated)
    model_responses = {
        "GPT-3.5 Turbo (Base)": {
            "1": {
                "response": "SELECT * FROM customers WHERE purchase_date >= CURRENT_DATE - INTERVAL 30 DAY;",
                "executionTime": 250
            },
            "2": {
                "response": "SELECT p.name, SUM(oi.quantity) as total_sold FROM products p JOIN order_items oi ON p.id = oi.product_id GROUP BY p.id, p.name ORDER BY total_sold DESC LIMIT 5;",
                "executionTime": 320
            },
            "3": {
                "response": "SELECT e.name, d.name as department, e.hire_date FROM employees e JOIN departments d ON e.department_id = d.id WHERE e.hire_date <= CURRENT_DATE - INTERVAL '5 years';",
                "executionTime": 380
            },
            "4": {
                "response": "SELECT cs.name, AVG(o.total_amount) as avg_order_value FROM customer_segments cs JOIN customers c ON cs.id = c.segment_id JOIN orders o ON c.id = o.customer_id GROUP BY cs.name;",
                "executionTime": 420
            },
            "5": {
                "response": "SELECT p.* FROM products p WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id);",
                "executionTime": 300
            }
        },
        "GPT-3.5 Turbo (Fine-tuned)": {
            "1": {
                "response": "SELECT * FROM customers WHERE purchase_date >= CURRENT_DATE - INTERVAL 30 DAY;",
                "executionTime": 180
            },
            "2": {
                "response": "SELECT products.name, SUM(order_items.quantity) as total_sold FROM products JOIN order_items ON products.id = order_items.product_id GROUP BY products.id ORDER BY total_sold DESC LIMIT 5;",
                "executionTime": 210
            },
            "3": {
                "response": "SELECT employees.name, departments.name as department, employees.hire_date FROM employees JOIN departments ON employees.department_id = departments.id WHERE employees.hire_date <= CURRENT_DATE - INTERVAL 5 YEAR;",
                "executionTime": 240
            },
            "4": {
                "response": "SELECT customer_segments.name, AVG(orders.total_amount) as avg_order_value FROM orders JOIN customers ON orders.customer_id = customers.id JOIN customer_segments ON customers.segment_id = customer_segments.id GROUP BY customer_segments.id;",
                "executionTime": 270
            },
            "5": {
                "response": "SELECT products.* FROM products LEFT JOIN order_items ON products.id = order_items.product_id WHERE order_items.id IS NULL;",
                "executionTime": 200
            }
        }
    }
    
    # Evaluate model responses
    results = evaluate_model_responses(sample_queries, model_responses)
    
    # Print results
    print(json.dumps(results, indent=2))
    
    # Print summary
    print("\nSummary:")
    print("-" * 80)
    print(f"{'Model':<30} {'Exact Match':<15} {'Logical Form':<15} {'Complexity':<15} {'Latency (ms)'}")
    print("-" * 80)
    
    for model_name, model_results in results.items():
        exact_match = model_results["overall"]["exact_match_accuracy"] * 100
        logical_form = model_results["overall"]["logical_form_accuracy"] * 100
        complexity = model_results["overall"]["complexity_handling"] * 100
        latency = model_results["overall"]["inference_latency"]
        
        print(f"{model_name:<30} {exact_match:<15.2f} {logical_form:<15.2f} {complexity:<15.2f} {latency:<15.2f}")


if __name__ == "__main__":
    main() 