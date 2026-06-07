import { useState, useEffect, useCallback } from 'react';

export type ConnLevel = 'connected' | 'degraded' | 'offline' | 'loading';

export interface ConnectionStatus {
  backend:   ConnLevel;
  tally:     ConnLevel;
  lastSync:  string | null;   // "2 min ago" style label
  syncAge:   number | null;   // seconds
  checking:  boolean;
  refresh:   () => void;
}

const BACKEND_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const COMPANY_ID  = 'cmp_001';
const POLL_MS     = 15_000;

function ageSuffix(seconds: number | null): string | null {
  if (seconds == null) return null;
  if (seconds < 60)   return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function useConnectionStatus(): ConnectionStatus {
  const [backend, setBackend]   = useState<ConnLevel>('loading');
  const [tally,   setTally]     = useState<ConnLevel>('loading');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncAge,  setSyncAge]  = useState<number | null>(null);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    setChecking(true);

    // 1. Backend health
    let backendOk = false;
    try {
      const r = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(4000) });
      backendOk = r.ok;
      setBackend(backendOk ? 'connected' : 'degraded');
    } catch {
      setBackend('offline');
    }

    // 2. Tally agent status (only if backend is up)
    if (backendOk) {
      try {
        const r = await fetch(`${BACKEND_URL}/api/tally/status/${COMPANY_ID}`, {
          signal: AbortSignal.timeout(4000),
        });
        if (r.ok) {
          const data = await r.json();
          const age = data.secondsSinceLastSync as number | null;
          setSyncAge(age);
          setLastSync(ageSuffix(age));

          if (data.agentConnected) {
            // Agent is live; classify tally status by sync age
            setTally(age != null && age < 60 ? 'connected' : 'degraded');
          } else {
            setTally('offline');
          }
        } else {
          setTally('offline');
          setSyncAge(null);
          setLastSync(null);
        }
      } catch {
        setTally('offline');
        setSyncAge(null);
        setLastSync(null);
      }
    } else {
      setTally('offline');
      setSyncAge(null);
      setLastSync(null);
    }

    setChecking(false);
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_MS);
    return () => clearInterval(id);
  }, [check]);

  return { backend, tally, lastSync, syncAge, checking, refresh: check };
}
