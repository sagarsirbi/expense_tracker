# 📋 Arthiq Logging System

A comprehensive logging solution for both frontend and backend to track events, errors, and user actions for debugging and monitoring.

## 🎯 Features

### Backend Logging (Winston)
- **Structured Logging** - JSON formatted logs with metadata
- **File Rotation** - Daily log rotation with compression and retention
- **Multiple Transports** - Console (development) and file outputs
- **Error Tracking** - Dedicated error log files
- **Correlation IDs** - Request tracking across services
- **Performance Monitoring** - Database operation timing
- **Security Events** - Security-related event logging

### Frontend Logging
- **Console Logging** - Formatted console output for development
- **Remote Logging** - Send logs to backend API
- **Error Boundaries** - Automatic error catching and logging
- **User Action Tracking** - Log user interactions
- **Performance Monitoring** - Component render timing
- **Local Storage** - Persistent log storage in browser

## 🚀 Quick Start

### Backend Logging

```javascript
const { logger } = require('./server/logger');

// Basic logging
logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
logger.error('Database connection failed', { error: 'Connection timeout' });
logger.warn('High memory usage detected', { memoryUsage: '85%' });

// Specialized logging
logger.logBusinessEvent('Purchase Completed', { 
  orderId: '456', 
  amount: 99.99 
});

logger.logPerformance('Database Query', 150, { 
  query: 'SELECT * FROM expenses',
  rows: 100 
});
```

### Frontend Logging

```typescript
import { logger, useLogger } from '../services/logger';

// Component-specific logging
function MyComponent() {
  const componentLogger = useLogger('MyComponent');
  
  useEffect(() => {
    componentLogger.logMount({ props: { id: 123 } });
  }, []);
  
  const handleClick = () => {
    componentLogger.logAction('Button Clicked', { buttonId: 'submit' });
  };
  
  const handleError = (error: Error) => {
    componentLogger.logError(error, { context: 'form submission' });
  };
}

// Global logging
logger.info('Application started');
logger.logUserAction('Page Navigation', { from: '/home', to: '/expenses' });
logger.logAPICall('/api/expenses', 'POST', 201, { expenseId: '789' });
```

## 📁 Log Files Structure

```
logs/
├── application-2025-10-07.log     # All logs for today
├── application-2025-10-06.log.gz  # Compressed previous day
├── error-2025-10-07.log          # Error logs only
└── error-2025-10-06.log.gz       # Compressed error logs
```

## 🔧 Configuration

### Backend Logger Configuration

```javascript
// server/logger.js
const loggerConfig = {
  level: process.env.LOG_LEVEL || 'info',
  maxFiles: '14d',           // Keep logs for 14 days
  maxSize: '20m',            // Rotate when file reaches 20MB
  zippedArchive: true        // Compress old logs
};
```

### Frontend Logger Configuration

```typescript
// src/services/logger.ts
const loggerConfig = {
  enableConsole: true,               // Show logs in console
  enableRemote: true,                // Send logs to API
  logLevel: 'info',                  // Minimum log level
  maxLocalLogs: 100,                 // Keep last 100 logs locally
  enablePerformanceLogging: true     // Track performance metrics
};
```

## 📊 Log Levels

1. **ERROR** - Critical errors that need immediate attention
2. **WARN** - Warning conditions that should be investigated
3. **INFO** - General information about application flow
4. **DEBUG** - Detailed information for debugging (development only)

## 🔍 Log Viewing

### Web Interface
Visit `http://localhost:5174/logs` to view logs in the browser:
- **Filter by level** - Show only errors, warnings, etc.
- **Search logs** - Full-text search across log messages
- **Download logs** - Export logs as text file
- **Real-time refresh** - Get latest log entries

### API Endpoints
- `GET /api/logs` - Retrieve logs (with filtering)
- `POST /api/logs` - Submit frontend logs
- `GET /api/health` - Check system health

### Command Line
```bash
# View today's logs
tail -f logs/application-$(date +%Y-%m-%d).log

# View errors only
tail -f logs/error-$(date +%Y-%m-%d).log

# Search for specific term
grep "expense" logs/application-*.log
```

## 🎭 Log Categories

