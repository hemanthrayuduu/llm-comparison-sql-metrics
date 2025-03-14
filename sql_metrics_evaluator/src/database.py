"""Database utilities for SQL metrics evaluation."""

import logging
import time
from contextlib import contextmanager
from typing import Any, Dict, Generator, List, Optional, Tuple, Union

import sqlalchemy
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError, TimeoutError

logger = logging.getLogger(__name__)


class DatabaseExecutor:
    """Class for executing SQL queries against a database."""

    def __init__(self, connection_string: str, timeout: int = 5000) -> None:
        """Initialize the database executor.

        Args:
            connection_string: Database connection string
            timeout: Query execution timeout in milliseconds
        """
        self.connection_string = connection_string
        self.timeout_ms = timeout
        self.engine: Optional[Engine] = None
        self._initialize_engine()

    def _initialize_engine(self) -> None:
        """Initialize the SQLAlchemy engine."""
        try:
            # Convert timeout from ms to seconds for SQLAlchemy
            timeout_sec = self.timeout_ms / 1000
            self.engine = create_engine(
                self.connection_string,
                connect_args={"connect_timeout": int(timeout_sec)},
                pool_pre_ping=True,
            )
            logger.info("Database engine initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database engine: {str(e)}")
            self.engine = None
            raise

    @contextmanager
    def get_connection(self) -> Generator[sqlalchemy.Connection, None, None]:
        """Get a database connection.

        Yields:
            A SQLAlchemy connection

        Raises:
            RuntimeError: If the engine is not initialized
        """
        if not self.engine:
            raise RuntimeError("Database engine not initialized")

        connection = self.engine.connect()
        try:
            yield connection
        finally:
            connection.close()

    def execute_query(
        self, query: str, params: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, Union[List[Dict[str, Any]], str], float]:
        """Execute a SQL query and return the results.

        Args:
            query: SQL query to execute
            params: Query parameters

        Returns:
            Tuple containing:
                - Success flag (True if query executed successfully)
                - Results (list of dictionaries) or error message
                - Execution time in milliseconds
        """
        if not self.engine:
            return False, "Database engine not initialized", 0.0

        start_time = time.time()
        try:
            with self.get_connection() as conn:
                # Set statement timeout (PostgreSQL specific)
                conn.execute(text(f"SET statement_timeout TO {self.timeout_ms}"))
                
                # Execute the query
                result = conn.execute(text(query), params or {})
                
                # Fetch all results
                rows = [dict(row._mapping) for row in result.fetchall()]
                
                execution_time_ms = (time.time() - start_time) * 1000
                return True, rows, execution_time_ms
        except TimeoutError:
            execution_time_ms = (time.time() - start_time) * 1000
            return False, f"Query execution timed out after {self.timeout_ms}ms", execution_time_ms
        except SQLAlchemyError as e:
            execution_time_ms = (time.time() - start_time) * 1000
            return False, f"SQL error: {str(e)}", execution_time_ms
        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            return False, f"Unexpected error: {str(e)}", execution_time_ms

    def get_schema_info(self) -> Dict[str, Any]:
        """Get database schema information.

        Returns:
            Dictionary containing schema information
        """
        if not self.engine:
            return {"error": "Database engine not initialized"}

        schema_info = {
            "tables": [],
            "views": [],
            "error": None
        }

        try:
            with self.get_connection() as conn:
                # Get tables
                tables_query = """
                SELECT 
                    table_name, 
                    table_schema
                FROM 
                    information_schema.tables 
                WHERE 
                    table_schema NOT IN ('pg_catalog', 'information_schema')
                    AND table_type = 'BASE TABLE'
                ORDER BY 
                    table_schema, table_name
                """
                tables_result = conn.execute(text(tables_query))
                tables = [dict(row._mapping) for row in tables_result.fetchall()]
                
                # Get columns for each table
                for table in tables:
                    columns_query = """
                    SELECT 
                        column_name, 
                        data_type, 
                        is_nullable
                    FROM 
                        information_schema.columns
                    WHERE 
                        table_schema = :schema
                        AND table_name = :table
                    ORDER BY 
                        ordinal_position
                    """
                    columns_result = conn.execute(
                        text(columns_query),
                        {"schema": table["table_schema"], "table": table["table_name"]}
                    )
                    columns = [dict(row._mapping) for row in columns_result.fetchall()]
                    
                    table_info = {
                        "name": table["table_name"],
                        "schema": table["table_schema"],
                        "columns": columns
                    }
                    schema_info["tables"].append(table_info)
                
                # Get views
                views_query = """
                SELECT 
                    table_name, 
                    table_schema
                FROM 
                    information_schema.tables 
                WHERE 
                    table_schema NOT IN ('pg_catalog', 'information_schema')
                    AND table_type = 'VIEW'
                ORDER BY 
                    table_schema, table_name
                """
                views_result = conn.execute(text(views_query))
                views = [dict(row._mapping) for row in views_result.fetchall()]
                
                # Get columns for each view
                for view in views:
                    columns_query = """
                    SELECT 
                        column_name, 
                        data_type, 
                        is_nullable
                    FROM 
                        information_schema.columns
                    WHERE 
                        table_schema = :schema
                        AND table_name = :view
                    ORDER BY 
                        ordinal_position
                    """
                    columns_result = conn.execute(
                        text(columns_query),
                        {"schema": view["table_schema"], "view": view["table_name"]}
                    )
                    columns = [dict(row._mapping) for row in columns_result.fetchall()]
                    
                    view_info = {
                        "name": view["table_name"],
                        "schema": view["table_schema"],
                        "columns": columns
                    }
                    schema_info["views"].append(view_info)
                
                return schema_info
        except Exception as e:
            logger.error(f"Error getting schema info: {str(e)}")
            return {"error": str(e)}

    def compare_query_results(
        self, query1: str, query2: str
    ) -> Tuple[bool, Dict[str, Any]]:
        """Compare the results of two SQL queries.

        Args:
            query1: First SQL query
            query2: Second SQL query

        Returns:
            Tuple containing:
                - Boolean indicating if results match
                - Dictionary with comparison details
        """
        success1, result1, time1 = self.execute_query(query1)
        success2, result2, time2 = self.execute_query(query2)
        
        comparison = {
            "query1_success": success1,
            "query2_success": success2,
            "query1_time_ms": time1,
            "query2_time_ms": time2,
            "both_succeeded": success1 and success2,
            "result_match": False,
            "error": None
        }
        
        if not success1:
            comparison["error"] = f"Query 1 failed: {result1}"
            return False, comparison
        
        if not success2:
            comparison["error"] = f"Query 2 failed: {result2}"
            return False, comparison
        
        # If both queries succeeded, compare results
        try:
            # Check if results are lists (as expected)
            if not isinstance(result1, list) or not isinstance(result2, list):
                comparison["error"] = "One or both query results are not in the expected format"
                return False, comparison
            
            # Compare result sets (order-independent)
            if len(result1) != len(result2):
                comparison["result_match"] = False
                comparison["row_count_match"] = False
                comparison["row_count1"] = len(result1)
                comparison["row_count2"] = len(result2)
            else:
                # Sort results by converting to tuples of sorted items
                sorted_result1 = sorted([tuple(sorted(row.items())) for row in result1])
                sorted_result2 = sorted([tuple(sorted(row.items())) for row in result2])
                
                comparison["result_match"] = sorted_result1 == sorted_result2
                comparison["row_count_match"] = True
                comparison["row_count"] = len(result1)
            
            return comparison["result_match"], comparison
        except Exception as e:
            comparison["error"] = f"Error comparing results: {str(e)}"
            return False, comparison 