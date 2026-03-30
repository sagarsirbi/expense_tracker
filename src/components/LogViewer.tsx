import { useState, useEffect } from 'react';
import { useLogger } from '../services/logger';
import { RefreshCw, Download, Filter, AlertCircle, Info, AlertTriangle, Bug } from 'lucide-react';
import './LogViewer.css';
import './LogViewer.utils.css';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  service?: string;
  correlationId?: string;
  [key: string]: any;
}

export function LogViewer() {
  const componentLogger = useLogger('LogViewer');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    componentLogger.logMount();
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      componentLogger.info('Loading logs from API');
      
      const response = await fetch('http://localhost:3001/api/logs?limit=100');
      const data = await response.json();
      
      if (data.logs) {
        setLogs(data.logs);
        componentLogger.info('Logs loaded successfully', { count: data.logs.length });
      }
    } catch (error) {
      componentLogger.logError(error as Error, { action: 'loadLogs' });
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadLogs = () => {
    componentLogger.logAction('Download Logs');
    
    const logsText = logs.map((log: LogEntry) => 
      `${log.timestamp} [${log.level.toUpperCase()}] ${log.message} ${JSON.stringify(log, null, 2)}`
    ).join('\n');
    
    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-tracker-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((log: LogEntry) => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warn': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      case 'debug': return <Bug className="w-4 h-4 text-gray-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="logs-viewer">
      <div className="controls-section">
        <h2>📋 Application Logs</h2>
        
        {/* Controls */}
        <div className="filter-controls">
          <button
            onClick={loadLogs}
            disabled={loading}
            className="btn-primary"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={downloadLogs}
            className="btn-success"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              title="Filter logs by level"
            >
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="log-stats">
          Showing {filteredLogs.length} of {logs.length} log entries
        </div>
      </div>

      {/* Log Entries */}
      <div className="log-container">
        {filteredLogs.length === 0 ? (
          <div className={`empty-state ${loading ? 'loading' : ''}`}>
            {loading ? 'Loading logs...' : 'No logs found'}
          </div>
        ) : (
          filteredLogs.map((log: LogEntry, index: number) => (
            <div
              key={index}
              className={`log-entry log-${log.level}`}
            >
              <div className="log-entry-content">
                <div className="log-icon">
                  {getLevelIcon(log.level)}
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
                  
                  {Object.keys(log).filter(key => 
                    !['timestamp', 'level', 'message', 'correlationId'].includes(key)
                  ).length > 0 && (
                    <div className="log-details-expandable">
                      <details>
                        <summary className="log-details-summary">
                          Show details
                        </summary>
                        <div className="log-details-content">
                          {JSON.stringify(
                            Object.fromEntries(
                              Object.entries(log).filter(([key]) => 
                                !['timestamp', 'level', 'message', 'correlationId'].includes(key)
                              )
                            ), 
                            null, 
                            2
                          )}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}