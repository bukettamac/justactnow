// One shared password protects every write. The password lives only in the
// STUDIO_PASSWORD environment variable of the Vercel project.
import crypto from 'node:crypto';

const COOKIE = 'jan_session';
const DAYS = 30;

export const hasPassword = () => typeof process.env.STUDIO_PASSWORD === 'string' && process.env.STUDIO_PASSWORD.length >= 8;
// A connected Blob store shows up either as a read-write token (older setup) or as a
// store id that is used together with the deployment's own identity (OIDC).
export const hasBlob = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

// Options every Blob call gets: nothing extra when a read-write token exists,
// otherwise the store id plus the identity token Vercel attaches to the request.
export function blobAuth(req) {
  if (process.env.BLOB_READ_WRITE_TOKEN) return {};
  const header = req && req.headers ? req.headers['x-vercel-oidc-token'] : undefined;
  const oidcToken = (Array.isArray(header) ? header[0] : header) || process.env.VERCEL_OIDC_TOKEN;
  return oidcToken ? { oidcToken, storeId: process.env.BLOB_STORE_ID } : {};
}

const sign = (exp) => crypto.createHmac('sha256', process.env.STUDIO_PASSWORD).update('jan-session:' + exp).digest('hex');
const digest = (v) => crypto.createHash('sha256').update(String(v)).digest();

export function passwordMatches(candidate) {
  if (!hasPassword() || typeof candidate !== 'string') return false;
  return crypto.timingSafeEqual(digest(candidate), digest(process.env.STUDIO_PASSWORD));
}

export function sessionCookie() {
  const exp = Date.now() + DAYS * 864e5;
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DAYS * 86400}`;
}

export const clearedCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function isAuthed(req) {
  if (!hasPassword()) return false;
  const m = /(?:^|;\s*)jan_session=(\d{10,16})\.([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '');
  if (!m || Number(m[1]) < Date.now()) return false;
  return crypto.timingSafeEqual(Buffer.from(m[2], 'hex'), Buffer.from(sign(m[1]), 'hex'));
}

// Returns true when the request may continue; otherwise it has already answered.
export function guard(req, res) {
  if (!hasPassword() || !hasBlob()) { res.status(503).json({ error: 'not_configured' }); return false; }
  if (!isAuthed(req)) { res.status(401).json({ error: 'unauthorized' }); return false; }
  return true;
}