### Business Events
Track important business operations:
```javascript
logger.logBusinessEvent('Expense Created', {
  expenseId: 'exp_123',
  category: 'Food',
  amount: 25.50,
  userId: 'user_456'
});
```

### Security Events
Monitor security-related activities:
```javascript
logger.logSecurityEvent('Failed Login Attempt', 'warn', {
  username: 'john@example.com',
  ip: '192.168.1.100',
  attempts: 3
});
```

### Performance Events
Track performance metrics:
```javascript
logger.logPerformance('Database Query', 250, {
  operation: 'SELECT',
  table: 'expenses',
  rowCount: 150
});
```

### User Actions
Track user interactions:
```javascript
logger.logUserAction('Expense Added', {
  expenseId: 'exp_789',
  category: 'Transportation',
  method: 'form'
});
```

## 🔗 Correlation IDs

Every request gets a unique correlation ID that tracks the request across frontend and backend:

```
Frontend Request: abc123-def456-ghi789
↓
Backend Processing: abc123-def456-ghi789
↓ 
Database Operation: abc123-def456-ghi789
↓
Response: abc123-def456-ghi789
```

## 🛡️ Error Boundary

Automatic error catching in React components:

```tsx
// Wraps components automatically
<ErrorBoundary componentName="ExpenseTracker">
  <ExpenseTracker />
</ErrorBoundary>

// Logs errors with full context:
// - Component name and props
// - Error message and stack trace
// - User session information
// - Current URL and user agent
```

## 📈 Analytics & Monitoring

### Key Metrics Logged
- **API Response Times** - Track slow endpoints
- **Database Query Performance** - Identify slow queries
- **Error Rates** - Monitor application health
- **User Actions** - Track feature usage
- **Component Performance** - React render times

### Example Log Analysis
```bash
# Find slow API calls (>1000ms)
grep "Performance.*[0-9]{4,}ms" logs/application-*.log

# Count errors by type
grep "ERROR" logs/error-*.log | cut -d'"' -f8 | sort | uniq -c

# Track user activity
grep "User Action" logs/application-*.log | tail -20
```

## 🔧 Development Tips

### Enable Debug Logging
```bash
# Backend
LOG_LEVEL=debug npm run api-dev

# Frontend (automatically enabled in development)
# Logs will show in browser console
```

### Test Error Logging
```javascript
// Trigger a test error to verify logging
logger.error('Test error for logging verification', {
  test: true,
  timestamp: new Date().toISOString()
});
```

### Monitor Log Files
```bash
# Watch logs in real-time
npm run api-dev & tail -f logs/application-$(date +%Y-%m-%d).log
```

## 🚨 Troubleshooting

### Common Issues

1. **Logs not appearing**
   - Check if API server is running on port 3001
   - Verify `enableRemote: true` in frontend config
   - Check browser console for CORS errors

2. **Log files not created**
   - Ensure `logs/` directory exists
   - Check file permissions
   - Verify disk space availability

3. **Performance issues**
   - Reduce log level in production (`LOG_LEVEL=warn`)
   - Decrease log retention period
   - Disable debug logging

### Debug Commands
```bash
# Check if logs directory exists
ls -la logs/

# Test API logging endpoint
curl -X POST http://localhost:3001/api/logs \
  -H "Content-Type: application/json" \
  -d '{"level":"info","message":"Test log","source":"test"}'

# View latest logs
tail -20 logs/application-$(date +%Y-%m-%d).log
```

## 🎯 Best Practices

1. **Use appropriate log levels** - Don't log everything as INFO
2. **Include context** - Add relevant metadata to logs
3. **Avoid logging sensitive data** - No passwords, tokens, or PII
4. **Use correlation IDs** - Track requests across services
5. **Monitor log file sizes** - Ensure rotation is working
6. **Regular log analysis** - Review logs for patterns and issues

## 📚 Additional Resources

- **API Documentation**: `http://localhost:3001/api-docs`
- **Log Viewer**: `http://localhost:5174/logs`
- **Dashboard**: `http://localhost:3001/dashboard`
- **Health Check**: `http://localhost:3001/api/health`

---

🎉 **Your application now has comprehensive logging for better debugging and monitoring!**