# Karma Crush

A Candy Crush-inspired match-3 puzzle game built for Reddit using Devvit and Phaser.

## 🏗️ Architecture Overview

This project uses Reddit's Devvit platform to create interactive games that run directly in Reddit feeds. The tech stack includes:

- **Frontend**: Phaser (2D game engine), Vite (build tool)
- **Backend**: Node.js v22 serverless environment (Devvit), Hono (web framework), tRPC (type-safe API)
- **Communication**: tRPC v11 for end-to-end type safety
- **Storage**: Redis via Devvit for leaderboards and game state
- **Deployment**: Directly to Reddit, accessible to millions of users

## Project Structure

```
src/
  client/          # Phaser game frontend
    scenes/        # Game scenes (Boot, Game, Menu, etc.)
    splash.html    # Initial Reddit feed entry point
    game.html      # Main game entry point
  server/          # Backend API and game logic
    trpc.ts        # tRPC router and procedures
    index.ts       # Hono app entry point
  shared/          # Shared types and utilities
```

## Features

- **Match-3 Gameplay**: Swap candies to create lines of 3 or more
- **Cascade System**: Matches trigger gravity and refills for combo chains
- **Special Candies**: Striped, wrapped, and color bombs for variety
- **Leaderboards**: Global high scores using Redis
- **Daily Challenges**: Seeded puzzles with time-limited leaderboards
- **Reddit Integration**: Share scores, earn flair, post comments
- **Cross-Platform**: Works on desktop and mobile Reddit apps

## Getting Started

### Prerequisites
- Node 22 installed
- Reddit account connected to Reddit Developers

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Login to Devvit:
   ```bash
   npm run login
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

This will run the game in development mode on Reddit. You can access it through your Reddit development environment.

## Development Commands

- `npm run dev`: Starts development server
- `npm run build`: Builds for production
- `npm run deploy`: Uploads new version
- `npm run launch`: Publishes for review
- `npm run type-check`: Runs TypeScript, linting, and formatting
- `npm run lint`: Runs ESLint
- `npm run test`: Runs tests (specify file with `-- my-file-name`)

## Game Implementation Guide

See [`todo.md`](todo.md) for the comprehensive development guide, including:

1. Setting up the match-3 grid and Phaser scenes
2. Implementing swap and match logic
3. Gravity and refill systems
4. Special candies and animations
5. Backend integration with Redis leaderboards
6. Reddit-specific features (flair, comments, payments)

## Core Systems

### Client (Phaser)
- **GameScene**: Main gameplay scene with grid management
- **GridManager**: Handles candy spawning, gravity, and refills
- **MatchFinder**: Detects horizontal/vertical matches and special patterns
- **SwapHandler**: Manages tile swapping and validation
- **SpecialCandy**: Handles power-ups and explosions
- **AnimationManager**: Cascades, particles, and screen effects

### Server (Devvit)
- **API Endpoints**: Score saving, leaderboard retrieval, daily challenges
- **Redis Integration**: Persistent storage for scores and game state
- **Reddit SDK**: User management, flair rewards, comment posting

## Deployment

1. Build the project:
   ```bash
   npm run build
   ```
2. Deploy to Devvit:
   ```bash
   npm run deploy
   ```
3. Submit for review (if publishing publicly):
   ```bash
   npm run launch
   ```

Your game will then run directly in Reddit feeds with no app store requirements.

## Credits

- Based on the [Devvit Phaser starter template](https://github.com/reddit/devvit-template-phaser)
- Inspired by Candy Crush Saga by King
- Built for the Reddit developer community

## License

See [LICENSE](LICENSE) file.