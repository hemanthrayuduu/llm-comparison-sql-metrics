"""Tests for the SQL metrics evaluator."""

import unittest
from typing import Dict, Any

from sql_metrics_evaluator.src.evaluator import SQLMetricsEvaluator
from sql_metrics_evaluator.src.models import QueryComplexity


class TestSQLMetricsEvaluator(unittest.TestCase):
    """Test cases for the SQL metrics evaluator."""

    def setUp(self) -> None:
        """Set up test fixtures."""
        # Initialize evaluator without database connection for static analysis only
        self.evaluator = SQLMetricsEvaluator()
        
        # Sample queries for testing
        self.simple_reference = "SELECT name FROM users WHERE age > 18"
        self.simple_exact_match = "SELECT name FROM users WHERE age > 18"
        self.simple_logical_equivalent = "SELECT name FROM users WHERE age > 18 ORDER BY name"
        self.simple_incorrect = "SELECT email FROM users WHERE age > 21"
        
        self.complex_reference = """
        SELECT 
            c.name AS customer_name,
            SUM(o.total_amount) AS total_spent,
            COUNT(o.id) AS order_count,
            AVG(o.total_amount) AS avg_order_value
        FROM 
            customers c
        JOIN 
            orders o ON c.id = o.customer_id
        WHERE 
            o.order_date >= CURRENT_DATE - INTERVAL '1 year'
        GROUP BY 
            c.id, c.name
        HAVING 
            SUM(o.total_amount) > 1000
        ORDER BY 
            total_spent DESC
        LIMIT 10
        """
        
        self.complex_logical_equivalent = """
        SELECT 
            customers.name AS customer_name,
            SUM(orders.total_amount) AS total_spent,
            COUNT(orders.id) AS order_count,
            AVG(orders.total_amount) AS avg_order_value
        FROM 
            customers
        JOIN 
            orders ON customers.id = orders.customer_id
        WHERE 
            orders.order_date >= CURRENT_DATE - INTERVAL '1 year'
        GROUP BY 
            customers.id, customers.name
        HAVING 
            SUM(orders.total_amount) > 1000
        ORDER BY 
            total_spent DESC
        LIMIT 10
        """
        
        self.complex_incorrect = """
        SELECT 
            c.name AS customer_name,
            SUM(o.total_amount) AS total_spent
        FROM 
            customers c
        JOIN 
            orders o ON c.id = o.customer_id
        WHERE 
            o.order_date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY 
            c.id, c.name
        ORDER BY 
            total_spent DESC
        LIMIT 5
        """

    def test_exact_match_accuracy(self) -> None:
        """Test exact match accuracy calculation."""
        # Test exact match
        metrics = self.evaluator.evaluate(
            generated_query=self.simple_exact_match,
            reference_query=self.simple_reference,
            query_complexity=QueryComplexity.SIMPLE
        )
        self.assertEqual(metrics.exact_match_accuracy, 1.0)
        
        # Test non-exact match
        metrics = self.evaluator.evaluate(
            generated_query=self.simple_logical_equivalent,
            reference_query=self.simple_reference,
            query_complexity=QueryComplexity.SIMPLE
        )
        self.assertEqual(metrics.exact_match_accuracy, 0.0)

    def test_logical_form_accuracy(self) -> None:
        """Test logical form accuracy calculation."""
        # Test logical equivalence with different formatting
        metrics = self.evaluator.evaluate(
            generated_query=self.complex_logical_equivalent,
            reference_query=self.complex_reference,
            query_complexity=QueryComplexity.COMPLEX
        )
        self.assertEqual(metrics.logical_form_accuracy, 1.0)
        
        # Test non-equivalent queries
        metrics = self.evaluator.evaluate(
            generated_query=self.complex_incorrect,
            reference_query=self.complex_reference,
            query_complexity=QueryComplexity.COMPLEX
        )
        self.assertEqual(metrics.logical_form_accuracy, 0.0)

    def test_complexity_handling(self) -> None:
        """Test complexity handling calculation."""
        # Test simple query
        metrics_simple = self.evaluator.evaluate(
            generated_query=self.simple_exact_match,
            reference_query=self.simple_reference,
            query_complexity=QueryComplexity.SIMPLE
        )
        
        # Test complex query
        metrics_complex = self.evaluator.evaluate(
            generated_query=self.complex_logical_equivalent,
            reference_query=self.complex_reference,
            query_complexity=QueryComplexity.COMPLEX
        )
        
        # Both should have high complexity handling scores
        self.assertGreaterEqual(metrics_simple.complexity_handling, 0.8)
        self.assertGreaterEqual(metrics_complex.complexity_handling, 0.8)
        
        # Test incorrect complex query
        metrics_incorrect = self.evaluator.evaluate(
            generated_query=self.complex_incorrect,
            reference_query=self.complex_reference,
            query_complexity=QueryComplexity.COMPLEX
        )
        
        # Should have lower complexity handling score
        self.assertLess(metrics_incorrect.complexity_handling, 0.8)

    def test_zero_shot_performance(self) -> None:
        """Test zero-shot performance calculation."""
        # Simple schema description
        schema = """
        Table: customers
        Columns: id (int), name (varchar), email (varchar), age (int)
        
        Table: orders
        Columns: id (int), customer_id (int), order_date (date), total_amount (decimal)
        
        Foreign Keys:
        orders.customer_id -> customers.id
        """
        
        # Test with correct query
        metrics = self.evaluator.evaluate(
            generated_query=self.complex_logical_equivalent,
            reference_query=self.complex_reference,
            query_complexity=QueryComplexity.COMPLEX,
            database_schema=schema
        )
        
        # Should have high zero-shot performance
        self.assertIsNotNone(metrics.zero_shot_performance)
        if metrics.zero_shot_performance is not None:
            self.assertGreaterEqual(metrics.zero_shot_performance, 0.8)
        
        # Test with incorrect query
        metrics = self.evaluator.evaluate(
            generated_query=self.complex_incorrect,
            reference_query=self.complex_reference,
            query_complexity=QueryComplexity.COMPLEX,
            database_schema=schema
        )
        
        # Should have lower zero-shot performance
        self.assertIsNotNone(metrics.zero_shot_performance)
        if metrics.zero_shot_performance is not None:
            self.assertLess(metrics.zero_shot_performance, 0.8)


if __name__ == "__main__":
    unittest.main() 