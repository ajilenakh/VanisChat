import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ChatPage error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
              <p className="text-sm text-gray-600 mb-4">{this.state.error?.message}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                Reload
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
