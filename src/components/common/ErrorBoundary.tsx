import { Component, type ReactNode } from "react";

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

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="max-w-md text-center">
            <div className="text-4xl mb-4 text-danger">!</div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              An unexpected error occurred. Try refreshing the application.
            </p>
            {this.state.error && (
              <pre className="text-xs text-text-muted bg-bg-tertiary p-3 rounded-lg overflow-auto text-left max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-hover"
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
