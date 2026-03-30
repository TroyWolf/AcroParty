import { appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(__dirname, 'logs');
export const LOG_FILE = join(LOG_DIR, 'server.log');

mkdirSync(LOG_DIR, { recursive: true });

export function log(action, fields = {}) {
  const parts = [new Date().toISOString(), action];
  for (const [k, v] of Object.entries(fields)) {
    parts.push(`${k}=${v}`);
  }
  appendFileSync(LOG_FILE, parts.join(' ') + '\n');
}
