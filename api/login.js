import { hasPassword, passwordMatches, sessionCookie } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!hasPassword()) { res.status(503).json({ error: 'not_configured' }); return; }
  const password = req.body && typeof req.body === 'object' ? req.body.password : undefined;
  if (!passwordMatches(password)) {
    await new Promise((r) => setTimeout(r, 700)); // slows guessing down
    res.status(401).json({ error: 'wrong_password' });
    return;
  }
  res.setHeader('Set-Cookie', sessionCookie());
  res.status(200).json({ ok: true });
}
