import { useState } from 'react';

import { Button } from '@/ui/button';
import { Notice } from '@/ui/notice';

function ServerLoginScreen({
  auth,
  isLoggingIn = false,
  loginError = null,
  onLogin,
}) {
  const [password, setPassword] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!password.trim() || !onLogin) {
      return;
    }
    try {
      await onLogin(password);
      setPassword('');
    } catch {
      // Leave the entered password in place so the user can correct and retry.
    }
  };

  return (
    <main className="tw flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-[460px] rounded-lg border border-border bg-surface p-8 shadow-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Server Access</p>
            <h1 className="mt-1 text-2xl font-bold">Sign in to Stock Scanner</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Server mode now requires an authenticated browser session before protected API routes are available.
            </p>
          </div>

          {!auth?.configured && (
            <Notice tone="warning">
              {auth?.message || 'Server authentication is required but not configured.'}
            </Notice>
          )}

          {loginError && <Notice tone="error">{loginError}</Notice>}

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Server password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isLoggingIn || !auth?.configured}
              autoComplete="current-password"
              className="h-11 w-full rounded-md border border-border bg-surface px-3 font-[inherit] text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
          </label>

          <Button
            type="submit"
            disabled={isLoggingIn || !auth?.configured || !password.trim()}
            className="h-11"
            aria-busy={isLoggingIn || undefined}
          >
            {isLoggingIn ? (
              <>
                <span aria-hidden="true" className="inline-block size-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />
                <span className="sr-only">Signing in</span>
              </>
            ) : 'Sign in'}
          </Button>
        </form>
      </div>
    </main>
  );
}

export default ServerLoginScreen;
