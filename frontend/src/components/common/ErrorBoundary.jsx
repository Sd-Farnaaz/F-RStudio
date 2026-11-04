import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-border-color shadow-sm p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-rose-tint text-primary-rose flex items-center justify-center mx-auto shadow-2xs">
              <AlertCircle className="w-7 h-7" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-serif font-bold text-deep-plum text-xl">
                Something didn't load quite right
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                We encountered an unexpected error while displaying this page. Your account and booking data are completely secure.
              </p>
              {this.state.error?.message && (
                <div className="p-3 bg-ivory/80 rounded-xl border border-border-color font-mono text-[11px] text-danger/80 break-all text-left">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-5 py-2.5 bg-primary-rose text-white text-xs font-semibold rounded-xl hover:bg-primary-rose/90 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.assign('/my-bookings')}
                className="px-5 py-2.5 bg-white border border-border-color text-deep-plum text-xs font-semibold rounded-xl hover:bg-ivory transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
