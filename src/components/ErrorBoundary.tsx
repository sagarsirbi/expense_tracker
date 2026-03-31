import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { logger } from '../services/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { componentName = 'Unknown Component' } = this.props;

    // Use a safe subset of props to avoid leaking non-serializable values
    const safeProps = {
      componentName,
      hasFallback: Boolean(this.props.fallback),
    };

    // Log the error with detailed context
    logger.logComponentError(componentName, error, {
      errorInfo: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        props: safeProps,
        timestamp: new Date().toISOString()
      }
    });

    this.setState({
      error,
      errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      const { fallback, componentName = 'Component' } = this.props;
      
      if (fallback) {
        return fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-content">
            <h2>⚠️ Something went wrong</h2>
            <p>An error occurred in the {componentName}. Please try refreshing the page.</p>
            <details style={{ marginTop: '20px' }}>
              <summary>Technical Details (for developers)</summary>
              <div style={{ 
                background: '#f5f5f5', 
                padding: '10px', 
                margin: '10px 0', 
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                <strong>Error:</strong> {this.state.error?.message}<br/>
                <strong>Stack:</strong> {this.state.error?.stack}
              </div>
            </details>
            <button 
              onClick={() => {
                logger.logUserAction('Error Boundary Retry', { 
                  componentName,
                  error: this.state.error?.message
                });
                this.setState({ hasError: false, error: undefined, errorInfo: undefined });
              }}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;