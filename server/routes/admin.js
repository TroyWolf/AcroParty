import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import RoomManager from '../game/RoomManager.js';
import { LOG_FILE } from '../logger.js';

const router = Router();

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? null;

function adminAuth(req, res, next) {
  if (!ADMIN_SECRET) return next();
  if (req.query.secret === ADMIN_SECRET) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

const ACTIVE_PHASES = new Set(['submission', 'voting', 'results']);

function serializeAdminRoom(room, now) {
  const players = [...room.players.values()].map(p => ({
    nickname: p.nickname,
    score: p.score,
    isHost: p.isHost,
    hasSubmitted: p.hasSubmitted,
    hasVoted: p.hasVoted,
    connected: p.disconnectedAt === null,
  }));

  let currentRoundState = null;
  if (ACTIVE_PHASES.has(room.phase) && room.currentRoundState) {
    const rs = room.currentRoundState;
    currentRoundState = {
      roundNumber: rs.roundNumber,
      acronym: rs.acronym,
      phaseStartedAt: rs.phaseStartedAt,
      phaseEndsAt: rs.phaseEndsAt,
      submissionCount: rs.submissions.size,
      voteCount: rs.votes.size,
    };
  }

  return {
    code: room.code,
    phase: room.phase,
    createdAt: room.createdAt,
    lastActivityAt: room.lastActivityAt,
    ageSeconds: Math.floor((now - room.createdAt) / 1000),
    idleSeconds: Math.floor((now - room.lastActivityAt) / 1000),
    config: room.config,
    currentRound: room.currentRound,
    totalRounds: room.config.totalRounds,
    currentRoundState,
    players,
    spectatorCount: room.spectators.size,
    pendingCount: room.pendingPlayers.size,
    completedRounds: room.rounds,
  };
}

router.get('/log', adminAuth, (req, res) => {
  if (!existsSync(LOG_FILE)) return res.json({ lines: [], total: 0 });

  const allLines = readFileSync(LOG_FILE, 'utf8').split('\n').filter(l => l.trim());
  const total = allLines.length;
  const after = parseInt(req.query.after ?? '0', 10);

  const lines = after > 0 && after < total
    ? allLines.slice(after)
    : allLines.slice(-500);

  res.json({ lines, total });
});

router.get('/state', adminAuth, (_req, res) => {
  const now = Date.now();
  const rooms = [...RoomManager.rooms.values()].map(r => serializeAdminRoom(r, now));
  const totalActivePlayers = rooms.reduce(
    (sum, r) => sum + r.players.filter(p => p.connected).length,
    0
  );
  res.json({ snapshotAt: now, totalRooms: rooms.length, totalActivePlayers, rooms });
});

export default router;
