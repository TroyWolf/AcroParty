// Unambiguous characters — no 0/O, 1/I/L
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateCode(existingCodes = new Set()) {
  let attempts = 0;
  let code;
  do {
    code = Array.from({ length: 4 }, () =>
      ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    ).join('');
    attempts++;
  } while (existingCodes.has(code) && attempts < 1000);
  return code;
}
