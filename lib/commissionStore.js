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

async function getRecord(rep, month) {
  const all = await readAll();
  return all[key(rep, month)] || { rate: null, deductions: [] };
}

async function setRecord(rep, month, record) {
  const all = await readAll();
  all[key(rep, month)] = {
    rate: record.rate ?? null,
    deductions: Array.isArray(record.deductions) ? record.deductions : [],
  };
  await writeAll(all);
  return all[key(rep, month)];
}

module.exports = { getRecord, setRecord };
