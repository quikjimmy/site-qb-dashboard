const crypto = require('crypto');
const { SESSION_SECRET } = require('./config');

const COOKIE_NAME = 'qb_session';
const STATE_COOKIE = 'qb_oauth_state';
const ALG = 'aes-256-gcm';

function getKey() {
  if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters');
  }
  return crypto.createHash('sha256').update(SESSION_SECRET).digest();
}

function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALG, getKey(), iv);
  const pt = Buffer.from(JSON.stringify(obj), 'utf8');
  const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${ct.toString('base64url')}`;
}

function decrypt(token) {
  try {
    const [ivB64, tagB64, ctB64] = token.split('.');
    if (!ivB64 || !tagB64 || !ctB64) return null;
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const ct = Buffer.from(ctB64, 'base64url');
    const decipher = crypto.createDecipheriv(ALG, getKey(), iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return JSON.parse(pt.toString('utf8'));
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const name = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (name) out[name] = decodeURIComponent(value);
    }
  });
  return out;
}

function serializeCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
  parts.push(`Path=${opts.path || '/'}`);
  if (opts.httpOnly !== false) parts.push('HttpOnly');
  if (opts.secure !== false) parts.push('Secure');
  parts.push(`SameSite=${opts.sameSite || 'Lax'}`);
  return parts.join('; ');
}

function appendSetCookie(res, cookie) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) res.setHeader('Set-Cookie', cookie);
  else if (Array.isArray(existing)) res.setHeader('Set-Cookie', [...existing, cookie]);
  else res.setHeader('Set-Cookie', [existing, cookie]);
}

function getSession(req) {
  const raw = parseCookies(req)[COOKIE_NAME];
  return raw ? decrypt(raw) : null;
}

function setSession(res, session) {
  appendSetCookie(
    res,
    serializeCookie(COOKIE_NAME, encrypt(session), { maxAge: 60 * 60 * 24 * 90 })
  );
}

function clearSession(res) {
  appendSetCookie(res, serializeCookie(COOKIE_NAME, '', { maxAge: 0 }));
}

module.exports = {
  getSession,
  setSession,
  clearSession,
  parseCookies,
  serializeCookie,
  appendSetCookie,
  STATE_COOKIE,
};
