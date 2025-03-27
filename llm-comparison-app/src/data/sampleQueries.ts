export interface SampleQuery {
  id: string;
  name: string;
  query: string;
  schema?: string;
  expectedSql?: string;
}

export const sampleQueries: SampleQuery[] = [
  {
    id: 'sample1',
    name: 'Find all users',
    query: 'Find all users in the database',
    schema: `
CREATE TABLE users (
  id INT PRIMARY KEY,
  username VARCHAR(50),
  email VARCHAR(100)
);`,
    expectedSql: 'SELECT * FROM users;'
  },
  {
    id: 'sample2',
    name: 'Count orders by status',
    query: 'Show me the count of orders by status',
    schema: `
CREATE TABLE orders (
  id INT PRIMARY KEY,
  status VARCHAR(20),
  created_at TIMESTAMP
);`,
    expectedSql: 'SELECT status, COUNT(*) as count FROM orders GROUP BY status;'
  },
  {
    id: 'sample3',
    name: 'Recent customer orders',
    query: 'Find all orders from customers in the last month',
    schema: `
CREATE TABLE customers (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100)
);

CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer_id INT,
  order_date TIMESTAMP,
  total_amount DECIMAL(10,2),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);`,
    expectedSql: 'SELECT c.name, o.* FROM customers c JOIN orders o ON c.id = o.customer_id WHERE o.order_date >= NOW() - INTERVAL \'1 month\';'
  },
  {
    id: 'sample4',
    name: 'Top Products by Revenue',
    query: 'List the top 5 products that generated the most revenue',
    schema: `
CREATE TABLE products (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  price DECIMAL(10,2)
);

CREATE TABLE order_items (
  id INT PRIMARY KEY,
  order_id INT,
  product_id INT,
  quantity INT,
  FOREIGN KEY (product_id) REFERENCES products(id)
);`,
    expectedSql: 'SELECT p.name, SUM(p.price * oi.quantity) as revenue FROM products p JOIN order_items oi ON p.id = oi.product_id GROUP BY p.id, p.name ORDER BY revenue DESC LIMIT 5;'
  },
  {
    id: 'sample5',
    name: 'Customer Purchase Analysis',
    query: 'Find customers who have made more than 3 purchases',
    schema: `
CREATE TABLE customers (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100)
);

CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer_id INT,
  order_date TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);`,
    expectedSql: 'SELECT c.name, COUNT(o.id) as order_count FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.name HAVING COUNT(o.id) > 3;'
  },
  {
    id: 'sample6',
    name: 'Product Category Analysis',
    query: 'Show the total sales for each product category',
    schema: `
CREATE TABLE categories (
  id INT PRIMARY KEY,
  name VARCHAR(50)
);

CREATE TABLE products (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  category_id INT,
  price DECIMAL(10,2),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE sales (
  id INT PRIMARY KEY,
  product_id INT,
  quantity INT,
  sale_date TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);`,
    expectedSql: 'SELECT c.name as category, SUM(p.price * s.quantity) as total_sales FROM categories c JOIN products p ON c.id = p.category_id JOIN sales s ON p.id = s.product_id GROUP BY c.id, c.name ORDER BY total_sales DESC;'
  }
];

export default sampleQueries; 