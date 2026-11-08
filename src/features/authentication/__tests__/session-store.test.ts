import type { Session } from '@supabase/supabase-js';

import { selectCanEnterApp, useSessionStore } from '../session-store';

const fakeSession = { access_token: 'token', user: { id: 'user-1' } } as unknown as Session;

beforeEach(() => {
  useSessionStore.setState({
    status: 'initializing',
    session: null,
    passwordResetInProgress: false,
    celebration: null,
  });
});

describe('session store', () => {
  it('starts initializing and resolves to signed in or out', () => {
    expect(useSessionStore.getState().status).toBe('initializing');

    useSessionStore.getState().setSession(fakeSession);
    expect(useSessionStore.getState().status).toBe('signedIn');

    useSessionStore.getState().setSession(null);
    expect(useSessionStore.getState().status).toBe('signedOut');
  });

  it('keeps a password-reset session out of the app until the new password is saved', () => {
    const store = useSessionStore.getState();
    store.beginPasswordReset();
    store.setSession(fakeSession);
    expect(selectCanEnterApp(useSessionStore.getState())).toBe(false);

    useSessionStore.getState().endPasswordReset();
    expect(selectCanEnterApp(useSessionStore.getState())).toBe(true);
  });

  it('clears transient flags when the session ends', () => {
    const store = useSessionStore.getState();
    store.setSession(fakeSession);
    store.queueCelebration('account');
    store.beginPasswordReset();

    useSessionStore.getState().setSession(null);
    expect(useSessionStore.getState().celebration).toBeNull();
    expect(useSessionStore.getState().passwordResetInProgress).toBe(false);
  });
});
