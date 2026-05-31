/**
 * Auth diagnostics - helps debug 401 and other Firebase Auth issues.
 * Call from Login/SignUp when auth fails to get more details.
 */
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

export async function testAuthConnection(): Promise<{ ok: boolean; error?: string; details?: string }> {
  if (!API_KEY || !PROJECT_ID) {
    return { ok: false, error: 'Missing API key or project ID in .env' };
  }

  try {
    // Try sign-up with a test email - we expect it to fail with "email exists" or "invalid" but NOT 401
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'auth-test-' + Date.now() + '@vibeup-test.invalid',
          password: 'testpassword123',
          returnSecureToken: true,
        }),
      }
    );

    const data = await res.json().catch(() => ({}));

    if (res.status === 401) {
      const errMsg = data?.error?.message || data?.message || 'Unauthorized';
      return {
        ok: false,
        error: 'API key rejected (401)',
        details: `Identity Toolkit API returned: ${errMsg}. This usually means: 1) API key has HTTP referrer restrictions - add http://localhost:3000/* in Google Cloud Console → Credentials → your key → Application restrictions. 2) Identity Toolkit API is not enabled - enable it in Google Cloud Console → APIs & Services → Enable APIs.`,
      };
    }

    if (res.status === 400) {
      // 400 is expected for invalid email - means API key works
      return { ok: true };
    }

    if (res.ok) {
      return { ok: true };
    }

    return {
      ok: false,
      error: `HTTP ${res.status}`,
      details: JSON.stringify(data).slice(0, 200),
    };
  } catch (err) {
    return {
      ok: false,
      error: 'Network error',
      details: err instanceof Error ? err.message : String(err),
    };
  }
}

export function getAuthDiagnosticsHelp(): string {
  return `Firebase 401 fix:
1. Enable Identity Toolkit API: https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=${PROJECT_ID}
2. Check API key: https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}
3. Click your Web API key (starts with AIza...)
4. Application restrictions: set to "None" OR add http://localhost:3000/* and http://127.0.0.1:3000/*
5. API restrictions: "Don't restrict key" OR ensure "Identity Toolkit API" is allowed
6. Save and wait 1-2 minutes`;
}
