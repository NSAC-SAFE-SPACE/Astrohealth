import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTH_LOGOUT_EVENT, clearSession, getSessionMatricule } from '../features/auth/auth';

function makeStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  };
}

describe('déconnexion Astrohealth', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('efface le matricule de session et l’éventuelle ancienne copie locale', () => {
    const sessionStorage = makeStorage({ 'astrohealth.sessionMatricule': 'ASTRO-A' });
    const localStorage = makeStorage({ 'astrohealth.sessionMatricule': 'ASTRO-A' });
    const dispatchEvent = vi.fn();
    vi.stubGlobal('window', { sessionStorage, localStorage, dispatchEvent });
    vi.stubGlobal('BroadcastChannel', undefined);
    vi.stubGlobal('Event', class { constructor(public type: string) {} });

    expect(getSessionMatricule()).toBe('ASTRO-A');
    clearSession();

    expect(Object.fromEntries(sessionStorage.values)).toEqual({});
    expect(Object.fromEntries(localStorage.values)).toEqual({});
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: AUTH_LOGOUT_EVENT }));
  });
});
