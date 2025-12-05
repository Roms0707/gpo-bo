import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Button from './Button';
import Card, { CardHeader, CardTitle, CardContent } from './Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-dark-400">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-error-900/20 rounded-full">
                  <AlertTriangle className="h-8 w-8 text-error-400" />
                </div>
                <CardTitle className="text-2xl">Something went wrong</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">
                We encountered an unexpected error while loading this page. This has been logged and we'll look into it.
              </p>

              {this.state.error && (
                <div className="bg-dark-200 border border-dark-100 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-error-400 mb-2">Error Details:</h3>
                  <p className="text-xs text-gray-400 font-mono break-all">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="bg-dark-200 border border-dark-100 rounded-lg p-4">
                  <summary className="text-sm font-semibold text-warning-400 cursor-pointer">
                    Stack Trace (Development Only)
                  </summary>
                  <pre className="text-xs text-gray-400 font-mono mt-2 overflow-auto max-h-64">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex items-center space-x-3 pt-4">
                <Button
                  onClick={this.handleReset}
                  leftIcon={<RefreshCw size={16} />}
                  variant="primary"
                >
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  leftIcon={<Home size={16} />}
                  variant="secondary"
                >
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
