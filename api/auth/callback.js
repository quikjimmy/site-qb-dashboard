const {
  setSession,
  parseCookies,
  serializeCookie,
  appendSetCookie,
  STATE_COOKIE,
} = require('../../lib/session');
const { exchangeCode } = require('../../lib/qb');
const { QB_REDIRECT_URI } = require('../../lib/config');

module.exports = async (req, res) => {
  const u = new URL(req.url, `https://${req.headers.host}`);
  const code = u.searchParams.get('code');
  const realmId = u.searchParams.get('realmId');
  const state = u.searchParams.get('state');
  const err = u.searchParams.get('error');

  const cookies = parseCookies(req);
  const expected = cookies[STATE_COOKIE];
  appendSetCookie(res, serializeCookie(STATE_COOKIE, '', { maxAge: 0 }));

  if (err) {
    res.statusCode = 400;
    return res.end('OAuth error: ' + err);
  }
  if (!code || !realmId || !state || state !== expected) {
    res.statusCode = 400;
    return res.end('Invalid OAuth callback');
  }

  try {
    const data = await exchangeCode(code, QB_REDIRECT_URI);
    setSession(res, {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
      realmId,
    });
    res.statusCode = 302;
    res.setHeader('Location', '/');
    res.end();
  } catch (e) {
    res.statusCode = 500;
    res.end('Token exchange failed: ' + e.message);
  }
};
