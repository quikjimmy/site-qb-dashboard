const { getSession } = require('../lib/session');
const { getRecord, setRecord } = require('../lib/commissionStore');

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const REP_RE = /^[A-Za-z0-9 _.\-&':()/]{1,80}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

module.exports = async (req, res) => {
  const session = getSession(req);
  if (!session) { res.statusCode = 401; return res.end(); }

  if (req.method === 'GET') {
    const u = new URL(req.url, `https://${req.headers.host}`);
    const rep = u.searchParams.get('rep') || '';
    const month = u.searchParams.get('month') || '';
    if (!REP_RE.test(rep) || !MONTH_RE.test(month)) {
      res.statusCode = 400; return res.end('Invalid rep or month');
    }
    try {
      const record = await getRecord(rep, month);
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(record));
    } catch (e) {
      res.statusCode = 500; return res.end('Storage read failed: ' + (e.message || e));
    }
  }

  if (req.method === 'POST') {
    let body;
    try { body = JSON.parse(await readBody(req) || '{}'); } catch { res.statusCode = 400; return res.end('Invalid JSON'); }
    const { rep, month, rate, deductions } = body;
    if (!REP_RE.test(rep || '') || !MONTH_RE.test(month || '')) {
      res.statusCode = 400; return res.end('Invalid rep or month');
    }
    const cleanRate = rate == null || rate === '' ? null : Number(rate);
    if (cleanRate != null && (Number.isNaN(cleanRate) || cleanRate < 0 || cleanRate > 100)) {
      res.statusCode = 400; return res.end('Rate must be 0-100');
    }
    const cleanDeductions = (Array.isArray(deductions) ? deductions : []).map(d => ({
      id: String(d.id || '').slice(0, 40),
      label: String(d.label || '').slice(0, 80),
      amount: Number(d.amount) || 0,
    })).filter(d => d.id && d.label);
    try {
      const saved = await setRecord(rep, month, { rate: cleanRate, deductions: cleanDeductions });
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(saved));
    } catch (e) {
      res.statusCode = 500; return res.end('Storage write failed: ' + (e.message || e));
    }
  }

  res.statusCode = 405;
  res.end();
};
