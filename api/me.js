// GET /api/me - Returns session info
export default function handler(req, res) {
  const cookies = req.headers.cookie || '';
  const sessionMatch = cookies.match(/qb_session=([^;]+)/);
  
  if (!sessionMatch) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const session = JSON.parse(Buffer.from(sessionMatch[1], 'base64').toString());
    res.json({ realmId: session.realmId });
  } catch {
    res.status(401).json({ error: 'Invalid session' });
  }
}