function stripHtml(str) {
  return String(str).replace(/<[^>]*>/g, '').trim();
}

export function sanitizeNickname(raw) {
  const cleaned = stripHtml(raw).replace(/[^a-zA-Z0-9 _]/g, '').trim();
  return cleaned.slice(0, 20);
}

export function sanitizeChat(raw) {
  return stripHtml(raw).slice(0, 200);
}

export function sanitizeSubmission(raw) {
  return stripHtml(raw).slice(0, 150);
}
