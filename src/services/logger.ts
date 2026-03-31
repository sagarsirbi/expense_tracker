// Frontend Logger Service
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  correlationId?: string;
  userId?: string;
  url?: string;
  userAgent?: string;
  sessionId?: string;
  stack?: string;
}

interface LoggerConfig {
  enableConsole: boolean;
  enableRemote: boolean;
  logLevel: LogLevel;
  apiEndpoint?: string;
  maxLocalLogs: number;
  enablePerformanceLogging: boolean;
}

class FrontendLogger {
  private config: LoggerConfig;
  private sessionId: string;
  private correlationId: string;
  private localLogs: LogEntry[] = [];
  private performanceMarks: Map<string, number> = new Map();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enableConsole: true,
      enableRemote: true,
      logLevel: 'info',
      apiEndpoint: '/api/logs',
      maxLocalLogs: 100,
      enablePerformanceLogging: true,
      ...config
    };

    // Generate session and correlation IDs
    this.sessionId = this.generateId();
    this.correlationId = this.generateId();

    // Initialize error handlers
    this.setupErrorHandlers();
    
    // Log session start
    this.info('Frontend session started', {
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= levels[this.config.logLevel];
  }

  private createLogEntry(level: LogLevel, message: string, context: Record<string, any> = {}): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      correlationId: this.correlationId,
      sessionId: this.sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
  }

  private addToLocalStorage(entry: LogEntry): void {
    this.localLogs.push(entry);
    
    // Keep only the latest logs
    if (this.localLogs.length > this.config.maxLocalLogs) {
      this.localLogs = this.localLogs.slice(-this.config.maxLocalLogs);
    }

    // Store in localStorage for persistence
    try {
      localStorage.setItem('frontend-logs', JSON.stringify(this.localLogs.slice(-50)));
    } catch (error) {
      console.warn('Failed to store logs in localStorage:', error);
    }
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const style = this.getConsoleStyle(entry.level);
    const prefix = `%c[${entry.timestamp}] [${entry.level.toUpperCase()}] [${(entry.correlationId || '').substring(0, 8)}]`;
    
    console.log(prefix, style, entry.message, entry.context || '');
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      error: 'color: #ff4444; font-weight: bold;',
      warn: 'color: #ffaa00; font-weight: bold;',
      info: 'color: #0088ff; font-weight: bold;',
      debug: 'color: #888888;'
    };
    return styles[level] || '';
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemote || !this.config.apiEndpoint) return;

    try {
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': this.correlationId
        },
        body: JSON.stringify({
          source: 'frontend',
          ...entry
        })
      });
    } catch (error) {
      // Fallback to console if remote logging fails
      console.warn('Failed to send log to remote:', error);
    }
  }

  protected log(level: LogLevel, message: string, context: Record<string, any> = {}): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, context);
    
    this.addToLocalStorage(entry);
    this.logToConsole(entry);
    
    // Send to remote asynchronously
    this.sendToRemote(entry).catch(error => {
      console.warn('Remote logging failed:', error);
    });
  }

  // Public logging methods
  error(message: string, context: Record<string, any> = {}): void {
    this.log('error', message, context);
  }

  warn(message: string, context: Record<string, any> = {}): void {
    this.log('warn', message, context);
  }

  info(message: string, context: Record<string, any> = {}): void {
    this.log('info', message, context);
  }

  debug(message: string, context: Record<string, any> = {}): void {
    this.log('debug', message, context);
  }

  // Specialized logging methods
  logError(error: Error, context: Record<string, any> = {}): void {
    this.error(error.message, {
      name: error.name,
      stack: error.stack,
      ...context
    });
  }

  logUserAction(action: string, data: Record<string, any> = {}): void {
    this.info(`User Action: ${action}`, {
      action,
      userAction: true,
      ...data
    });
  }

  logPageView(page: string, data: Record<string, any> = {}): void {
    this.info(`Page View: ${page}`, {
      page,
      pageView: true,
      ...data
    });
  }

  logAPICall(endpoint: string, method: string, statusCode?: number, data: Record<string, any> = {}): void {
    const level = statusCode && statusCode >= 400 ? 'error' : 'info';
    this[level](`API Call: ${method} ${endpoint}`, {
      endpoint,
      method,
      statusCode,
      apiCall: true,
      ...data
    });
  }

  logComponentMount(componentName: string, data: Record<string, any> = {}): void {
    this.debug(`Component Mount: ${componentName}`, {
      componentName,
      componentMount: true,
      ...data
    });
  }

  logComponentError(componentName: string, error: Error, data: Record<string, any> = {}): void {
    this.error(`Component Error: ${componentName}`, {
      componentName,
      error: error.message,
      stack: error.stack,
      componentError: true,
      ...data
    });
  }

  // Performance logging
  startPerformanceMark(markName: string): void {
    if (!this.config.enablePerformanceLogging) return;
    this.performanceMarks.set(markName, performance.now());
  }

  endPerformanceMark(markName: string, context: Record<string, any> = {}): void {
    if (!this.config.enablePerformanceLogging) return;
    
    const startTime = this.performanceMarks.get(markName);
    if (startTime) {
      const duration = performance.now() - startTime;
      const level = duration > 1000 ? 'warn' : 'info';
      
      this[level](`Performance: ${markName}`, {
        markName,
        duration: `${duration.toFixed(2)}ms`,
        performance: true,
        ...context
      });
      
      this.performanceMarks.delete(markName);
    }
  }

  // Business event logging
  logBusinessEvent(event: string, data: Record<string, any> = {}): void {
    this.info(`Business Event: ${event}`, {
      event,
      businessEvent: true,
      ...data
    });
  }

  // Security event logging
  logSecurityEvent(event: string, level: LogLevel = 'warn', data: Record<string, any> = {}): void {
    this[level](`Security Event: ${event}`, {
      event,
      securityEvent: true,
      ...data
    });
  }

  // Get local logs
  getLocalLogs(): LogEntry[] {
    return [...this.localLogs];
  }

  // Clear local logs
  clearLocalLogs(): void {
    this.localLogs = [];
    try {
      localStorage.removeItem('frontend-logs');
    } catch (error) {
      console.warn('Failed to clear logs from localStorage:', error);
    }
  }

  // Load logs from localStorage
  loadStoredLogs(): void {
    try {
      const storedLogs = localStorage.getItem('frontend-logs');
      if (storedLogs) {
        const parsedLogs = JSON.parse(storedLogs);
        this.localLogs = [...parsedLogs, ...this.localLogs];
      }
    } catch (error) {
      console.warn('Failed to load logs from localStorage:', error);
    }
  }

  // Setup global error handlers
  private setupErrorHandlers(): void {
    // Handle unhandled errors
    window.addEventListener('error', (event) => {
      this.error('Unhandled Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        unhandledError: true
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise,
        unhandledPromiseRejection: true
      });
    });

    // Handle console errors (optional)
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.error('Console Error', {
        arguments: args,
        consoleError: true
      });
      originalConsoleError.apply(console, args);
    };
  }

  // Create child logger with additional context — shares this instance's state,
  // does NOT re-run constructor side effects (no new event listeners or session log).
  child(context: Record<string, any> = {}): FrontendLogger {
    const parent = this;
    // Create a minimal proxy object that delegates to the parent instance
    const childLogger = Object.create(parent) as FrontendLogger;

    // Override the protected log method to merge additional context
    childLogger.log = (level: LogLevel, message: string, additionalContext: Record<string, any> = {}) => {
      parent.log(level, message, { ...context, ...additionalContext });
    };

    return childLogger;
  }
}

// Create and export default logger instance
export const logger = new FrontendLogger({
  logLevel: import.meta.env.DEV ? 'debug' : 'info',
  enableConsole: true,
  enableRemote: true,
  enablePerformanceLogging: true
});

// Export the class for custom instances
export { FrontendLogger };

// Export helper function for React components
export const useLogger = (componentName: string) => {
  const componentLogger = logger.child({ component: componentName });
  
  return {
    ...componentLogger,
    logMount: (data?: Record<string, any>) => componentLogger.logComponentMount(componentName, data),
    logError: (error: Error, data?: Record<string, any>) => componentLogger.logComponentError(componentName, error, data),
    logAction: (action: string, data?: Record<string, any>) => componentLogger.logUserAction(`${componentName}: ${action}`, data),
    warn: (message: string, data?: Record<string, any>) => componentLogger.warn(message, { component: componentName, ...data }),
    info: (message: string, data?: Record<string, any>) => componentLogger.info(message, { component: componentName, ...data }),
    debug: (message: string, data?: Record<string, any>) => componentLogger.debug(message, { component: componentName, ...data })
  };
};