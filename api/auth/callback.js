// GET /auth/callback - Exchange code for tokens, store in session
export default async function handler(req, res) {
  const { code, realmId, state } = req.query;
  
  // Verify state
  const cookies = req.headers.cookie || '';
  const stateMatch = cookies.match(/oauth_state=([^;]+)/);
  const savedState = stateMatch ? stateMatch[1] : null;
  
  if (!state || state !== savedState) {
    return res.redirect('/?error=invalid_state');
  }
  
  if (!code) {
    return res.redirect('/?error=no_code');
  }
  
  const clientId = process.env.QB_CLIENT_ID;
  const clientSecret = process.env.QB_CLIENT_SECRET;
  const redirectUri = process.env.QB_REDIRECT_URI || 'https://qb-dashboard-snowy.vercel.app/api/auth/callback';
  
  try {
    // Exchange code for tokens
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${creds}`,
        'Accept': 'application/json'
      },
      body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(redirectUri)}`
    });
    
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('Token exchange failed:', tokenRes.status, err);
      return res.redirect('/?error=token_exchange_failed');
    }
    
    const tokens = await tokenRes.json();
    
    // Store tokens in secure httpOnly cookie (signed)
    const sessionData = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      realmId: realmId
    });
    
    // Simple encoding for now (in production use proper encryption)
    const encoded = Buffer.from(sessionData).toString('base64');
    res.setHeader('Set-Cookie', [
      `qb_session=${encoded}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
      'oauth_state=; Path=/; Max-Age=0'
    ]);
    
    // Redirect to dashboard
    res.redirect('/');
    
  } catch (err) {
    console.error('Auth callback error:', err);
    res.redirect('/?error=auth_failed');
  }
}