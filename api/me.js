const { getSession } = require('../lib/session');

module.exports = (req, res) => {
  const s = getSession(req);
  if (!s) {
    res.statusCode = 401;
    return res.end();
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ realmId: s.realmId }));
};
