import { Filter } from "bad-words";
const profanityFilter = new Filter();

// Remove words that are too mild or clinical for a party game context
profanityFilter.removeWords(
  // Mild/everyday
  "fart",
  "crap",
  "poop",
  "turd",
  "hell",
  "hells",
  "sex",
  "sexy",
  "screwing",
  "pecker",
  "knob",
  "knobs",
  "knobz",
  "schmuck",
  "wank",
  "enema",
  "masochist",
  "sadist",
  // Clinical/anatomical
  "anus",
  "penis",
  "vagina",
  "vulva",
  "rectum",
  "semen",
  "scrotum",
  "foreskin",
  "testicle",
  "testicles",
  "breasts",
  "orgasm",
  "feces",
);

export function containsProfanity(text) {
  return profanityFilter.isProfane(text);
}

function stripHtml(str) {
  return String(str)
    .replace(/<[^>]*>/g, "")
    .trim();
}

export function sanitizeNickname(raw) {
  const cleaned = stripHtml(raw)
    .replace(/[^a-zA-Z0-9 _]/g, "")
    .trim();
  return cleaned.slice(0, 20);
}

export function sanitizeChat(raw) {
  return stripHtml(raw).slice(0, 200);
}

export function sanitizeSubmission(raw) {
  return stripHtml(raw).slice(0, 150);
}
