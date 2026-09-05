import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  readonly label: string;
  readonly children: ReactNode;
}

interface State {
  readonly message: string | null;
}

/**
 * Catches a remote that loaded but then threw while rendering. Load failures are handled before
 * this point; this covers the other half of "the shell stays alive" (F9) — a remote whose UI blows
 * up must not take the navigation and the session controls with it.
 */
export class RemoteErrorBoundary extends Component<Props, State> {
  override state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      `[shell] ${this.props.label} crashed while rendering`,
      error,
      info.componentStack
    );
  }

  override render(): ReactNode {
    if (this.state.message === null) {
      return this.props.children;
    }

    return (
      <div className="shell-panel shell-panel--failed" role="alert">
        <h2>{this.props.label} stopped responding</h2>
        <p>
          The panel crashed while rendering. The rest of the suite is unaffected — navigation, the
          display currency and the other application are still live.
        </p>
        <pre>{this.state.message}</pre>
      </div>
    );
  }
}
