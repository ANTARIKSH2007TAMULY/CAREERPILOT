import { AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import React from 'react';
import BrandLogo from './BrandLogo';
import Button from './Button';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CareerPilot Uncaught Render Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F5F7FC] dark:bg-navy-950 p-6 text-slate-900 dark:text-slate-100">
          <div className="max-w-md w-full rounded-3xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-850 p-8 shadow-2xl text-center">
            <div className="flex justify-center mb-6">
              <BrandLogo size="md" />
            </div>

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
              <AlertCircle className="h-7 w-7" />
            </div>

            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
              Something went wrong
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              An unexpected render error occurred in this view. Your session and data remain safe.
            </p>

            {this.state.error?.message ? (
              <div className="mt-4 rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-900 p-3 text-left font-mono text-[11px] text-slate-600 dark:text-slate-400 overflow-x-auto">
                {this.state.error.message}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                onClick={() => window.location.reload()}
                icon={RefreshCw}
              >
                Reload Page
              </Button>
              <Button
                variant="secondary"
                onClick={this.handleReset}
                icon={ArrowLeft}
              >
                Return Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
