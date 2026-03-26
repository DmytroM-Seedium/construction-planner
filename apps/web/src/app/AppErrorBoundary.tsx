import React from "react";
import { ErrorPage } from "@/pages/error/ErrorPage";

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
  returnPath: string | null;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, returnPath: null };

  static getDerivedStateFromError(error: Error): State {
    const returnPath =
      typeof window !== "undefined" ? window.location.pathname : "/";
    return { error, returnPath };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("Unhandled UI error", error);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorPage
          inline={{
            message: this.state.error.message,
            stack: this.state.error.stack,
            returnPath: this.state.returnPath ?? "/",
          }}
        />
      );
    }
    return this.props.children;
  }
}

