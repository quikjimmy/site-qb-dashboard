const crypto = require('crypto');
const { serializeCookie, appendSetCookie, STATE_COOKIE } = require('../../lib/session');
const { QB_CLIENT_ID, QB_REDIRECT_URI } = require('../../lib/config');

module.exports = (req, res) => {
  const clientId = QB_CLIENT_ID;
  const redirectUri = QB_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    res.statusCode = 500;
    return res.end('Server misconfigured: QB_CLIENT_ID / QB_REDIRECT_URI missing');
  }

  const state = crypto.randomBytes(16).toString('hex');
  appendSetCookie(res, serializeCookie(STATE_COOKIE, state, { maxAge: 600 }));

  const url = new URL('https://appcenter.intuit.com/connect/oauth2');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', 'com.intuit.quickbooks.accounting');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);

  res.statusCode = 302;
  res.setHeader('Location', url.toString());
  res.end();
};
