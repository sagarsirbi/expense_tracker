const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Custom format for log messages
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]`;
    
    // Add correlation ID if available
    if (meta.correlationId) {
      logMessage += ` [${meta.correlationId}]`;
    }
    
    // Add user context if available
    if (meta.userId || meta.userAgent) {
      logMessage += ` [User: ${meta.userId || 'anonymous'}]`;
    }
    
    logMessage += `: ${message}`;
    
    // Add metadata
    if (Object.keys(meta).length > 0) {
      const cleanMeta = { ...meta };
      delete cleanMeta.correlationId;
      delete cleanMeta.userId;
      delete cleanMeta.userAgent;
      
      if (Object.keys(cleanMeta).length > 0) {
        logMessage += ` | ${JSON.stringify(cleanMeta)}`;
      }
    }
    
    return logMessage;
  })
);

// Daily rotate file transport for all logs
const allLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat
});

// Daily rotate file transport for error logs only
const errorLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: logFormat
});

// Console transport for development
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, correlationId, userId }) => {
      let logMessage = `${timestamp} ${level}`;
      
      if (correlationId) {
        logMessage += ` [${correlationId.substring(0, 8)}]`;
      }
      
      if (userId) {
        logMessage += ` [${userId}]`;
      }
      
      logMessage += `: ${message}`;
      return logMessage;
    })
  )
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'expense-tracker-api'
  },
  transports: [
    allLogsTransport,
    errorLogsTransport,
    ...(process.env.NODE_ENV !== 'production' ? [consoleTransport] : [])
  ]
});

// Log rotation event handlers
allLogsTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Log file rotated', { oldFilename, newFilename, type: 'all-logs' });
});

errorLogsTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Error log file rotated', { oldFilename, newFilename, type: 'error-logs' });
});

// Enhanced logging methods with context
class Logger {
  constructor() {
    this.winston = logger;
  }

  // Create child logger with context
  child(context = {}) {
    const childLogger = new Logger();
    childLogger.defaultContext = { ...this.defaultContext, ...context };
    return childLogger;
  }

  // Enhanced logging methods
  info(message, meta = {}) {
    logger.info(message, { ...this.defaultContext, ...meta });
  }

  error(message, meta = {}) {
    if (meta instanceof Error) {
      meta = {
        error: meta.message,
        stack: meta.stack,
        name: meta.name
      };
    }
    logger.error(message, { ...this.defaultContext, ...meta });
  }

  warn(message, meta = {}) {
    logger.warn(message, { ...this.defaultContext, ...meta });
  }

  debug(message, meta = {}) {
    logger.debug(message, { ...this.defaultContext, ...meta });
  }

  // Specialized logging methods
  logRequest(req, res, duration) {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      correlationId: req.correlationId
    });
  }

  logError(error, context = {}) {
    this.error('Application Error', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      ...context
    });
  }

  logDatabaseOperation(operation, table, data = {}) {
    this.info('Database Operation', {
      operation,
      table,
      ...data
    });
  }

  logUserAction(action, userId, data = {}) {
    this.info('User Action', {
      action,
      userId,
      ...data
    });
  }

  logAPICall(endpoint, method, statusCode, data = {}) {
    this.info('API Call', {
      endpoint,
      method,
      statusCode,
      ...data
    });
  }

  // Security logging
  logSecurityEvent(event, level = 'warn', data = {}) {
    this[level](`Security Event: ${event}`, {
      securityEvent: true,
      ...data
    });
  }

  // Performance logging
  logPerformance(operation, duration, data = {}) {
    const level = duration > 1000 ? 'warn' : 'info';
    this[level](`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      performance: true,
      ...data
    });
  }

  // Business logic logging
  logBusinessEvent(event, data = {}) {
    this.info(`Business Event: ${event}`, {
      businessEvent: true,
      ...data
    });
  }
}

// Create and export logger instance
const appLogger = new Logger();

// Utility functions
const createRequestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Generate correlation ID if not present
  if (!req.correlationId) {
    req.correlationId = require('crypto').randomUUID();
  }
  
  // Add correlation ID to response headers
  res.set('X-Correlation-ID', req.correlationId);
  
  // Create request-specific logger
  req.logger = appLogger.child({
    correlationId: req.correlationId,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Log request completion
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    req.logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      correlationId: req.correlationId
    });
  });

  next();
};

const errorHandler = (error, req, res, next) => {
  const logger = req.logger || appLogger;
  
  logger.error(error.message, {
    error: error.message,
    stack: error.stack,
    name: error.name,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    correlationId: req.correlationId
  });

  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : error.message;

  res.status(error.status || 500).json({
    error: message,
    correlationId: req.correlationId
  });
};

module.exports = {
  logger: appLogger,
  createRequestLogger,
  errorHandler,
  Logger
};