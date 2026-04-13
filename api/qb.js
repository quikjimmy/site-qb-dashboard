const { getSession } = require('../lib/session');
const { apiBase, ensureFreshSession } = require('../lib/qb');

const ALLOW = [/^\/query$/, /^\/reports\/[A-Za-z]+$/];

module.exports = async (req, res) => {
  let session = getSession(req);
  if (!session) {
    res.statusCode = 401;
    return res.end();
  }
  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end();
  }

  const u = new URL(req.url, `https://${req.headers.host}`);
  const prefix = '/api/qb';
  const subPath = u.pathname.startsWith(prefix) ? u.pathname.slice(prefix.length) : '/';
  if (!ALLOW.some(r => r.test(subPath))) {
    res.statusCode = 403;
    return res.end('Path not allowed');
  }

  try {
    session = await ensureFreshSession(res, session);
  } catch {
    res.statusCode = 401;
    return res.end('Session expired');
  }

  u.searchParams.delete('path');
  const qs = u.searchParams.toString();
  const target = apiBase() + session.realmId + subPath + (qs ? '?' + qs : '');

  const upstream = await fetch(target, {
    headers: {
      'Authorization': 'Bearer ' + session.access_token,
      'Accept': 'application/json',
    },
  });
  const body = await upstream.text();
  res.statusCode = upstream.status;
  res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
  res.end(body);
};
