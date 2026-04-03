Here's a comprehensive guide to building a Candy Crush clone on Reddit using Devvit + Phaser:

---

## 🏗️ Architecture Overview

Devvit is Reddit's developer platform for building interactive games that run directly in Reddit feeds. The Devvit + Phaser stack consists of: **Phaser** (2D game engine), **Vite** (build tool), **Express** (backend/API), and **TypeScript** (type safety).

---

## Step 1 — Setup

Make sure you have **Node 22** installed. Then scaffold the project and go through the installation wizard — you'll need a Reddit account connected to Reddit Developers.

```bash
npm create devvit@latest my-candy-crush -- --template phaser
cd my-candy-crush
npm run dev   # live dev server on Reddit
npm run build # production build
```

Your project structure will look like:
```
src/
  client/   ← Phaser game lives here
  server/   ← Express API (scores, Redis storage)
  shared/   ← Shared types
```

---

## Step 2 — The Match-3 Grid (Phaser Scene)

In `src/client/scenes/GameScene.ts`:

```typescript
import Phaser from 'phaser';

const COLS = 8, ROWS = 8, TILE = 64;
const CANDIES = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

export class GameScene extends Phaser.Scene {
  private grid: (Phaser.GameObjects.Image | null)[][] = [];
  private selected: { row: number; col: number } | null = null;

  create() {
    this.buildGrid();
    this.input.on('gameobjectdown', this.onTileClick, this);
  }

  buildGrid() {
    for (let r = 0; r < ROWS; r++) {
      this.grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        this.grid[r][c] = this.spawnCandy(r, c);
      }
    }
    // Re-roll until no starting matches
    while (this.findMatches().length > 0) {
      this.resolveMatches();
    }
  }

  spawnCandy(row: number, col: number): Phaser.GameObjects.Image {
    const type = Phaser.Math.RND.pick(CANDIES);
    const x = col * TILE + TILE / 2;
    const y = row * TILE + TILE / 2;
    const img = this.add.image(x, y, type)
      .setInteractive()
      .setData({ row, col, type });
    return img;
  }

  onTileClick(_pointer: unknown, tile: Phaser.GameObjects.Image) {
    const { row, col } = tile.getData('row'), tile.getData('col');
    // ... swap logic below
  }
}
```

---

## Step 3 — Swap & Match Logic

```typescript
  swapTiles(r1: number, c1: number, r2: number, c2: number) {
    // Swap in grid array
    [this.grid[r1][c1], this.grid[r2][c2]] = 
    [this.grid[r2][c2], this.grid[r1][c1]];

    // Tween positions
    this.tweens.add({
      targets: this.grid[r1][c1],
      x: c1 * TILE + TILE / 2, y: r1 * TILE + TILE / 2,
      duration: 200, ease: 'Power2',
    });
    this.tweens.add({
      targets: this.grid[r2][c2],
      x: c2 * TILE + TILE / 2, y: r2 * TILE + TILE / 2,
      duration: 200, ease: 'Power2',
      onComplete: () => {
        const matches = this.findMatches();
        if (matches.length === 0) this.swapTiles(r1, c1, r2, c2); // revert
        else this.resolveMatches(matches);
      }
    });
  }

  findMatches(): {row: number, col: number}[][] {
    const matches: {row: number, col: number}[][] = [];
    // Check horizontal runs of 3+
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 2; c++) {
        const t = this.grid[r][c]?.getData('type');
        if (t && t === this.grid[r][c+1]?.getData('type')
               && t === this.grid[r][c+2]?.getData('type')) {
          matches.push([{row:r,col:c},{row:r,col:c+1},{row:r,col:c+2}]);
        }
      }
    }
    // Check vertical runs of 3+
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 2; r++) {
        const t = this.grid[r][c]?.getData('type');
        if (t && t === this.grid[r+1][c]?.getData('type')
               && t === this.grid[r+2][c]?.getData('type')) {
          matches.push([{row:r,col:c},{row:r+1,col:c},{row:r+2,col:c}]);
        }
      }
    }
    return matches;
  }
```

---

## Step 4 — Gravity & Refill

```typescript
  resolveMatches(matches: {row:number, col:number}[][]) {
    const toDestroy = new Set(matches.flat().map(({row,col}) => `${row},${col}`));

    // Destroy matched tiles
    toDestroy.forEach(key => {
      const [r, c] = key.split(',').map(Number);
      this.grid[r][c]?.destroy();
      this.grid[r][c] = null;
    });

    // Apply gravity — shift tiles down
    for (let c = 0; c < COLS; c++) {
      let empty = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.grid[r][c]) {
          this.grid[empty][c] = this.grid[r][c];
          if (empty !== r) this.grid[r][c] = null;
          this.tweens.add({
            targets: this.grid[empty][c],
            y: empty * TILE + TILE / 2,
            duration: 300, ease: 'Bounce.Out'
          });
          empty--;
        }
      }
      // Fill empty slots from top
      for (let r = empty; r >= 0; r--) {
        const candy = this.spawnCandy(r, c);
        candy.y = -TILE; // start above screen
        this.tweens.add({ targets: candy, y: r * TILE + TILE/2, duration: 300 });
        this.grid[r][c] = candy;
      }
    }

    // Check for cascades
    this.time.delayedCall(400, () => {
      const next = this.findMatches();
      if (next.length > 0) this.resolveMatches(next);
    });
  }
```

---

## Step 5 — Leaderboard via Devvit Redis (server)

In `src/server/index.ts`:

```typescript
import { Devvit } from '@devvit/public-api';

// Save score to Redis sorted set
export async function saveScore(username: string, score: number, redis: any) {
  await redis.zAdd('leaderboard', { score, member: username });
}

// Get top 10
export async function getLeaderboard(redis: any) {
  return redis.zRange('leaderboard', 0, 9, { by: 'rank', rev: true });
}
```

