import React from 'react';
import './LogViewer.css';
import './LogViewer.utils.css';

// Demo component to showcase the log viewer styling
export function LogViewerDemo() {
  const sampleLogs = [
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Application started successfully',
      service: 'expense-tracker-api',
      correlationId: 'abc123-def456-ghi789',
      metadata: { port: 3001, environment: 'development' }
    },
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      level: 'warn',
      message: 'Database connection pool is running low',
      service: 'expense-tracker-api',
      correlationId: 'xyz789-uvw456-rst123',
      metadata: { poolSize: 5, activeConnections: 4 }
    },
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      level: 'error',
      message: 'Failed to validate expense data',
      service: 'expense-tracker-api',
      correlationId: 'err456-fail789-bad123',
      metadata: { 
        error: 'ValidationError',
        field: 'amount',
        value: 'invalid',
        stackTrace: 'at validateExpense (expense.js:42)'
      }
    },
    {
      timestamp: new Date(Date.now() - 180000).toISOString(),
      level: 'debug',
      message: 'Processing expense calculation',
      service: 'expense-tracker-api',
      correlationId: 'debug123-calc456-proc789',
      metadata: { 
        expenseId: 'exp-123',
        category: 'Food',
        amount: 24.50,
        calculations: { tax: 2.45, total: 26.95 }
      }
    }
  ];

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return '🚨';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🐛';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="logs-viewer">
      <div className="controls-section">
        <h2>🎨 Log Viewer Style Demo</h2>
        
        <div className="filter-controls">
          <button className="btn-primary">
            <span>🔄</span>
            Refresh
          </button>
          
          <button className="btn-success">
            <span>📥</span>
            Download
          </button>
          
          <div className="flex items-center gap-2">
            <span>🔍</span>
            <select title="Filter logs by level">
              <option value="all">All Levels</option>
              <option value="error">Errors</option>
              <option value="warn">Warnings</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>
          
          <input
            type="text"
            placeholder="Search logs..."
            defaultValue=""
          />
        </div>
        
        <div className="log-stats">
          Showing {sampleLogs.length} of {sampleLogs.length} log entries
        </div>
      </div>

      <div className="log-container">
        {sampleLogs.map((log, index) => (
          <div
            key={index}
            className={`log-entry log-${log.level}`}
          >
            <div className="log-entry-content">
              <div className="log-icon">
                <span style={{ fontSize: '1.2rem' }}>{getLevelIcon(log.level)}</span>
              </div>
              
              <div className="log-details">
                <div className="log-header">
                  <span className="log-timestamp">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span className={`log-level-badge ${log.level}`}>
                    {log.level}
                  </span>
                  {log.correlationId && (
                    <span className="log-correlation-id">
                      ID: {log.correlationId.substring(0, 8)}
                    </span>
                  )}
                </div>
                
                <div className="log-message">
                  {log.message}
                </div>
                
                {log.metadata && (
                  <div className="log-details-expandable">
                    <details>
                      <summary className="log-details-summary">
                        Show details
                      </summary>
                      <div className="log-details-content">
                        {JSON.stringify(log.metadata, null, 2)}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}