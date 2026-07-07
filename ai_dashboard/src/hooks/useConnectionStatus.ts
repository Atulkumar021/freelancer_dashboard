import { useState, useEffect, useCallback } from 'react';
import { getCompanyId } from '@/lib/api';

export type ConnLevel = 'connected' | 'degraded' | 'offline' | 'loading';

export interface ConnectionStatus {
  backend:   ConnLevel;
  tally:     ConnLevel;
  lastSync:  string | null;
  syncAge:   number | null;
  checking:  boolean;
  refresh:   () => void;
}

const BACKEND_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const POLL_MS     = 15_000;

function ageSuffix(seconds: number | null): string | null {
  if (seconds == null) return null;
  if (seconds < 60)   return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function useConnectionStatus(): ConnectionStatus {
  const [backend,  setBackend]  = useState<ConnLevel>('loading');
  const [tally,    setTally]    = useState<ConnLevel>('loading');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncAge,  setSyncAge]  = useState<number | null>(null);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    setChecking(true);

    let backendOk = false;
    try {
      const r = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(4000) });
      backendOk = r.ok;
      setBackend(backendOk ? 'connected' : 'degraded');
    } catch {
      setBackend('offline');
    }

    if (backendOk) {
      const cid = getCompanyId();
      if (!cid) {
        setTally('offline');
        setSyncAge(null);
        setLastSync(null);
        setChecking(false);
        return;
      }
      try {
        const r = await fetch(`${BACKEND_URL}/api/tally/status/${cid}`, {
          signal: AbortSignal.timeout(4000),
        });
        if (r.ok) {
          const data = await r.json();
          const age = data.secondsSinceLastSync as number | null;
          setSyncAge(age);
          setLastSync(ageSuffix(age));

          if (age != null) {
            if (age < 300)  setTally('connected');
            else if (age < 1800) setTally('degraded');
            else setTally('offline');
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
