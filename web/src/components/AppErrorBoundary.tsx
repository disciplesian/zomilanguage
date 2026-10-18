import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

import { reportProblem } from '@/lib/problems';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Catches render crashes, reports them (privacy-safe) and offers a reload. */
class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const component = info.componentStack?.match(/at (\w+)/)?.[1] ?? '';
    reportProblem('crash', `${error.name}: ${error.message}${component ? ` in ${component}` : ''}`);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#05070d] px-6 text-center text-white">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-sm text-white/60">
          Sorry about that. Reloading usually fixes it. Your history is safe.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#00f0ff] px-5 py-2.5 text-sm font-semibold text-black transition-transform active:scale-95"
        >
          <RotateCcw className="h-4 w-4" />
          Reload
        </button>
      </main>
    );
  }
}

export default AppErrorBoundary;
