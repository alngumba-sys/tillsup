import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Filter out Figma platform errors
    if (error.message?.includes('Failed to fetch') && 
        error.stack?.includes('devtools_worker')) {
      console.log('Ignoring Figma platform fetch error');
      // Don't show UI for Figma internal errors
      return;
    }
    
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <Alert className="max-w-2xl border-red-200 bg-white">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-lg font-semibold text-red-900 mb-2">
              Something went wrong
            </AlertTitle>
            <AlertDescription>
              <div className="space-y-4">
                <p className="text-sm text-slate-700">
                  The application encountered an unexpected error. This has been logged for investigation.
                </p>
                
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                  <p className="text-xs font-mono text-slate-800 break-all">
                    {this.state.error.message || 'Unknown error'}
                  </p>
                </div>

                {this.state.errorInfo && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-slate-600 hover:text-slate-900">
                      Technical Details
                    </summary>
                    <pre className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-md overflow-auto max-h-64 text-[10px]">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-[#00719C] hover:bg-[#00719C]/90"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Application
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}
