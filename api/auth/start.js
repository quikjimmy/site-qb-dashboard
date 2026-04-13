// GET /auth/start - Redirect to Intuit OAuth
import crypto from 'crypto';

export default function handler(req, res) {
  const clientId = process.env.QB_CLIENT_ID || 'ABe6ocRw3PPrmyMyQ3kMFGcDPETjat2022TVrysCHVZvTJ0xt2';
  const redirectUri = process.env.QB_REDIRECT_URI || 'https://qb-dashboard-snowy.vercel.app/api/auth/callback';
  const scope = 'com.intuit.quickbooks.accounting';
  const state = crypto.randomBytes(16).toString('hex');
  
  res.setHeader('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
  
  const authUrl = `https://appcenter.intuit.com/connect/oauth2?` +
    `client_id=${clientId}&` +
    `scope=${scope}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `state=${state}`;
  
  res.redirect(authUrl);
}