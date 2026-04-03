import Phaser from 'phaser';

type CandyType = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

const COLS = 8;
const ROWS = 8;
const TILE = 64;

const CANDIES: CandyType[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
];

const COLORS: Record<CandyType, number> = {
  red: 0xff0000,
  blue: 0x0000ff,
  green: 0x00ff00,
  yellow: 0xffff00,
  purple: 0xff00ff,
  orange: 0xff8000,
};

interface TileData {
  row: number;
  col: number;
  type: CandyType;
}

export class Game extends Phaser.Scene {
  private grid: Array<Array<Phaser.GameObjects.Graphics | null>> = [];
  private selected: { row: number; col: number } | null = null;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private score: number = 0;
  private moves: number = 30;
  private scoreText!: Phaser.GameObjects.Text;
  private movesText!: Phaser.GameObjects.Text;
  private uiBg!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x222222);
    this.cameras.main.centerOn((COLS * TILE) / 2, (ROWS * TILE) / 2);

    const particleGraphic = this.add.graphics();
    particleGraphic.fillStyle(0xffffff);
    particleGraphic.fillCircle(2, 2, 2);
    particleGraphic.generateTexture('particle', 4, 4);
    particleGraphic.destroy();

    this.particles = this.add.particles(0, 0, 'particle', {
      lifespan: 600,
      speed: { min: 100, max: 200 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 300,
      quantity: 5,
      emitting: false,
    });

    this.buildGrid();

    this.scoreText = this.add
      .text(20, 20, `Score: ${this.score}`, {
        fontSize: '24px',
        color: '#ffffff',
      })
      .setScrollFactor(0)
      .setOrigin(0);
    this.movesText = this.add
      .text(20, 60, `Moves: ${this.moves}`, {
        fontSize: '24px',
        color: '#ffffff',
      })
      .setScrollFactor(0)
      .setOrigin(0);

    this.input.on('gameobjectdown', this.onTileClick, this);
  }

  // ─── Safe grid accessor ────────────────────────────────────────────────────
  // Returns null (never undefined) so the rest of the code stays clean.
  private cell(r: number, c: number): Phaser.GameObjects.Graphics | null {
    const row = this.grid[r];
    if (row === undefined) return null;
    const cell = row[c];
    return cell === undefined ? null : cell;
  }

  private setCell(
    r: number,
    c: number,
    value: Phaser.GameObjects.Graphics | null
  ): void {
    const row = this.grid[r];
    if (row !== undefined) {
      row[c] = value;
    }
  }

  // ─── Grid construction ─────────────────────────────────────────────────────
  private buildGrid(): void {
    for (let r = 0; r < ROWS; r++) {
      this.grid[r] = [];
      for (let c = 0; c < COLS; c++) {
        this.setCell(r, c, this.spawnCandy(r, c));
      }
    }

    let startingMatches = this.findMatches();
    while (startingMatches.length > 0) {
      const seen = new Set<string>();
      startingMatches
        .flat()
        .forEach(({ row, col }) => seen.add(`${row},${col}`));
      seen.forEach((key) => {
        const [r, c] = parseKey(key);
        this.cell(r, c)?.destroy();
        this.setCell(r, c, this.spawnCandy(r, c));
      });
      startingMatches = this.findMatches();
    }
  }

  // ─── Tile helpers ──────────────────────────────────────────────────────────
  private spawnCandy(row: number, col: number): Phaser.GameObjects.Graphics {
    const type: CandyType = Phaser.Math.RND.pick(CANDIES);
    const x = col * TILE + TILE / 2;
    const y = row * TILE + TILE / 2;

    const g = this.add.graphics({ x, y });
    g.fillStyle(COLORS[type]);
    g.fillCircle(0, 0, TILE / 2 - 5);
    g.setInteractive(
      new Phaser.Geom.Circle(0, 0, TILE / 2 - 5),
      Phaser.Geom.Circle.Contains
    );
    const data: TileData = { row, col, type };
    g.setData(data);
    return g;
  }

  private getTileData(tile: Phaser.GameObjects.Graphics): TileData {
    return {
      row: tile.getData('row') as number,
      col: tile.getData('col') as number,
      type: tile.getData('type') as CandyType,
    };
  }

  private drawTile(
    tile: Phaser.GameObjects.Graphics,
    type: CandyType,
    dimmed = false
  ): void {
    tile.clear();
    const color = dimmed
      ? Phaser.Display.Color.IntegerToColor(COLORS[type]).darken(50).color
      : COLORS[type];
    tile.fillStyle(color);
    tile.fillCircle(0, 0, TILE / 2 - 5);
  }

  // ─── Input ─────────────────────────────────────────────────────────────────
  private onTileClick(
    _pointer: Phaser.Input.Pointer,
    tile: Phaser.GameObjects.Graphics
  ): void {
    const { row, col, type } = this.getTileData(tile);

    if (!this.selected) {
      this.selected = { row, col };
      this.drawTile(tile, type, true);
    } else {
      const prev = this.selected;
      this.selected = null;

      const prevTile = this.cell(prev.row, prev.col);
      if (prevTile) {
        this.drawTile(prevTile, prevTile.getData('type') as CandyType, false);
      }

      const isAdjacent =
        Math.abs(prev.row - row) + Math.abs(prev.col - col) === 1;
      if (isAdjacent) {
        this.swapTiles(prev.row, prev.col, row, col);
      }
    }
  }

  // ─── Swap ──────────────────────────────────────────────────────────────────
  private swapTiles(
    r1: number,
    c1: number,
    r2: number,
    c2: number,
    isTrialSwap: boolean = true
  ): void {
    const t1 = this.cell(r1, c1);
    const t2 = this.cell(r2, c2);

    this.setCell(r1, c1, t2);
    this.setCell(r2, c2, t1);

    if (t1) {
      t1.setData({ row: r2, col: c2, type: t1.getData('type') as CandyType });
    }
    if (t2) {
      t2.setData({ row: r1, col: c1, type: t2.getData('type') as CandyType });
    }

    const x1 = c1 * TILE + TILE / 2;
    const y1 = r1 * TILE + TILE / 2;
    const x2 = c2 * TILE + TILE / 2;
    const y2 = r2 * TILE + TILE / 2;

    if (t1) {
      this.tweens.add({
        targets: t1,
        x: x2,
        y: y2,
        duration: 250,
        ease: 'Quad.easeOut',
      });
    }

    const tween2 = t2
      ? this.tweens.add({
          targets: t2,
          x: x1,
          y: y1,
          duration: 250,
          ease: 'Quad.easeOut',
        })
      : undefined;

    if (isTrialSwap && tween2) {
      tween2.once('complete', () => {
        const matches = this.findMatches();
        if (matches.length === 0) {
          this.swapTiles(r1, c1, r2, c2, false);
        } else {
          this.moves--;
          this.movesText.setText(`Moves: ${this.moves}`);
          if (this.moves <= 0) {
            this.scene.start('GameOver');
            return;
          }
          this.resolveMatches(matches);
        }
      });
    }
  }

  // ─── Match detection ───────────────────────────────────────────────────────
  private findMatches(): { row: number; col: number }[][] {
    const matches: { row: number; col: number }[][] = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 2; c++) {
        const t = this.cell(r, c)?.getData('type') as CandyType | undefined;
        if (
          t &&
          t ===
            (this.cell(r, c + 1)?.getData('type') as CandyType | undefined) &&
          t === (this.cell(r, c + 2)?.getData('type') as CandyType | undefined)
        ) {
          matches.push([
            { row: r, col: c },
            { row: r, col: c + 1 },
            { row: r, col: c + 2 },
          ]);
        }
      }
    }

    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 2; r++) {
        const t = this.cell(r, c)?.getData('type') as CandyType | undefined;
        if (
          t &&
          t ===
            (this.cell(r + 1, c)?.getData('type') as CandyType | undefined) &&
          t === (this.cell(r + 2, c)?.getData('type') as CandyType | undefined)
        ) {
          matches.push([
            { row: r, col: c },
            { row: r + 1, col: c },
            { row: r + 2, col: c },
          ]);
        }
      }
    }

    return matches;
  }

  // ─── Match resolution ──────────────────────────────────────────────────────
  private resolveMatches(matches: { row: number; col: number }[][]): void {
    this.score += matches.flat().length * 10;
    this.scoreText.setText(`Score: ${this.score}`);

    const toDestroy = new Set<string>();
    matches.flat().forEach(({ row, col }) => toDestroy.add(`${row},${col}`));

    toDestroy.forEach((key) => {
      const [r, c] = parseKey(key);
      const tile = this.cell(r, c);
      if (tile) {
        this.particles.emitParticleAt(tile.x, tile.y);
        tile.destroy();
        this.setCell(r, c, null);
      }
    });

    // Gravity
    for (let c = 0; c < COLS; c++) {
      let emptyRow = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const tile = this.cell(r, c);
        if (tile) {
          this.setCell(emptyRow, c, tile);
          if (emptyRow !== r) {
            this.setCell(r, c, null);
            tile.setData({
              row: emptyRow,
              col: c,
              type: tile.getData('type') as CandyType,
            });
          }
          this.tweens.add({
            targets: tile,
            y: emptyRow * TILE + TILE / 2,
            duration: 300,
            ease: 'Bounce.Out',
          });
          emptyRow--;
        }
      }

      for (let r = emptyRow; r >= 0; r--) {
        const candy = this.spawnCandy(r, c);
        candy.y = -TILE;
        this.tweens.add({
          targets: candy,
          y: r * TILE + TILE / 2,
          duration: 300,
          ease: 'Cubic.Out',
        });
        this.setCell(r, c, candy);
      }
    }

    this.time.delayedCall(400, () => {
      const next = this.findMatches();
      if (next.length > 0) {
        this.resolveMatches(next);
      }
    });
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────
// Parses a "r,c" key into a guaranteed [number, number] tuple,
// avoiding the `number | undefined` that plain array destructuring gives.
function parseKey(key: string): [number, number] {
  const parts = key.split(',');
  return [Number(parts[0]), Number(parts[1])];
}
