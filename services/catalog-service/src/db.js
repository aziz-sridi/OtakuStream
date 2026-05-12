const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { v4: uuid } = require('uuid');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'catalog.db'));
db.pragma('journal_mode = WAL');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS anime (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      genres TEXT DEFAULT '[]',
      rating REAL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      anime_id TEXT NOT NULL,
      number INTEGER NOT NULL,
      title TEXT NOT NULL,
      duration_seconds INTEGER DEFAULT 0,
      published_at TEXT NOT NULL,
      FOREIGN KEY (anime_id) REFERENCES anime(id)
    );
    CREATE INDEX IF NOT EXISTS idx_episodes_anime ON episodes(anime_id);
  `);
}

const SEED = [
  { title: 'Fullmetal Alchemist: Brotherhood', genres: ['Action', 'Adventure', 'Fantasy'], rating: 9.1, episodes: 64 },
  { title: 'Attack on Titan', genres: ['Action', 'Drama'], rating: 9.0, episodes: 25 },
  { title: 'Death Note', genres: ['Mystery', 'Thriller'], rating: 8.6, episodes: 37 },
  { title: 'Steins;Gate', genres: ['Sci-Fi', 'Thriller'], rating: 9.0, episodes: 24 },
  { title: 'Cowboy Bebop', genres: ['Action', 'Sci-Fi'], rating: 8.8, episodes: 26 },
  { title: 'Hunter x Hunter', genres: ['Action', 'Adventure'], rating: 9.0, episodes: 148 },
  { title: 'One Piece', genres: ['Action', 'Adventure', 'Comedy'], rating: 8.7, episodes: 30 },
  { title: 'Naruto', genres: ['Action', 'Adventure'], rating: 8.3, episodes: 50 },
  { title: 'My Hero Academia', genres: ['Action', 'Superhero'], rating: 8.0, episodes: 25 },
  { title: 'Demon Slayer', genres: ['Action', 'Fantasy'], rating: 8.6, episodes: 26 },
  { title: 'Jujutsu Kaisen', genres: ['Action', 'Supernatural'], rating: 8.7, episodes: 24 },
  { title: 'Spy x Family', genres: ['Comedy', 'Action'], rating: 8.5, episodes: 25 },
  { title: 'Chainsaw Man', genres: ['Action', 'Horror'], rating: 8.5, episodes: 12 },
  { title: 'Mob Psycho 100', genres: ['Action', 'Supernatural'], rating: 8.6, episodes: 12 },
  { title: 'One Punch Man', genres: ['Action', 'Comedy'], rating: 8.7, episodes: 12 },
  { title: 'Vinland Saga', genres: ['Action', 'Drama', 'Historical'], rating: 8.8, episodes: 24 },
  { title: 'Made in Abyss', genres: ['Adventure', 'Drama'], rating: 8.7, episodes: 13 },
  { title: 'Your Name', genres: ['Romance', 'Drama'], rating: 8.9, episodes: 1 },
  { title: 'Spirited Away', genres: ['Adventure', 'Fantasy'], rating: 8.6, episodes: 1 },
  { title: 'Frieren: Beyond Journey\'s End', genres: ['Adventure', 'Fantasy'], rating: 9.1, episodes: 28 },
];

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM anime').get().c;
  if (count > 0) return;
  const now = new Date().toISOString();
  const insertAnime = db.prepare(
    'INSERT INTO anime (id, title, description, cover_url, genres, rating, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertEp = db.prepare(
    'INSERT INTO episodes (id, anime_id, number, title, duration_seconds, published_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const tx = db.transaction(() => {
    for (const a of SEED) {
      const aid = uuid();
      insertAnime.run(aid, a.title, `${a.title} — seeded entry.`, '', JSON.stringify(a.genres), a.rating, now);
      const epCount = Math.min(a.episodes, 6);
      for (let i = 1; i <= epCount; i++) {
        insertEp.run(uuid(), aid, i, `Episode ${i}`, 1440, now);
      }
    }
  });
  tx();
  console.log(`[catalog] seeded ${SEED.length} anime`);
}

module.exports = { db, initDb, seedIfEmpty };
