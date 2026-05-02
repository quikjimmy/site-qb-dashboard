const { getSession } = require('../lib/session');
const { getRecord, setRecord, listRecords } = require('../lib/commissionStore');

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

const REP_RE = /^[A-Za-z0-9 _.\-&':()/]{1,80}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

function num(v) { return v == null || v === '' ? null : (Number.isFinite(Number(v)) ? Number(v) : null); }

module.exports = async (req, res) => {
  const session = getSession(req);
  if (!session) { res.statusCode = 401; return res.end(); }

  const u = new URL(req.url, `https://${req.headers.host}`);

  if (req.method === 'GET') {
    if (u.searchParams.get('list') === '1') {
      try {
        const items = await listRecords();
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ items }));
      } catch (e) {
        res.statusCode = 500; return res.end('Storage list failed: ' + (e.message || e));
      }
    }
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
    const { rep, month, rate, ccRate, warrantyRate, status, overrides, deductions } = body;
    if (!REP_RE.test(rep || '') || !MONTH_RE.test(month || '')) {
      res.statusCode = 400; return res.end('Invalid rep or month');
    }
    const cleanRate = num(rate);
    if (cleanRate != null && (cleanRate < 0 || cleanRate > 100)) {
      res.statusCode = 400; return res.end('Rate must be 0-100');
    }
    const cleanCcRate = num(ccRate);
    if (cleanCcRate != null && (cleanCcRate < 0 || cleanCcRate > 100)) {
      res.statusCode = 400; return res.end('CC rate must be 0-100');
    }
    const cleanWarrantyRate = num(warrantyRate);
    if (cleanWarrantyRate != null && (cleanWarrantyRate < 0 || cleanWarrantyRate > 100)) {
      res.statusCode = 400; return res.end('Warranty rate must be 0-100');
    }
    const cleanStatus = status === 'final' ? 'final' : 'draft';
    const cleanOverrides = {
      tax: num(overrides?.tax),
      ccFee: num(overrides?.ccFee),
      warranty: num(overrides?.warranty),
      shipping: num(overrides?.shipping),
    };
    const cleanDeductions = (Array.isArray(deductions) ? deductions : []).map(d => ({
      id: String(d.id || '').slice(0, 40),
      label: String(d.label || '').slice(0, 80),
      amount: num(d.amount) || 0,
    })).filter(d => d.id && d.label);
    try {
      const saved = await setRecord(rep, month, {
        rate: cleanRate,
        ccRate: cleanCcRate,
        warrantyRate: cleanWarrantyRate,
        status: cleanStatus,
        overrides: cleanOverrides,
        deductions: cleanDeductions,
      });
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(saved));
    } catch (e) {
      res.statusCode = 500; return res.end('Storage write failed: ' + (e.message || e));
    }
  }

  res.statusCode = 405;
  res.end();
};
