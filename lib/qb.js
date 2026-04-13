const { setSession } = require('./session');
const { QB_CLIENT_ID, QB_CLIENT_SECRET, QB_ENV } = require('./config');

const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

function apiBase() {
  return QB_ENV === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com/v3/company/'
    : 'https://quickbooks.api.intuit.com/v3/company/';
}

function basicAuth() {
  if (!QB_CLIENT_ID || !QB_CLIENT_SECRET) throw new Error('QB_CLIENT_ID / QB_CLIENT_SECRET not set');
  return 'Basic ' + Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64');
}

async function exchangeCode(code, redirectUri) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': basicAuth(),
    },
    body: `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function refreshTokens(refreshToken) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': basicAuth(),
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });
  if (!res.ok) throw new Error(`Refresh failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function ensureFreshSession(res, session) {
  if (Date.now() < session.expires_at - 60000) return session;
  const data = await refreshTokens(session.refresh_token);
  const next = {
    ...session,
    access_token: data.access_token,
    refresh_token: data.refresh_token || session.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  setSession(res, next);
  return next;
}

module.exports = { apiBase, exchangeCode, refreshTokens, ensureFreshSession };
