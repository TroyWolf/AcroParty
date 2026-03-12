export const CATEGORIES = [
  { key: 'general',      label: 'General',       hint: 'Anything goes!' },
  { key: 'movie_titles', label: 'Movie Titles',  hint: 'Think box office hits...' },
  { key: 'song_titles',  label: 'Song Titles',   hint: 'Name that tune!' },
  { key: 'tv_shows',     label: 'TV Shows',      hint: "What's on tonight?" },
  { key: 'band_names',   label: 'Band Names',    hint: 'Rock on!' },
  { key: 'famous_names', label: 'Famous Names',  hint: "Who's who?" },
  { key: 'book_titles',  label: 'Book Titles',   hint: 'Between the covers...' },
  { key: 'catchphrases', label: 'Catchphrases',  hint: 'Say it like you mean it!' },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

export function pickCategory(key) {
  if (key === 'random' || !CATEGORY_MAP[key]) {
    return CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  }
  return CATEGORY_MAP[key];
}
