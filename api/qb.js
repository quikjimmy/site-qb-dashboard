// GET /api/qb/* - Proxy to QuickBooks API
export default async function handler(req, res) {
  const cookies = req.headers.cookie || '';
  const sessionMatch = cookies.match(/qb_session=([^;]+)/);
  
  if (!sessionMatch) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  let session;
  try {
    session = JSON.parse(Buffer.from(sessionMatch[1], 'base64').toString());
  } catch {
    return res.status(401).json({ error: 'Invalid session' });
  }
  
  // Check if token needs refresh
  if (Date.now() > session.expires_at - 60000) {
    if (!session.refresh_token) {
      return res.status(401).json({ error: 'Token expired, please reconnect' });
    }
    
    // Refresh token
    const clientId = process.env.QB_CLIENT_ID;
    const clientSecret = process.env.QB_CLIENT_SECRET;
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const refreshRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${creds}`
      },
      body: `grant_type=refresh_token&refresh_token=${session.refresh_token}`
    });
    
    if (!refreshRes.ok) {
      // Clear session
      res.setHeader('Set-Cookie', 'qb_session=; Path=/; Max-Age=0');
      return res.status(401).json({ error: 'Token refresh failed, please reconnect' });
    }
    
    const newTokens = await refreshRes.json();
    session.access_token = newTokens.access_token;
    session.refresh_token = newTokens.refresh_token;
    session.expires_at = Date.now() + newTokens.expires_in * 1000;
    
    // Update session cookie
    const encoded = Buffer.from(JSON.stringify(session)).toString('base64');
    res.setHeader('Set-Cookie', `qb_session=${encoded}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`);
  }
  
  // Allowlist endpoints
  const path = req.url.replace(/^\/api\/qb/, '');
  const allowed = ['/query', '/reports/ProfitAndLoss'];
  const isAllowed = allowed.some(a => path.startsWith(a)) || path === '/company/' + session.realmId;
  
  if (!isAllowed) {
    return res.status(403).json({ error: 'Endpoint not allowed' });
  }
  
  // Forward to QuickBooks
  const realmId = session.realmId;
  const qbUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}${path}`;
  
  const qbRes = await fetch(qbUrl, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Accept': 'application/json'
    }
  });
  
  if (qbRes.status === 401) {
    res.setHeader('Set-Cookie', 'qb_session=; Path=/; Max-Age=0');
    return res.status(401).json({ error: 'Session expired' });
  }
  
  const data = await qbRes.text();
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
}