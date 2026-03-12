// Weights tuned for acronym-friendliness — more vowels, skip Q/X/Z
const LETTER_WEIGHTS = {
  A: 8, B: 3, C: 4, D: 4, E: 8, F: 3, G: 3, H: 4,
  I: 7, J: 1, K: 2, L: 4, M: 4, N: 5, O: 7, P: 3,
  R: 5, S: 5, T: 6, U: 5, V: 2, W: 3, Y: 3,
};

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

const LENGTH_WEIGHTS = { 3: 25, 4: 40, 5: 25, 6: 7, 7: 3 };

// Build weighted arrays once
const LETTER_POOL = Object.entries(LETTER_WEIGHTS).flatMap(([l, w]) =>
  Array(w).fill(l)
);

const LENGTH_POOL = Object.entries(LENGTH_WEIGHTS).flatMap(([len, w]) =>
  Array(w).fill(Number(len))
);

function pickLength() {
  return LENGTH_POOL[Math.floor(Math.random() * LENGTH_POOL.length)];
}

function pickLetter() {
  return LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)];
}

function isValid(letters) {
  const vowelCount = letters.filter(l => VOWELS.has(l)).length;
  const minVowels = letters.length <= 3 ? 1 : 2;
  if (vowelCount < minVowels) return false;

  // No 3 consecutive consonants
  let consRun = 0;
  for (const l of letters) {
    consRun = VOWELS.has(l) ? 0 : consRun + 1;
    if (consRun >= 3) return false;
  }

  // No letter appearing more than 3 times
  const freq = {};
  for (const l of letters) freq[l] = (freq[l] || 0) + 1;
  if (Object.values(freq).some(n => n > 3)) return false;

  return true;
}

export function generateAcronym() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const length = pickLength();
    const letters = Array.from({ length }, pickLetter);
    if (isValid(letters)) return letters.join('');
  }
  // Fallback: guaranteed valid 4-letter acronym
  return 'STAR';
}
