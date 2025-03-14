export interface SampleQuery {
  id: string;
  text: string;
  expectedSql?: string;
  description?: string;
}

export const sampleQueries: SampleQuery[] = [
  {
    id: '1',
    text: 'Find all customers who made purchases in the last 30 days',
    expectedSql: 'SELECT * FROM customers WHERE purchase_date >= CURRENT_DATE - INTERVAL 30 DAY;',
    description: 'Basic query with date filtering'
  },
  {
    id: '2',
    text: 'Show me the top 5 products by sales volume',
    expectedSql: 'SELECT products.name, SUM(order_items.quantity) as total_sold FROM products JOIN order_items ON products.id = order_items.product_id GROUP BY products.id ORDER BY total_sold DESC LIMIT 5;',
    description: 'Query with aggregation, joining, and limiting'
  },
  {
    id: '3',
    text: 'List all employees who have been with the company for more than 5 years and their departments',
    expectedSql: 'SELECT employees.name, departments.name as department, employees.hire_date FROM employees JOIN departments ON employees.department_id = departments.id WHERE employees.hire_date <= CURRENT_DATE - INTERVAL 5 YEAR;',
    description: 'Complex join with date calculation'
  },
  {
    id: '4',
    text: 'What is the average order value by customer segment?',
    expectedSql: 'SELECT customer_segments.name, AVG(orders.total_amount) as avg_order_value FROM orders JOIN customers ON orders.customer_id = customers.id JOIN customer_segments ON customers.segment_id = customer_segments.id GROUP BY customer_segments.id;',
    description: 'Multi-table join with aggregation'
  },
  {
    id: '5',
    text: 'Find products that have never been ordered',
    expectedSql: 'SELECT products.* FROM products LEFT JOIN order_items ON products.id = order_items.product_id WHERE order_items.id IS NULL;',
    description: 'Left join with NULL check'
  },
  {
    id: '6',
    text: 'Show me customers who have spent more than $1000 in total',
    expectedSql: 'SELECT customers.name, SUM(orders.total_amount) as total_spent FROM customers JOIN orders ON customers.id = orders.customer_id GROUP BY customers.id HAVING total_spent > 1000;',
    description: 'Aggregation with HAVING clause'
  },
  {
    id: '7',
    text: 'List all products with their categories and suppliers',
    expectedSql: 'SELECT products.name, categories.name as category, suppliers.name as supplier FROM products JOIN categories ON products.category_id = categories.id JOIN suppliers ON products.supplier_id = suppliers.id;',
    description: 'Multiple joins'
  },
  {
    id: '8',
    text: 'Find the employee who processed the most orders',
    expectedSql: 'SELECT employees.name, COUNT(orders.id) as order_count FROM employees JOIN orders ON employees.id = orders.employee_id GROUP BY employees.id ORDER BY order_count DESC LIMIT 1;',
    description: 'Aggregation with ordering'
  },
  {
    id: '9',
    text: 'Show me all orders placed on weekends',
    expectedSql: "SELECT * FROM orders WHERE DAYOFWEEK(order_date) IN (1, 7);",
    description: 'Date function usage'
  },
  {
    id: '10',
    text: 'List customers who have not made a purchase in the last year',
    expectedSql: 'SELECT customers.* FROM customers LEFT JOIN orders ON customers.id = orders.customer_id AND orders.order_date >= CURRENT_DATE - INTERVAL 1 YEAR WHERE orders.id IS NULL;',
    description: 'Complex left join with date filtering'
  }
];

export default sampleQueries; 