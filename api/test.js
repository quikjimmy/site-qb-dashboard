// GET /api/test - Simple test
export default function handler(req, res) {
  res.json({ ok: true, method: req.method });
}
