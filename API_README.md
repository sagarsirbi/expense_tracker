# Arthiq API

A comprehensive RESTful API for managing personal expenses and budgets with Swagger documentation.

## 🚀 Quick Start

### Start the API Server

```bash
# Start API server in development mode (with auto-restart)
npm run api-dev

# Start API server in production mode
npm run api-server

# Start both frontend and API server simultaneously
npm run dev-full
```

The API server will be available at:
- **Base URL:** `http://localhost:3001`
- **Swagger Documentation:** `http://localhost:3001/api-docs`

## 📚 API Documentation

Visit `http://localhost:3001/api-docs` to access the interactive Swagger documentation where you can:

- View all available endpoints
- Test API endpoints directly from the browser
- See request/response schemas
- Copy cURL commands
- Try out different parameters and request bodies

## 🔗 Available Endpoints

### Expenses
- `GET /api/expenses` - Get all expenses (with optional filtering)
- `POST /api/expenses` - Create a new expense
- `DELETE /api/expenses/{id}` - Delete an expense

### Budgets
- `GET /api/budgets` - Get all budgets (with optional filtering)
- `POST /api/budgets` - Create or update a budget
- `DELETE /api/budgets/{id}` - Delete a budget

### Analytics
- `GET /api/analytics/categories` - Get expense analytics by categories
- `GET /api/analytics/monthly` - Get monthly expense trends

### System
- `GET /api/health` - Health check endpoint

## 📝 Example Usage

### Create an Expense
```bash
curl -X POST http://localhost:3001/api/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "id": "exp_123456789",
    "date": "2024-01-15",
    "category": "Food & Dining",
    "description": "Lunch at restaurant",
    "amount": 25.50
  }'
```

### Get Expenses for a Month
```bash
curl "http://localhost:3001/api/expenses?month=2024-01"
```

### Set a Budget
```bash
curl -X POST http://localhost:3001/api/budgets \
  -H "Content-Type: application/json" \
  -d '{
    "id": "budget_123456789",
    "category": "Food & Dining",
    "amount": 500.00,
    "month": "2024-01"
  }'
```

### Get Category Analytics
```bash
curl "http://localhost:3001/api/analytics/categories?month=2024-01"
```

## 🗄️ Database

The API uses SQLite database located at `./expenses.db` with the following schema:

### Expenses Table
- `id` (TEXT PRIMARY KEY) - Unique expense identifier
- `date` (TEXT) - Date of the expense (YYYY-MM-DD format)
- `category` (TEXT) - Expense category
- `description` (TEXT) - Expense description
- `amount` (REAL) - Expense amount
- `userId` (TEXT) - User identifier (defaults to 'default')

### Budgets Table
- `id` (TEXT PRIMARY KEY) - Unique budget identifier
- `category` (TEXT) - Budget category
- `amount` (REAL) - Budget amount
- `month` (TEXT) - Budget month (YYYY-MM format)
- `userId` (TEXT) - User identifier (defaults to 'default')

## 🔧 Features

- **Interactive Documentation** - Full Swagger UI with testing capabilities
- **RESTful Design** - Clean, predictable API endpoints
- **Data Validation** - Request validation with detailed error messages
- **Filtering Support** - Query by month, category, and other parameters
- **Analytics Endpoints** - Pre-built analytics for categories and trends
- **Health Monitoring** - Health check endpoint for monitoring
- **CORS Enabled** - Ready for frontend integration
- **Security Headers** - Helmet.js for basic security
- **Request Logging** - Morgan middleware for request logging
- **Auto-restart** - Nodemon for development convenience

## 🌟 Testing the API

1. **Visit Swagger UI:** Go to `http://localhost:3001/api-docs`
2. **Explore Endpoints:** Click on any endpoint to see its details
3. **Try it Out:** Use the "Try it out" button to test endpoints
4. **View Responses:** See real-time responses and status codes
5. **Copy cURL:** Get cURL commands for external testing

## 📡 Integration

The API is designed to work alongside your React frontend. You can:

- Replace the current database service calls with API calls
- Use the same data structures (expenses and budgets)
- Maintain the existing frontend functionality
- Add real-time updates and better error handling

## 🔐 Security Notes

- The API currently uses a default user system
- CORS is enabled for localhost development
- Basic security headers are applied via Helmet
- Consider adding authentication for production use

## 🛠️ Development

To modify the API:

1. Edit `server/index.js` for endpoint logic
2. Update Swagger documentation comments for new endpoints
3. Restart the server with `npm run api-dev` (auto-restarts on changes)
4. Test changes in the Swagger UI

Enjoy exploring and testing your Arthiq API! 🎉