import { useState, useEffect } from 'react';
import { AddinPanel } from './components/AddinPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { connectToWorkspace, mockAPI, type WorkspaceAPI } from './workspace';
import { isCallbackUrl, handleCallback, getAccessToken, initiateAuth } from './auth';

type AppState =
  | { status: 'connecting' }
  | { status: 'ready'; api: WorkspaceAPI }
  | { status: 'auth-required' }
  | { status: 'error'; message: string };

export function App() {
  const [state, setState] = useState<AppState>({ status: 'connecting' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Handle OAuth callback first
      if (isCallbackUrl()) {
        try {
          await handleCallback();
        } catch {
          // Callback failed — fall through to auth-required
        }
      }

      // 1. Try to connect to the host Connect workspace API (works inside iframe)
      try {
        const api = await connectToWorkspace();
        if (!cancelled) setState({ status: 'ready', api });
        return;
      } catch {
        // Not inside Connect
      }

      // 2. Check for PKCE token (standalone with auth)
      const token = getAccessToken();
      if (token) {
        if (!cancelled) setState({ status: 'ready', api: mockAPI });
        return;
      }

      // 3. Dev mode — no client ID configured means we show mock UI directly
      const clientId = import.meta.env.VITE_TID_CLIENT_ID as string | undefined;
      if (!clientId) {
        if (!cancelled) setState({ status: 'ready', api: mockAPI });
        return;
      }

      if (!cancelled) setState({ status: 'auth-required' });
    })();

    return () => { cancelled = true; };
  }, []);

  if (state.status === 'connecting') {
    return (
      <div className="loading">
        <div className="spinner" />
        <span>Connecting…</span>
      </div>
    );
  }

  if (state.status === 'auth-required') {
    return (
      <div className="auth-screen">
        <div className="auth-logo">
          <i className="modus-icons-outlined">palette</i>
        </div>
        <h1>Color Coding</h1>
        <p>Sign in with your Trimble account to get started.</p>
        <button className="btn primary" onClick={() => initiateAuth().catch(console.error)}>
          Sign in with Trimble
        </button>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="auth-screen">
        <p style={{ color: '#da212c' }}>{state.message}</p>
      </div>
    );
  }

  const resetAll = async () => {
    await state.api.viewer.resetAllObjectState();
    // Remount QuickColor by toggling key — simplest reset
    window.location.reload();
  };

  return (
    <ErrorBoundary>
      <AddinPanel api={state.api} onReset={resetAll} />
    </ErrorBoundary>
  );
}
