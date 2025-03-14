"""SQL parsing utilities for metrics evaluation."""

import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple, Union

import sqlglot
import sqlparse
from mo_sql_parsing import parse as mo_parse
from mo_sql_parsing import format as mo_format
from sqlglot import expressions as exp
from sqlglot.errors import ParseError

logger = logging.getLogger(__name__)


class SQLParser:
    """Class for parsing and analyzing SQL queries."""

    def __init__(self) -> None:
        """Initialize the SQL parser."""
        pass

    def normalize_query(self, query: str) -> str:
        """Normalize a SQL query by removing whitespace, comments, etc.

        Args:
            query: SQL query to normalize

        Returns:
            Normalized SQL query
        """
        if not query:
            return ""

        # Remove comments
        query = sqlparse.format(
            query,
            strip_comments=True,
            reindent=True,
            keyword_case="upper",
            identifier_case="lower",
            strip_whitespace=True,
        )

        # Normalize whitespace
        query = re.sub(r"\s+", " ", query).strip()

        return query

    def parse_query(self, query: str) -> Dict[str, Any]:
        """Parse a SQL query and extract its components.

        Args:
            query: SQL query to parse

        Returns:
            Dictionary containing parsed query components
        """
        result = {
            "success": False,
            "error": None,
            "tables": set(),
            "columns": set(),
            "joins": [],
            "where_conditions": [],
            "group_by": [],
            "order_by": [],
            "limit": None,
            "aggregations": set(),
            "query_type": None,
            "parsed_tree": None,
        }

        if not query:
            result["error"] = "Empty query"
            return result

        normalized_query = self.normalize_query(query)

        # Try parsing with sqlglot
        try:
            parsed = sqlglot.parse_one(normalized_query)
            result["parsed_tree"] = parsed
            result["success"] = True
            result["query_type"] = self._get_query_type(parsed)

            # Extract tables
            tables = self._extract_tables(parsed)
            result["tables"] = tables

            # Extract columns
            columns = self._extract_columns(parsed)
            result["columns"] = columns

            # Extract joins
            joins = self._extract_joins(parsed)
            result["joins"] = joins

            # Extract where conditions
            where_conditions = self._extract_where_conditions(parsed)
            result["where_conditions"] = where_conditions

            # Extract group by
            group_by = self._extract_group_by(parsed)
            result["group_by"] = group_by

            # Extract order by
            order_by = self._extract_order_by(parsed)
            result["order_by"] = order_by

            # Extract limit
            limit = self._extract_limit(parsed)
            result["limit"] = limit

            # Extract aggregations
            aggregations = self._extract_aggregations(parsed)
            result["aggregations"] = aggregations

        except ParseError as e:
            # If sqlglot fails, try mo_sql_parsing
            try:
                parsed = mo_parse(normalized_query)
                result["parsed_tree"] = parsed
                result["success"] = True
                result["query_type"] = self._get_query_type_mo(parsed)
                
                # Extract basic components using mo_sql_parsing
                self._extract_components_mo(parsed, result)
                
            except Exception as mo_e:
                result["error"] = f"Failed to parse query: {str(e)}. Mo_sql_parsing error: {str(mo_e)}"
        except Exception as e:
            result["error"] = f"Unexpected error parsing query: {str(e)}"

        return result

    def _get_query_type(self, parsed_tree: exp.Expression) -> str:
        """Get the type of SQL query from a sqlglot parsed tree.

        Args:
            parsed_tree: sqlglot parsed expression

        Returns:
            Query type (SELECT, INSERT, UPDATE, DELETE, etc.)
        """
        if isinstance(parsed_tree, exp.Select):
            return "SELECT"
        elif isinstance(parsed_tree, exp.Insert):
            return "INSERT"
        elif isinstance(parsed_tree, exp.Update):
            return "UPDATE"
        elif isinstance(parsed_tree, exp.Delete):
            return "DELETE"
        elif isinstance(parsed_tree, exp.Union):
            return "UNION"
        else:
            return "UNKNOWN"

    def _get_query_type_mo(self, parsed_tree: Dict[str, Any]) -> str:
        """Get the type of SQL query from a mo_sql_parsing parsed tree.

        Args:
            parsed_tree: mo_sql_parsing parsed dictionary

        Returns:
            Query type (SELECT, INSERT, UPDATE, DELETE, etc.)
        """
        if "select" in parsed_tree:
            return "SELECT"
        elif "insert" in parsed_tree:
            return "INSERT"
        elif "update" in parsed_tree:
            return "UPDATE"
        elif "delete" in parsed_tree:
            return "DELETE"
        elif "union" in parsed_tree or "union_all" in parsed_tree:
            return "UNION"
        else:
            return "UNKNOWN"

    def _extract_tables(self, parsed_tree: exp.Expression) -> Set[str]:
        """Extract table names from a sqlglot parsed tree.

        Args:
            parsed_tree: sqlglot parsed expression

        Returns:
            Set of table names
        """
        tables = set()
        
        if isinstance(parsed_tree, exp.Select):
            # Extract from tables
            if parsed_tree.args.get("from"):
                from_clause = parsed_tree.args["from"]
                if isinstance(from_clause, exp.From):
                    for expr in from_clause.expressions:
                        if isinstance(expr, exp.Table):
                            if expr.name:
                                tables.add(expr.name)
                        elif isinstance(expr, exp.Subquery):
                            # Recursively extract tables from subqueries
                            subquery_tables = self._extract_tables(expr.this)
                            tables.update(subquery_tables)
            
            # Extract join tables
            for join_type in ["join", "left_join", "right_join", "full_join"]:
                if parsed_tree.args.get(join_type):
                    join_clauses = parsed_tree.args[join_type]
                    for join_clause in join_clauses:
                        if isinstance(join_clause, exp.Join):
                            if isinstance(join_clause.this, exp.Table):
                                tables.add(join_clause.this.name)
                            elif isinstance(join_clause.this, exp.Subquery):
                                subquery_tables = self._extract_tables(join_clause.this.this)
                                tables.update(subquery_tables)
        
        return tables

    def _extract_columns(self, parsed_tree: exp.Expression) -> Set[str]:
        """Extract column names from a sqlglot parsed tree.

        Args:
            parsed_tree: sqlglot parsed expression

        Returns:
            Set of column names
        """
        columns = set()
        
        if isinstance(parsed_tree, exp.Select):
            # Extract columns from SELECT clause
            for expr in parsed_tree.expressions:
                if isinstance(expr, exp.Column):
                    columns.add(expr.name)
                elif isinstance(expr, exp.Alias) and isinstance(expr.this, exp.Column):
                    columns.add(expr.this.name)
            
            # Extract columns from WHERE clause
            if parsed_tree.args.get("where"):
                where_clause = parsed_tree.args["where"]
                self._extract_columns_from_expression(where_clause, columns)
            
            # Extract columns from GROUP BY clause
            if parsed_tree.args.get("group"):
                group_by = parsed_tree.args["group"]
                for expr in group_by:
                    if isinstance(expr, exp.Column):
                        columns.add(expr.name)
            
            # Extract columns from ORDER BY clause
            if parsed_tree.args.get("order"):
                order_by = parsed_tree.args["order"]
                for expr in order_by:
                    if isinstance(expr, exp.Order) and isinstance(expr.this, exp.Column):
                        columns.add(expr.this.name)
        
        return columns

    def _extract_columns_from_expression(self, expr: exp.Expression, columns: Set[str]) -> None:
        """Recursively extract column names from an expression.

        Args:
            expr: sqlglot expression
            columns: Set to add column names to
        """
        if isinstance(expr, exp.Column):
            columns.add(expr.name)
        elif hasattr(expr, "this") and expr.this is not None:
            self._extract_columns_from_expression(expr.this, columns)
        
        if hasattr(expr, "expressions"):
            for sub_expr in expr.expressions:
                self._extract_columns_from_expression(sub_expr, columns)

    def _extract_joins(self, parsed_tree: exp.Expression) -> List[Dict[str, Any]]:
        """Extract join information from a sqlglot parsed tree.

        Args:
            parsed_tree: sqlglot parsed expression

        Returns:
            List of join dictionaries
        """
        joins = []
        
        if isinstance(parsed_tree, exp.Select):
            for join_type in ["join", "left_join", "right_join", "full_join"]:
                if parsed_tree.args.get(join_type):
                    join_clauses = parsed_tree.args[join_type]
                    for join_clause in join_clauses:
                        if isinstance(join_clause, exp.Join):
                            join_info = {
                                "type": join_type.upper().replace("_", " "),
                                "table": None,
                                "condition": None
                            }
                            
                            if isinstance(join_clause.this, exp.Table):
                                join_info["table"] = join_clause.this.name
                            
                            if join_clause.args.get("on"):
                                on_clause = join_clause.args["on"]
                                join_info["condition"] = str(on_clause)
                            
                            joins.append(join_info)
        
        return joins

    def _extract_where_conditions(self, parsed_tree: exp.Expression) -> List[str]:
        """Extract where conditions from a sqlglot parsed tree.

        Args:
            parsed_tree: sqlglot parsed expression

        Returns:
            List of where condition strings
        """
        conditions = []
        
        if isinstance(parsed_tree, exp.Select) and parsed_tree.args.get("where"):
            where_clause = parsed_tree.args["where"]
            self._extract_conditions(where_clause, conditions)
        
        return conditions

    def _extract_conditions(self, expr: exp.Expression, conditions: List[str]) -> None:
        """Recursively extract conditions from an expression.

        Args:
            expr: sqlglot expression
            conditions: List to add condition strings to
        """
        if isinstance(expr, (exp.EQ, exp.GT, exp.GTE, exp.LT, exp.LTE, exp.NEQ, exp.Like, exp.In)):
            conditions.append(str(expr))
        elif isinstance(expr, (exp.And, exp.Or)):
            self._extract_conditions(expr.this, conditions)
            self._extract_conditions(expr.expression, conditions)

    def _extract_group_by(self, parsed_tree: exp.Expression) -> List[str]:
        """Extract group by columns from a sqlglot parsed tree.

        Args:
            parsed_tree: sqlglot parsed expression

        Returns:
            List of group by column strings
        """
        group_by = []
        
        if isinstance(parsed_tree, exp.Select) and parsed_tree.args.get("group"):
            group_clause = parsed_tree.args["group"]
            for expr in group_clause:
                group_by.append(str(expr))
        
        return group_by

    def _extract_order_by(self, parsed_tree: exp.Expression) -> List[Dict[str, Any]]:
        """Extract order by information from a sqlglot parsed tree.

        Args:
            parsed_tree: sqlglot parsed expression

        Returns:
            List of order by dictionaries
        """
        order_by = []
        
        if isinstance(parsed_tree, exp.Select) and parsed_tree.args.get("order"):
            order_clause = parsed_tree.args["order"]
            for expr in order_clause:
                if isinstance(expr, exp.Order):
                    order_info = {
                        "column": str(expr.this),
                        "direction": "DESC" if expr.args.get("desc") else "ASC"
                    }
                    order_by.append(order_info)
        
        return order_by

    def _extract_limit(self, parsed_tree: exp.Expression) -> Optional[int]:
        """Extract limit value from a sqlglot parsed tree.

        Args:
            parsed_tree: sqlglot parsed expression

        Returns:
            Limit value or None
        """
        if isinstance(parsed_tree, exp.Select) and parsed_tree.args.get("limit"):
            limit_clause = parsed_tree.args["limit"]
            if isinstance(limit_clause, exp.Limit) and isinstance(limit_clause.this, exp.Literal):
                try:
                    return int(limit_clause.this.this)
                except (ValueError, TypeError):
                    return None
        
        return None

    def _extract_aggregations(self, parsed_tree: exp.Expression) -> Set[str]:
        """Extract aggregation functions from a sqlglot parsed tree.

        Args:
            parsed_tree: sqlglot parsed expression

        Returns:
            Set of aggregation function strings
        """
        aggregations = set()
        
        if isinstance(parsed_tree, exp.Select):
            for expr in parsed_tree.expressions:
                self._extract_aggregations_from_expression(expr, aggregations)
        
        return aggregations

    def _extract_aggregations_from_expression(self, expr: exp.Expression, aggregations: Set[str]) -> None:
        """Recursively extract aggregation functions from an expression.

        Args:
            expr: sqlglot expression
            aggregations: Set to add aggregation function strings to
        """
        if isinstance(expr, (exp.Count, exp.Sum, exp.Avg, exp.Min, exp.Max)):
            aggregations.add(f"{expr.__class__.__name__.upper()}({str(expr.this)})")
        elif hasattr(expr, "this") and expr.this is not None:
            self._extract_aggregations_from_expression(expr.this, aggregations)
        
        if hasattr(expr, "expressions"):
            for sub_expr in expr.expressions:
                self._extract_aggregations_from_expression(sub_expr, aggregations)

    def _extract_components_mo(self, parsed_tree: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Extract components from a mo_sql_parsing parsed tree.

        Args:
            parsed_tree: mo_sql_parsing parsed dictionary
            result: Result dictionary to update
        """
        # Extract tables
        tables = set()
        if "from" in parsed_tree:
            from_clause = parsed_tree["from"]
            if isinstance(from_clause, dict):
                # Single table
                for table_name in from_clause.keys():
                    tables.add(table_name)
            elif isinstance(from_clause, list):
                # Multiple tables
                for item in from_clause:
                    if isinstance(item, dict):
                        for table_name in item.keys():
                            tables.add(table_name)
                    elif isinstance(item, str):
                        tables.add(item)
        result["tables"] = tables
        
        # Extract columns
        columns = set()
        if "select" in parsed_tree:
            select_clause = parsed_tree["select"]
            if isinstance(select_clause, dict):
                # Named columns
                for col_name in select_clause.keys():
                    if isinstance(col_name, str):
                        columns.add(col_name)
            elif isinstance(select_clause, list):
                # Multiple columns
                for item in select_clause:
                    if isinstance(item, dict):
                        for col_name in item.keys():
                            if isinstance(col_name, str):
                                columns.add(col_name)
                    elif isinstance(item, str):
                        columns.add(item)
        result["columns"] = columns
        
        # Extract where conditions
        where_conditions = []
        if "where" in parsed_tree:
            where_clause = parsed_tree["where"]
            if isinstance(where_clause, dict):
                for op, value in where_clause.items():
                    where_conditions.append(f"{op}: {value}")
        result["where_conditions"] = where_conditions
        
        # Extract group by
        group_by = []
        if "groupby" in parsed_tree:
            groupby_clause = parsed_tree["groupby"]
            if isinstance(groupby_clause, list):
                group_by = groupby_clause
            elif isinstance(groupby_clause, str):
                group_by = [groupby_clause]
        result["group_by"] = group_by
        
        # Extract order by
        order_by = []
        if "orderby" in parsed_tree:
            orderby_clause = parsed_tree["orderby"]
            if isinstance(orderby_clause, list):
                for item in orderby_clause:
                    if isinstance(item, dict):
                        for col, direction in item.items():
                            order_by.append({"column": col, "direction": direction})
                    elif isinstance(item, str):
                        order_by.append({"column": item, "direction": "ASC"})
            elif isinstance(orderby_clause, dict):
                for col, direction in orderby_clause.items():
                    order_by.append({"column": col, "direction": direction})
            elif isinstance(orderby_clause, str):
                order_by.append({"column": orderby_clause, "direction": "ASC"})
        result["order_by"] = order_by
        
        # Extract limit
        if "limit" in parsed_tree:
            try:
                result["limit"] = int(parsed_tree["limit"])
            except (ValueError, TypeError):
                result["limit"] = None

    def compare_queries(self, query1: str, query2: str) -> Dict[str, Any]:
        """Compare two SQL queries for logical equivalence.

        Args:
            query1: First SQL query
            query2: Second SQL query

        Returns:
            Dictionary with comparison results
        """
        result = {
            "exact_match": False,
            "logical_equivalence": False,
            "table_match": False,
            "column_match": False,
            "join_match": False,
            "where_match": False,
            "group_by_match": False,
            "order_by_match": False,
            "limit_match": False,
            "aggregation_match": False,
            "error": None
        }
        
        # Normalize queries
        normalized_query1 = self.normalize_query(query1)
        normalized_query2 = self.normalize_query(query2)
        
        # Check for exact match after normalization
        if normalized_query1 == normalized_query2:
            result["exact_match"] = True
            result["logical_equivalence"] = True
            # Set all other matches to True
            for key in result:
                if key not in ["exact_match", "logical_equivalence", "error"]:
                    result[key] = True
            return result
        
        # Parse queries
        parsed1 = self.parse_query(query1)
        parsed2 = self.parse_query(query2)
        
        # Check for parsing errors
        if not parsed1["success"]:
            result["error"] = f"Error parsing first query: {parsed1['error']}"
            return result
        
        if not parsed2["success"]:
            result["error"] = f"Error parsing second query: {parsed2['error']}"
            return result
        
        # Compare query types
        if parsed1["query_type"] != parsed2["query_type"]:
            result["error"] = f"Query types don't match: {parsed1['query_type']} vs {parsed2['query_type']}"
            return result
        
        # Compare tables
        result["table_match"] = parsed1["tables"] == parsed2["tables"]
        
        # Compare columns
        result["column_match"] = parsed1["columns"] == parsed2["columns"]
        
        # Compare joins
        # For joins, we need to compare the structure rather than just the string representation
        join_match = True
        if len(parsed1["joins"]) != len(parsed2["joins"]):
            join_match = False
        else:
            # Create sets of join tables for each join type
            joins1_by_type = {}
            joins2_by_type = {}
            
            for join in parsed1["joins"]:
                join_type = join["type"]
                if join_type not in joins1_by_type:
                    joins1_by_type[join_type] = set()
                joins1_by_type[join_type].add(join["table"])
            
            for join in parsed2["joins"]:
                join_type = join["type"]
                if join_type not in joins2_by_type:
                    joins2_by_type[join_type] = set()
                joins2_by_type[join_type].add(join["table"])
            
            # Compare join types and tables
            if joins1_by_type.keys() != joins2_by_type.keys():
                join_match = False
            else:
                for join_type in joins1_by_type:
                    if joins1_by_type[join_type] != joins2_by_type[join_type]:
                        join_match = False
                        break
        
        result["join_match"] = join_match
        
        # Compare where conditions
        # This is a simplified comparison that doesn't account for logical equivalence of different expressions
        where_match = True
        if len(parsed1["where_conditions"]) != len(parsed2["where_conditions"]):
            where_match = False
        else:
            # Convert to sets for order-independent comparison
            where_set1 = set(parsed1["where_conditions"])
            where_set2 = set(parsed2["where_conditions"])
            where_match = where_set1 == where_set2
        
        result["where_match"] = where_match
        
        # Compare group by
        group_by_match = True
        if len(parsed1["group_by"]) != len(parsed2["group_by"]):
            group_by_match = False
        else:
            # Convert to sets for order-independent comparison
            group_by_set1 = set(parsed1["group_by"])
            group_by_set2 = set(parsed2["group_by"])
            group_by_match = group_by_set1 == group_by_set2
        
        result["group_by_match"] = group_by_match
        
        # Compare order by
        # For order by, we need to compare both columns and directions
        order_by_match = True
        if len(parsed1["order_by"]) != len(parsed2["order_by"]):
            order_by_match = False
        else:
            # Convert to sets of tuples for comparison
            order_by_set1 = {(item["column"], item["direction"]) for item in parsed1["order_by"]}
            order_by_set2 = {(item["column"], item["direction"]) for item in parsed2["order_by"]}
            order_by_match = order_by_set1 == order_by_set2
        
        result["order_by_match"] = order_by_match
        
        # Compare limit
        result["limit_match"] = parsed1["limit"] == parsed2["limit"]
        
        # Compare aggregations
        result["aggregation_match"] = parsed1["aggregations"] == parsed2["aggregations"]
        
        # Determine logical equivalence
        # This is a simplified approach - true logical equivalence would require query execution
        # We consider queries logically equivalent if they have the same tables, columns, joins, where conditions,
        # group by, and aggregations. Order by and limit don't affect logical equivalence.
        result["logical_equivalence"] = (
            result["table_match"] and
            result["column_match"] and
            result["join_match"] and
            result["where_match"] and
            result["group_by_match"] and
            result["aggregation_match"]
        )
        
        return result

    def try_logical_equivalence_with_execution(
        self, query1: str, query2: str, executor: Any
    ) -> Tuple[bool, Dict[str, Any]]:
        """Try to determine logical equivalence by executing both queries.

        Args:
            query1: First SQL query
            query2: Second SQL query
            executor: DatabaseExecutor instance

        Returns:
            Tuple containing:
                - Boolean indicating logical equivalence
                - Dictionary with comparison details
        """
        # First check static analysis
        static_comparison = self.compare_queries(query1, query2)
        
        # If static analysis shows exact match, we're done
        if static_comparison["exact_match"]:
            return True, static_comparison
        
        # If we have a database executor, try executing both queries
        if executor:
            execution_comparison = executor.compare_query_results(query1, query2)
            
            # Update the static comparison with execution results
            static_comparison["execution_comparison"] = execution_comparison[1]
            
            # If execution results match, queries are logically equivalent
            if execution_comparison[0]:
                static_comparison["logical_equivalence"] = True
            
            return static_comparison["logical_equivalence"], static_comparison
        
        # If no executor, return static analysis results
        return static_comparison["logical_equivalence"], static_comparison 