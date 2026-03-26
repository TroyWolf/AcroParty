// Shared event name constants — mirrors server events
export const EVENTS = {
  // Room — client → server
  ROOM_CREATE:        'room:create',
  ROOM_JOIN:          'room:join',
  ROOM_LEAVE:         'room:leave',
  HOST_CHANGE_CONFIG: 'host:change_config',
  HOST_KICK:          'host:kick',

  // Game — client → server
  GAME_START:         'game:start',
  GAME_SUBMIT:        'game:submit',
  GAME_VOTE:          'game:vote',
  GAME_PLAY_AGAIN:    'game:play_again',

  // Chat — client → server
  CHAT_MESSAGE:       'chat:message',

  // Room — server → client
  ROOM_CREATED:       'room:created',
  ROOM_JOINED:        'room:joined',
  ROOM_ERROR:         'room:error',
  ROOM_PLAYER_JOINED: 'room:player_joined',
  ROOM_PLAYER_LEFT:   'room:player_left',
  ROOM_HOST_CHANGED:  'room:host_changed',
  ROOM_KICKED:        'room:kicked',
  ROOM_CONFIG_UPDATED:      'room:config_updated',
  ROOM_SPECTATORS_UPDATED:  'room:spectators_updated',

  // Game — server → client
  GAME_PHASE_CHANGE:      'game:phase_change',
  GAME_SUBMISSION_ACK:    'game:submission_ack',
  GAME_SUBMISSION_COUNT:  'game:submission_count',
  GAME_VOTE_ACK:          'game:vote_ack',
  GAME_VOTE_COUNT:        'game:vote_count',

  // Chat — server → client
  CHAT_MESSAGE_IN:    'chat:message',
  CHAT_HISTORY:       'chat:history',
};
