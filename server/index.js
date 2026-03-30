const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const Database = require('better-sqlite3');
const path = require('path');
const { logger, createRequestLogger, errorHandler } = require('./logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(createRequestLogger); // Add logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info('HTTP Request', { message: message.trim() })
  }
}));
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, '..', 'expenses.db');
let db;

try {
  db = new Database(dbPath);
  // Enable WAL mode for better concurrency and crash resilience
  db.pragma('journal_mode = WAL');
  logger.info('Connected to SQLite database', { dbPath });
} catch (error) {
  logger.error('Database connection error', error);
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
    currency TEXT DEFAULT 'INR',
    userId TEXT DEFAULT 'default'
  )
`);

// Migration: add currency column if missing (for existing databases)
try {
  const columns = db.prepare("PRAGMA table_info(expenses)").all();
  if (!columns.find(c => c.name === 'currency')) {
    db.exec(`ALTER TABLE expenses ADD COLUMN currency TEXT DEFAULT 'INR'`);
    logger.info('Migrated expenses table: added currency column');
  }
} catch (e) {
  logger.warn('Currency column migration check:', e.message);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    month TEXT NOT NULL,
    userId TEXT DEFAULT 'default',
    currency TEXT DEFAULT 'INR'
  )
`);

// Add currency column if missing (migration for existing databases)
try {
  db.prepare("ALTER TABLE budgets ADD COLUMN currency TEXT DEFAULT 'INR'").run();
} catch (e) {
  // Column already exists, ignore
}

// Clean up duplicate budget rows - keep only the latest per category
try {
  db.prepare(`DELETE FROM budgets WHERE rowid NOT IN (SELECT MAX(rowid) FROM budgets GROUP BY category, userId)`).run();
} catch (e) {
  // Ignore if fails
}

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Arthiq API',
      version: '1.0.0',
      description: 'A comprehensive API for managing personal expenses and budgets',
      contact: {
        name: 'Arthiq Team',
        email: 'support@arthiq.com'
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
  customSiteTitle: 'Arthiq API Documentation'
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
    req.logger.logAPICall('/api/expenses', 'GET', 200, { month, category });
    
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
    
    const startTime = Date.now();
    const stmt = db.prepare(query);
    const expenses = stmt.all(params);
    const duration = Date.now() - startTime;
    
    req.logger.logDatabaseOperation('SELECT', 'expenses', { 
      count: expenses.length, 
      duration: `${duration}ms`,
      filters: { month, category }
    });
    
    res.json(expenses);
  } catch (error) {
    req.logger.logError(error, { endpoint: '/api/expenses', method: 'GET' });
    res.status(500).json({ error: error.message, correlationId: req.correlationId });
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
    
    req.logger.logAPICall('/api/expenses', 'POST', 201, { 
      expenseId: id, 
      category, 
      amount 
    });

    if (!id || !date || !category || !description || amount === undefined) {
      req.logger.warn('Invalid expense creation attempt', { 
        missingFields: { id: !id, date: !date, category: !category, description: !description, amount: amount === undefined },
        correlationId: req.correlationId
      });
      return res.status(400).json({ error: 'Missing required fields', correlationId: req.correlationId });
    }

    const currency = req.body.currency || 'INR';
    const startTime = Date.now();
    const stmt = db.prepare('INSERT INTO expenses (id, date, category, description, amount, currency, userId) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, date, category, description, amount, currency, 'default');
    const duration = Date.now() - startTime;
    
    req.logger.logDatabaseOperation('INSERT', 'expenses', { 
      expenseId: id, 
      duration: `${duration}ms` 
    });
    
    req.logger.logBusinessEvent('Expense Created', {
      expenseId: id,
      category,
      amount,
      date
    });

    res.status(201).json({ id, date, category, description, amount, currency: req.body.currency || 'INR', userId: 'default' });
  } catch (error) {
    req.logger.logError(error, { endpoint: '/api/expenses', method: 'POST', body: req.body });
    res.status(500).json({ error: error.message, correlationId: req.correlationId });
  }
});

/**
 * @swagger
 * /api/expenses/{id}:
 *   put:
 *     summary: Update an existing expense
 *     tags: [Expenses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Expense'
 *     responses:
 *       200:
 *         description: Expense updated
 *       404:
 *         description: Expense not found
 */
