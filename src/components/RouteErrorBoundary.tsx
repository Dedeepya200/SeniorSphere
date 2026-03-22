import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

class RouteErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Route render failed", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-lg border border-destructive/20 bg-card p-6 shadow-sm">
          <h2 className="text-senior-xl font-bold text-foreground">Something went wrong</h2>
          <p className="mt-2 text-senior-base text-muted-foreground">
            The page failed to render after reload. The app shell is still running.
          </p>
          <p className="mt-3 rounded-md bg-muted px-3 py-2 font-mono text-sm text-foreground">
            {this.state.error.message || "Unknown render error"}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-4 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
