const grpc = require('@grpc/grpc-js');
const { v4: uuid } = require('uuid');
const { db } = require('./db');
const { publish } = require('./kafka/producer');

function rowToAnime(row) {
  const epCount = db.prepare('SELECT COUNT(*) AS c FROM episodes WHERE anime_id = ?').get(row.id).c;
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    coverUrl: row.cover_url || '',
    genres: JSON.parse(row.genres || '[]'),
    rating: row.rating || 0,
    episodeCount: epCount,
  };
}

module.exports = {
  ListAnime(call, cb) {
    const { limit = 50, offset = 0, genre = '' } = call.request;
    let rows;
    if (genre) {
      rows = db.prepare('SELECT * FROM anime WHERE genres LIKE ? LIMIT ? OFFSET ?')
        .all(`%${genre}%`, limit || 50, offset || 0);
    } else {
      rows = db.prepare('SELECT * FROM anime LIMIT ? OFFSET ?').all(limit || 50, offset || 0);
    }
    const total = db.prepare('SELECT COUNT(*) AS c FROM anime').get().c;
    cb(null, { items: rows.map(rowToAnime), total });
  },

  GetAnime(call, cb) {
    const row = db.prepare('SELECT * FROM anime WHERE id = ?').get(call.request.animeId);
    if (!row) return cb({ code: grpc.status.NOT_FOUND, message: 'anime not found' });
    cb(null, rowToAnime(row));
  },

  SearchAnime(call, cb) {
    const { query, limit = 20 } = call.request;
    const rows = db.prepare('SELECT * FROM anime WHERE title LIKE ? LIMIT ?')
      .all(`%${query}%`, limit || 20);
    cb(null, { items: rows.map(rowToAnime), total: rows.length });
  },

  GetEpisodes(call, cb) {
    const rows = db.prepare('SELECT * FROM episodes WHERE anime_id = ? ORDER BY number ASC')
      .all(call.request.animeId);
    cb(null, {
      items: rows.map((r) => ({
        id: r.id,
        animeId: r.anime_id,
        number: r.number,
        title: r.title,
        durationSeconds: r.duration_seconds,
        publishedAt: r.published_at,
      })),
    });
  },

  CreateAnime(call, cb) {
    const { title, description = '', coverUrl = '', genres = [] } = call.request;
    if (!title) return cb({ code: grpc.status.INVALID_ARGUMENT, message: 'title required' });
    const id = uuid();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO anime (id, title, description, cover_url, genres, rating, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)')
      .run(id, title, description, coverUrl, JSON.stringify(genres), now);
    const row = db.prepare('SELECT * FROM anime WHERE id = ?').get(id);
    cb(null, rowToAnime(row));
  },

  async PublishEpisode(call, cb) {
    const { animeId, number, title, durationSeconds = 0 } = call.request;
    const anime = db.prepare('SELECT * FROM anime WHERE id = ?').get(animeId);
    if (!anime) return cb({ code: grpc.status.NOT_FOUND, message: 'anime not found' });
    const id = uuid();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO episodes (id, anime_id, number, title, duration_seconds, published_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, animeId, number, title, durationSeconds, now);
    await publish('episode.published', { episode_id: id, anime_id: animeId, anime_title: anime.title, number, title, published_at: now });
    cb(null, { id, animeId, number, title, durationSeconds, publishedAt: now });
  },
};
