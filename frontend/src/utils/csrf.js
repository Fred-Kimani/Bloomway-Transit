let cachedToken = null;
let inflight = null;

async function fetchCsrfToken() {
  if (cachedToken) return cachedToken;
  if (inflight) return inflight;

  inflight = fetch('/api/admin/csrf-token', {
    method: 'GET',
    credentials: 'include',
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      const data = await res.json();
      cachedToken = data && data.csrfToken ? data.csrfToken : null;
      return cachedToken;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export async function csrfFetch(url, options = {}) {
  const opts = { ...options };
  const headers = { ...(opts.headers || {}) };

  opts.credentials = opts.credentials || 'include';
  const method = (opts.method || 'GET').toUpperCase();

  // Always try to include a CSRF token when available
  if (url !== '/api/admin/csrf-token') {
    try {
      const token = await fetchCsrfToken();
      if (token) headers['X-CSRF-Token'] = token;
    } catch (e) {
      // For GET requests, allow without token. For mutations, the server will reject.
    }
  }

  opts.headers = headers;

  let res = await fetch(url, opts);

  // If token is stale, retry once for non-GET requests
  if (res.status === 403 && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    cachedToken = null;
    try {
      const token = await fetchCsrfToken();
      if (token) {
        opts.headers = { ...(opts.headers || {}), 'X-CSRF-Token': token };
        res = await fetch(url, opts);
      }
    } catch (e) {
      // fall through
    }
  }

  return res;
}

export function clearCsrfToken() {
  cachedToken = null;
}
