const { put, get } = require('@vercel/blob');

const BLOB_PATH = 'commission/data.json';

async function readAll() {
  try {
    const result = await get(BLOB_PATH, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) return {};
    const text = await new Response(result.stream).text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function writeAll(data) {
  await put(BLOB_PATH, JSON.stringify(data), {
    access: 'private',
    contentType: 'application/json',
    allowOverwrite: true,
    addRandomSuffix: false,
  });
}

const key = (rep, month) => `${rep}|${month}`;

function emptyRecord() {
  return {
    rate: null,
    status: 'draft',
    ccRate: 3,
    warrantyRate: 3,
    overrides: { tax: null, ccFee: null, warranty: null, shipping: null, creditMemos: null },
    deductions: [],
    commissionDue: null,
    finalizedAt: null,
    updatedAt: null,
  };
}

async function getRecord(rep, month) {
  const all = await readAll();
  const rec = all[key(rep, month)];
  if (!rec) return emptyRecord();
  return { ...emptyRecord(), ...rec, overrides: { ...emptyRecord().overrides, ...(rec.overrides || {}) } };
}

async function setRecord(rep, month, record) {
  const all = await readAll();
  const next = {
    ...emptyRecord(),
    ...all[key(rep, month)],
    ...record,
    overrides: { ...emptyRecord().overrides, ...(all[key(rep, month)]?.overrides || {}), ...(record.overrides || {}) },
    updatedAt: Date.now(),
  };
  if (next.status === 'final' && !next.finalizedAt) next.finalizedAt = next.updatedAt;
  if (next.status === 'draft') next.finalizedAt = null;
  next.deductions = Array.isArray(record.deductions) ? record.deductions : (next.deductions || []);
  all[key(rep, month)] = next;
  await writeAll(all);
  return next;
}

async function listRecords() {
  const all = await readAll();
  return Object.entries(all).map(([k, rec]) => {
    const [rep, month] = k.split('|');
    return {
      rep, month,
      status: rec.status || 'draft',
      rate: rec.rate ?? null,
      commissionDue: rec.commissionDue ?? null,
      updatedAt: rec.updatedAt || null,
      finalizedAt: rec.finalizedAt || null,
    };
  });
}

module.exports = { getRecord, setRecord, listRecords };
