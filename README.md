# AcroParty 🎉

**Play now at [acroparty.com](https://acroparty.com)**

A free, multiplayer word party game inspired by the classic 90s internet game **Acrophobia**. Get a random acronym, make up something hilarious (or clever) that it stands for, and vote for your favorite. No downloads, no accounts — just grab some friends and play.

---

## What Is This Game?

Each round, everyone in the room is given the same random acronym — say, **BFHT**. You have 60 seconds to come up with a phrase where each word starts with one of those letters, in order. Then everyone votes on their favorite answer anonymously. The more votes you get, the more points you score.

It sounds simple. It gets surprisingly funny, surprisingly fast.

**Example round:**

> Acronym: **BFHT**
>
> - "Bring Food Here Tonight" — 3 votes ⭐
> - "Butterflies Find Hats Terrifying" — 2 votes
> - "Bob Finally Hit Timeout" — 1 vote

The player who gets the most votes wins the round. Players who voted for the winner also get a bonus. Points stack across rounds, and the player with the most points at the end of the game wins.

---

## A Little History

Acrophobia was created by **Matt Toschlog** and launched in 1997 on the now-defunct **heat.net** gaming platform. At its peak it had tens of thousands of daily players and was one of the most popular online multiplayer games of its era — long before the age of social media, Discord, or group video calls.

What made it special was the formula: no reaction time, no hand-eye coordination required. Just wit, wordplay, and the ability to make strangers on the internet laugh. It was one of the first games where the *other players' creativity* was the entertainment. The chat between rounds kept tables lively, and regulars formed tight communities around their favorite rooms.

After Heat.net shut down in 2001, GameSpy briefly hosted Acrophobia before it, too, went dark. Fans have been trying to recreate the magic ever since — including this project.

AcroParty is a loving recreation of that experience for the modern web.

---

## How to Play

1. **Go to [acroparty.com](https://acroparty.com)**
2. Enter a nickname — no sign-up needed
3. **Create a room** to start a game with friends, or **join a room** using a 4-letter code someone shares with you
4. The host picks how many rounds to play (3–10) and optionally a category theme
5. When the game starts, everyone sees the same acronym and a 60-second countdown
6. Type your answer and hit Submit — each word must start with the corresponding letter
7. After time's up, all answers appear anonymously — vote for your favorite (you can't vote for your own)
8. See who wrote what, collect your points, and go again!

You can also **join as a spectator** to watch without playing.

---

## Game Modes & Features

- **Up to 10 players** per room, plus unlimited spectators
- **Live chat** throughout the game — trash talk encouraged
- **Category themes** — General, Movie Titles, Song Titles, TV Shows, Band Names, Famous Names, Book Titles, Catchphrases, or Random
- **Configurable rounds** — play a quick 3-round game or a marathon 10-rounder
- **Speed bonus** — submit your answer in the first 15 seconds for extra points
- **Voter bonus** — vote for the winning answer and earn extra points too
- **Host controls** — kick players, change settings, and start new games

---

## Scoring

| Action | Points |
|---|---|
| Someone votes for your answer | +5 per vote |
| You vote for the round winner | +3 bonus |
| You submitted an answer | +1 |
| You submitted in the first 15 seconds | +2 speed bonus |

---

## Running It Yourself

Want to host your own instance? You'll need **Node.js 22** or later.

```bash
# Clone the repo
git clone https://github.com/TroyWolf/AcroParty.git
cd AcroParty

# Install dependencies
npm install

# Start for development (hot-reloading on both server and client)
npm run dev

# Build and start for production (serves everything on one port)
npm start
```

The dev server runs the game client at `http://localhost:5173` and the game server at `http://localhost:3001`.

In production (`npm start`), everything is served from a single server on port `3001` (or whatever `PORT` environment variable you set).

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port the server listens on |
| `NODE_ENV` | *(unset)* | Set to `production` to serve the built client |

---

## Tech Stack

For the curious:

- **Server:** Node.js + Express + Socket.io (real-time communication)
- **Client:** React + Vite
- **No database** — all game state lives in memory, so it's fast and simple to deploy
- **No accounts** — nicknames only, nothing stored between sessions

---

## Contributing

Pull requests are welcome! If you find a bug or have a feature idea, open an issue on [GitHub](https://github.com/TroyWolf/AcroParty).

---

*In memory of the original Acrophobia and the weird, wonderful communities that formed around it.*
