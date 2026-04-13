const { clearSession } = require('../../lib/session');

module.exports = (req, res) => {
  clearSession(res);
  res.statusCode = 302;
  res.setHeader('Location', '/');
  res.end();
};