Then expose via Express endpoint and call it from your Phaser game with `fetch('/api/leaderboard')`.

---

## Step 6 — Deploy

```bash
npm run build
devvit publish
```

Your game will run directly in Reddit feeds, accessible to 500M+ monthly users with no app store approval or downloads required — it works on any device that runs Reddit.

---

## 💡 Reddit-Specific Features to Add

| Feature | How |
|---|---|
| **Leaderboard** | Redis sorted sets via Devvit KV store |
| **Daily challenge** | Server-seeded grid using today's date |
| **Share score** | `context.reddit.submitComment()` on match |
| **Flair rewards** | Award Reddit flair for high scores |
| **Multiplayer** | Devvit Realtime for live score races |

---

## Key Tips

- **Touch input** — use `this.input.addPointer(2)` for mobile swipe support
- **Assets** — simple colored circles work great; use `this.add.graphics()` to draw candies procedurally without needing image files
- **Special candies** — matches of 4+ can set tile data to `'striped'` or `'bomb'` and trigger area clears
- **No physics needed** — handle gravity manually with tweens for much better performance than using Phaser's physics engine for a grid game

The official starter is at `github.com/reddit/devvit-template-phaser` and is the fastest way to get something running in minutes.

Click any box above to dive into that system. Here's the full breakdown of everything you need to build:

---

## Client — Phaser Scenes

**Boot/Preloader scene** — loads all your sprite atlases, audio, and fonts before anything runs. Use a `Phaser.Scene` with `preload()` to load a spritesheet of all 6 candy types plus special variants.

**Game scene** — the main scene. Owns the grid and orchestrates all other systems. Runs the core game loop.

**UI scene** — runs in parallel with Game scene (Phaser supports multiple concurrent scenes). Displays score, move counter, level goal, and a timer if you have timed modes. Keeps your UI decoupled from game logic.

---

## Client — Core Game Systems

**`GridManager`** — the most critical file. Owns the 2D array of candy objects. Responsible for spawning, gravity, refill from top, and serializing grid state to send to the server.

**`MatchFinder`** — pure logic, no Phaser calls. Scans the grid horizontally and vertically for runs of 3+. Extend it to detect L-shapes and T-shapes (5 tiles) which create special candies. Returns an array of match groups.

**`SwapHandler`** — handles the player interaction of swapping two adjacent tiles. Plays the swap tween, checks if a match results, and reverts with a bounce tween if not.

**`SpecialCandy`** — tracks candy "type flags" beyond color (striped horizontal, striped vertical, wrapped, color bomb). Each type has its own explosion logic triggered on match.

**`AnimationManager`** — the "game feel" system. Handles cascade chain animations, pop particles, screen shake on big combos, and score number pop-ups. This is what separates a stiff prototype from something satisfying.

**`InputManager`** — wraps Phaser's pointer input to support both mouse drag and touch swipe. Tracks `pointerdown`, `pointermove`, and `pointerup` to determine swap direction.

---

## Server — Backend Systems

**API routes** (Express) — three main endpoints:
- `POST /api/score` — save a score with username
- `GET /api/leaderboard` — return top N scores
- `GET /api/daily` — return today's seeded board config

**Redis store** — Devvit gives you a built-in Redis instance. Use sorted sets (`zAdd`, `zRange`) for the leaderboard and plain key-value for the daily seed.

**Devvit SDK integration** — use `context.reddit` to post a comment when a player beats a high score, assign Reddit flair for milestones, and read the username of the current player.

---

## Server — Feature Systems

**Realtime leaderboard** — use Devvit's `realtime` API to push live score updates to all players viewing the post simultaneously. Other players see their rank shift in real time.

**Daily challenge** — use today's date as a seed for a deterministic random number generator (like a mulberry32 seeded RNG). Everyone gets the same board. Store the top daily score per user in Redis with a TTL of 24 hours.

**Payments API** — Devvit lets you charge Reddit users for cosmetics. You can sell candy skin packs or "extra moves" boosters through the native payment flow.

---

## Rough build order

1. Boot + Grid rendering (get candies on screen)
2. SwapHandler + MatchFinder (core loop working)
3. Gravity + refill (cascades)
4. UI scene (score + moves)
5. AnimationManager (make it feel good)
6. SpecialCandy types
7. API routes + Redis leaderboard
8. Daily challenge
9. Devvit SDK (flair, comments)
10. Realtime + Payments (polish)

Here's everything beyond the core systems — the stuff that separates a working prototype from something people actually come back to.Tick things off as you go — it saves your progress. Here's the thinking behind each category:

**Game feel** is arguably the most important category after the core loop. Candy Crush is satisfying not because of the grid — it's because of the *pop*, the screen shake, the cascade sounds. This is what keeps people playing.

**Level system** is what gives the game longevity. Without goals and move limits, it's a sandbox with no stakes. The level config format is worth designing carefully early because everything else depends on it.

**State machine** sounds boring but prevents a whole class of bugs. Without it, players can trigger two swaps simultaneously, or interact with the grid mid-cascade, which corrupts the array and breaks everything silently.

**Mobile & performance** matters a lot on Reddit because most users are on the mobile app. Touch drag detection (distinguishing a tap from a swipe) is trickier than it sounds and worth building a dedicated `InputManager` class for.

**Reddit / Devvit** specifics are what make this feel like a Reddit game vs a generic web game. The post preview thumbnail is the #1 factor for click-through rate in the feed — worth putting real effort into that image.

**Polish & launch** includes the colorblind mode, which is easy to add (just put a shape overlay on each candy) and makes your game accessible to ~8% of players who'd otherwise struggle with color-only differentiation.