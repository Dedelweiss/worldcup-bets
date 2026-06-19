"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm">
          <p className="font-medium text-destructive">
            {this.state.error.message || "Une erreur inattendue s'est produite."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={this.reset}
          >
            Réessayer
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
