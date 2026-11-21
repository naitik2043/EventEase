const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function currentToken() {
  return sessionStorage.getItem('eventease_token') || '';
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (currentToken()) {
    headers.set('Authorization', `Bearer ${currentToken()}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== 'string' && !(options.body instanceof FormData)
      ? JSON.stringify(options.body)
      : options.body
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    const error = new Error(payload.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

export function saveSession(data) {
  sessionStorage.setItem('eventease_token', data.token);
  sessionStorage.setItem('eventease_user', JSON.stringify(data.user));
}

export function clearSession() {
  sessionStorage.removeItem('eventease_token');
  sessionStorage.removeItem('eventease_user');
}

export function getSession() {
  try {
    return {
      token: currentToken(),
      user: JSON.parse(sessionStorage.getItem('eventease_user') || 'null')
    };
  } catch {
    clearSession();
    return { token: '', user: null };
  }
}
