import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setIo } from './game/GameEngine.js';
import { registerSocketHandlers } from './socket/index.js';
import adminRouter from './routes/admin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? 3001;
const isDev = process.env.NODE_ENV !== 'production';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  // In dev, Vite runs separately on :5173; in production same origin so no CORS needed
  ...(isDev && {
    cors: {
      origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  }),
});

setIo(io);
registerSocketHandlers(io);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/admin', adminRouter);

// Serve built client in production
if (!isDev) {
  const clientDist = join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

httpServer.listen(PORT, () => {
  console.log(`AcroParty server running on http://localhost:${PORT}`);
});
