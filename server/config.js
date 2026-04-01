export const GAME = {
  MAX_PLAYERS: 10,
  MIN_PLAYERS_TO_START: 2,
  SUBMISSION_SECONDS: 60,
  VOTING_SECONDS: 30,
  RESULTS_SECONDS: 10,
  DEFAULT_ROUNDS: 5,
  MIN_ROUNDS: 3,
  MAX_ROUNDS: 10,
  ALL_SUBMITTED_BUFFER_MS: 3_000,
  RECONNECT_WINDOW_MS: 30_000,
  ROOM_IDLE_CLEANUP_MS: 5 * 60_000,
  ROOM_EMPTY_CLEANUP_MS: 60_000,
  CHAT_MAX_HISTORY: 200,
  CHAT_RATE_LIMIT_MS: 1_000,
};

export const SCORING = {
  VOTES_PER_VOTE_RECEIVED: 1,       // 1 pt per vote received (all players)
  SPEED_BONUS_POINTS: 2,            // fastest submission that gets a vote
  WINNERS_BONUS_PER_LETTER: 1,      // Winner's Bonus = acronym.length pts
  VOTED_FOR_WINNER_BONUS: 1,        // 1 pt for voting for the round winner
};
