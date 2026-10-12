import { hasPassword, hasBlob, isAuthed } from '../lib/auth.js';

export default function handler(req, res) {
  res.status(200).json({ password: hasPassword(), blob: hasBlob(), authed: isAuthed(req) });
}
