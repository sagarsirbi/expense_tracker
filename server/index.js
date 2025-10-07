const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, '..', 'expenses.db');
let db;

try {
  db = new Database(dbPath);
  console.log('Connected to SQLite database');
} catch (error) {
  console.error('Database connection error:', error);
  process.exit(1);
}

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    userId TEXT DEFAULT 'default'
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    month TEXT NOT NULL,
    userId TEXT DEFAULT 'default'
  )
`);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Expense Tracker API',
      version: '1.0.0',
      description: 'A comprehensive API for managing personal expenses and budgets',
      contact: {
        name: 'Expense Tracker Team',
        email: 'support@expensetracker.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        Expense: {
          type: 'object',
          required: ['id', 'date', 'category', 'description', 'amount'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the expense',
              example: 'exp_123456789'
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Date of the expense',
              example: '2024-01-15'
            },
            category: {
              type: 'string',
              description: 'Category of the expense',
              example: 'Food & Dining'
            },
            description: {
              type: 'string',
              description: 'Description of the expense',
              example: 'Lunch at restaurant'
            },
            amount: {
              type: 'number',
              format: 'float',
              description: 'Amount spent',
              example: 25.50
            },
            userId: {
              type: 'string',
              description: 'User identifier',
              example: 'default'
            }
          }
        },
        Budget: {
          type: 'object',
          required: ['id', 'category', 'amount', 'month'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique identifier for the budget',
              example: 'budget_123456789'
            },
            category: {
              type: 'string',
              description: 'Category for the budget',
              example: 'Food & Dining'
            },
            amount: {
              type: 'number',
              format: 'float',
              description: 'Budget amount',
              example: 500.00
            },
            month: {
              type: 'string',
              description: 'Month for the budget (YYYY-MM format)',
              example: '2024-01'
            },
            userId: {
              type: 'string',
              description: 'User identifier',
              example: 'default'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        }
      }
    }
  },
  apis: ['./server/*.js']
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Expense Tracker API Documentation'
}));

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     summary: Get all expenses
 *     tags: [Expenses]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Filter by month (YYYY-MM format)
 *         example: "2024-01"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *         example: "Food & Dining"
 *     responses:
 *       200:
 *         description: List of expenses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Expense'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/expenses', (req, res) => {
  try {
    const { month, category } = req.query;
    let query = 'SELECT * FROM expenses WHERE userId = ?';
    const params = ['default'];

    if (month) {
      query += ' AND date LIKE ?';
      params.push(`${month}%`);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY date DESC';
    
    const stmt = db.prepare(query);
    const expenses = stmt.all(params);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     summary: Create a new expense
 *     tags: [Expenses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, date, category, description, amount]
 *             properties:
 *               id:
 *                 type: string
 *                 example: "exp_123456789"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-15"
 *               category:
 *                 type: string
 *                 example: "Food & Dining"
 *               description:
 *                 type: string
 *                 example: "Lunch at restaurant"
 *               amount:
 *                 type: number
 *                 example: 25.50
 *     responses:
 *       201:
 *         description: Expense created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expense'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/expenses', (req, res) => {
  try {
    const { id, date, category, description, amount } = req.body;

    if (!id || !date || !category || !description || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stmt = db.prepare('INSERT INTO expenses (id, date, category, description, amount, userId) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, date, category, description, amount, 'default');

    res.status(201).json({ id, date, category, description, amount, userId: 'default' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/expenses/{id}:
 *   delete:
 *     summary: Delete an expense
 *     tags: [Expenses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The expense ID
 *         example: "exp_123456789"
 *     responses:
 *       200:
 *         description: Expense deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Expense deleted successfully"
 *       404:
 *         description: Expense not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM expenses WHERE id = ? AND userId = ?');
    const result = stmt.run(id, 'default');

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/budgets:
 *   get:
 *     summary: Get all budgets
 *     tags: [Budgets]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Filter by month (YYYY-MM format)
 *         example: "2024-01"
 *     responses:
 *       200:
 *         description: List of budgets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Budget'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/budgets', (req, res) => {
  try {
    const { month } = req.query;
    let query = 'SELECT * FROM budgets WHERE userId = ?';
    const params = ['default'];

    if (month) {
      query += ' AND month = ?';
      params.push(month);
    }

    query += ' ORDER BY category';
    
    const stmt = db.prepare(query);
    const budgets = stmt.all(params);
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/budgets:
 *   post:
 *     summary: Create or update a budget
 *     tags: [Budgets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [id, category, amount, month]
 *             properties:
 *               id:
 *                 type: string
 *                 example: "budget_123456789"
 *               category:
 *                 type: string
 *                 example: "Food & Dining"
 *               amount:
 *                 type: number
 *                 example: 500.00
 *               month:
 *                 type: string
 *                 example: "2024-01"
 *     responses:
 *       201:
 *         description: Budget created/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Budget'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/budgets', (req, res) => {
  try {
    const { id, category, amount, month } = req.body;

    if (!id || !category || amount === undefined || !month) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stmt = db.prepare('INSERT OR REPLACE INTO budgets (id, category, amount, month, userId) VALUES (?, ?, ?, ?, ?)');
    stmt.run(id, category, amount, month, 'default');

    res.status(201).json({ id, category, amount, month, userId: 'default' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/budgets/{id}:
 *   delete:
 *     summary: Delete a budget
 *     tags: [Budgets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The budget ID
 *         example: "budget_123456789"
 *     responses:
 *       200:
 *         description: Budget deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Budget deleted successfully"
 *       404:
 *         description: Budget not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete('/api/budgets/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM budgets WHERE id = ? AND userId = ?');
    const result = stmt.run(id, 'default');

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/analytics/categories:
 *   get:
 *     summary: Get expense analytics by categories
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: string
 *         description: Filter by month (YYYY-MM format)
 *         example: "2024-01"
 *     responses:
 *       200:
 *         description: Category analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   category:
 *                     type: string
 *                     example: "Food & Dining"
 *                   total:
 *                     type: number
 *                     example: 150.75
 *                   count:
 *                     type: integer
 *                     example: 8
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/analytics/categories', (req, res) => {
  try {
    const { month } = req.query;
    let query = 'SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses WHERE userId = ?';
    const params = ['default'];

    if (month) {
      query += ' AND date LIKE ?';
      params.push(`${month}%`);
    }

    query += ' GROUP BY category ORDER BY total DESC';
    
    const stmt = db.prepare(query);
    const analytics = stmt.all(params);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/analytics/monthly:
 *   get:
 *     summary: Get monthly expense trends
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *         description: Filter by year (YYYY format)
 *         example: "2024"
 *     responses:
 *       200:
 *         description: Monthly analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   month:
 *                     type: string
 *                     example: "2024-01"
 *                   total:
 *                     type: number
 *                     example: 1250.50
 *                   count:
 *                     type: integer
 *                     example: 25
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/analytics/monthly', (req, res) => {
  try {
    const { year } = req.query;
    let query = `SELECT substr(date, 1, 7) as month, SUM(amount) as total, COUNT(*) as count 
                 FROM expenses WHERE userId = ?`;
    const params = ['default'];

    if (year) {
      query += ' AND date LIKE ?';
      params.push(`${year}%`);
    }

    query += ' GROUP BY substr(date, 1, 7) ORDER BY month DESC';
    
    const stmt = db.prepare(query);
    const analytics = stmt.all(params);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 *                 database:
 *                   type: string
 *                   example: "Connected"
 */
app.get('/api/health', (req, res) => {
  try {
    // Test database connection
    const stmt = db.prepare('SELECT 1');
    stmt.get();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'Connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
      error: error.message
    });
  }
});

// Root endpoint redirect to API docs
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dashboard.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Expense Tracker API Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`💾 Database: ${dbPath}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down server...');
  if (db) {
    db.close();
    console.log('✅ Database connection closed');
  }
  process.exit(0);
});