app.put('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { date, category, description, amount, currency } = req.body;

    if (!date || !category || !description || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stmt = db.prepare(
      'UPDATE expenses SET date = ?, category = ?, description = ?, amount = ?, currency = ? WHERE id = ? AND userId = ?'
    );
    const result = stmt.run(date, category, description, amount, currency || 'INR', id, 'default');

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ id, date, category, description, amount, currency: currency || 'INR', userId: 'default' });
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
    const { id, category, amount, month, currency } = req.body;

    if (!id || !category || amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields (id, category, amount)' });
    }

    // Default month to current month if not provided
    const budgetMonth = month || new Date().toISOString().slice(0, 7);

    // Delete any existing budget for this category, then insert the new one
    db.prepare('DELETE FROM budgets WHERE category = ? AND userId = ?').run(category, 'default');
    const stmt = db.prepare('INSERT INTO budgets (id, category, amount, month, userId, currency) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run(id, category, amount, budgetMonth, 'default', currency || 'INR');

    res.status(201).json({ id, category, amount, month: budgetMonth, currency: currency || 'INR', userId: 'default' });
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
 * /api/budgets/category/{category}:
 *   delete:
 *     summary: Delete a budget by category
 *     tags: [Budgets]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: The budget category
 *     responses:
 *       200:
 *         description: Budget deleted successfully
 *       404:
 *         description: Budget not found
 */
app.delete('/api/budgets/category/:category', (req, res) => {
  try {
    const { category } = req.params;
    const stmt = db.prepare('DELETE FROM budgets WHERE category = ? AND userId = ?');
    const result = stmt.run(category, 'default');

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all data endpoint
app.delete('/api/clear-all', (req, res) => {
  try {
    db.exec('DELETE FROM expenses WHERE userId = ?', ['default']);
    db.exec('DELETE FROM budgets WHERE userId = ?', ['default']);
    res.json({ success: true, message: 'All data cleared' });
  } catch (error) {
    // Fallback: use prepared statements
    try {
      db.prepare('DELETE FROM expenses WHERE userId = ?').run('default');
      db.prepare('DELETE FROM budgets WHERE userId = ?').run('default');
      res.json({ success: true, message: 'All data cleared' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
});

// Create settings table
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    userId TEXT DEFAULT 'default'
  )
`);

/**
 * @swagger
 * /api/settings/{key}:
 *   get:
 *     summary: Get a setting by key
 *     tags: [Settings]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Setting value
 */
app.get('/api/settings/:key', (req, res) => {
  try {
    const { key } = req.params;
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ? AND userId = ?');
    const result = stmt.get(key, 'default');
    res.json({ 
      key, 
      value: result ? result.value : null 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/settings:
 *   post:
 *     summary: Set a setting
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, value]
 *             properties:
 *               key:
 *                 type: string
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Setting saved
 */
app.post('/api/settings', (req, res) => {
  try {
    const { key, value } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Missing key or value' });
    }

    const stmt = db.prepare(`
      INSERT INTO settings (key, value, userId) 
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET 
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    stmt.run(key, value, 'default');
    res.json({ success: true, key, value });
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
/**
 * @swagger
 * /api/logs:
 *   post:
 *     summary: Submit frontend logs
 *     tags: [System]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source:
 *                 type: string
 *                 example: "frontend"
 *               level:
 *                 type: string
 *                 example: "error"
 *               message:
 *                 type: string
 *                 example: "User action failed"
 *               context:
 *                 type: object
 *     responses:
 *       200:
 *         description: Log received
 */
app.post('/api/logs', (req, res) => {
  try {
    const logData = req.body;
    
    // Log the frontend message to our backend logger
    const level = logData.level || 'info';
    const message = `Frontend: ${logData.message}`;
    const context = {
      source: 'frontend',
      frontendSessionId: logData.sessionId,
      frontendCorrelationId: logData.correlationId,
      url: logData.url,
      userAgent: logData.userAgent,
      ...logData.context
    };
    
    req.logger[level](message, context);
    
    res.json({ status: 'logged', correlationId: req.correlationId });
  } catch (error) {
    req.logger.logError(error, { endpoint: '/api/logs', method: 'POST' });
    res.status(500).json({ error: error.message, correlationId: req.correlationId });
  }
});

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Get recent logs (for debugging)
 *     tags: [System]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *         description: Filter by log level
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of logs to return (max 100)
 *     responses:
 *       200:
 *         description: Log entries
 */
app.get('/api/logs', (req, res) => {
  try {
    const fs = require('fs');
    const { level, limit = 50 } = req.query;
    const maxLimit = Math.min(parseInt(limit) || 50, 100);
    
    req.logger.logAPICall('/api/logs', 'GET', 200, { level, limit: maxLimit });
    
    // Read the latest log file
    const logsDir = path.join(__dirname, '..', 'logs');
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `application-${today}.log`);
    
    if (!fs.existsSync(logFile)) {
      return res.json({ logs: [], message: 'No logs found for today' });
    }
    
    const logContent = fs.readFileSync(logFile, 'utf8');
    const logLines = logContent.trim().split('\n').filter(line => line.trim());
    
    let logs = logLines
      .slice(-maxLimit * 2) // Get more than needed in case of filtering
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(log => log !== null);
    
    // Filter by level if specified
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    // Take only the requested amount
    logs = logs.slice(-maxLimit);
    
    res.json({ logs, count: logs.length });
  } catch (error) {
    req.logger.logError(error, { endpoint: '/api/logs', method: 'GET' });
    res.status(500).json({ error: error.message, correlationId: req.correlationId });
  }
});

app.get('/api/health', (req, res) => {
  try {
    // Test database connection
    const stmt = db.prepare('SELECT 1');
    stmt.get();
    
    req.logger.info('Health check performed', { status: 'OK' });
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'Connected',
      correlationId: req.correlationId
    });
  } catch (error) {
    req.logger.logError(error, { endpoint: '/api/health' });
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
      error: error.message,
      correlationId: req.correlationId
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
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  req.logger?.warn('404 - Endpoint not found', { url: req.url, method: req.method });
  res.status(404).json({ error: 'Endpoint not found', correlationId: req.correlationId });
});

// Start server
app.listen(PORT, () => {
  logger.info('Server started', { 
    port: PORT, 
    apiDocs: `http://localhost:${PORT}/api-docs`,
    dbPath 
  });
  console.log(`🚀 Arthiq API Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`💾 Database: ${dbPath}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutdown signal received');
  console.log('\n⏹️  Shutting down server...');
  if (db) {
    db.close();
    logger.info('Database connection closed');
    console.log('✅ Database connection closed');
  }
  logger.info('Server shutdown complete');
  process.exit(0);
});