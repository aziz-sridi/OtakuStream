const grpc = require('@grpc/grpc-js');
const { db } = require('./db');
const { publish } = require('./kafka/producer');

function toItem(doc) {
  return {
    userId: doc.user_id,
    animeId: doc.anime_id,
    status: doc.status,
    addedAt: doc.added_at,
  };
}

function toProgress(doc) {
  return {
    userId: doc.user_id,
    animeId: doc.anime_id,
    episodeId: doc.episode_id,
    positionSeconds: doc.position_seconds,
    completed: doc.completed,
    updatedAt: doc.updated_at,
  };
}

module.exports = {
  async AddToWatchlist(call, cb) {
    try {
      const { userId, animeId } = call.request;
      if (!userId || !animeId) {
        return cb({ code: grpc.status.INVALID_ARGUMENT, message: 'userId and animeId required' });
      }
      const instance = await db;
      const existing = await instance.watchlist.findOne({ selector: { user_id: userId, anime_id: animeId } }).exec();
      if (existing) return cb(null, toItem(existing));
      const doc = await instance.watchlist.insert({
        user_id: userId, anime_id: animeId, status: 'watching', added_at: new Date().toISOString(),
      });
      cb(null, toItem(doc));
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async RemoveFromWatchlist(call, cb) {
    try {
      const { userId, animeId } = call.request;
      const instance = await db;
      const doc = await instance.watchlist.findOne({ selector: { user_id: userId, anime_id: animeId } }).exec();
      if (doc) await doc.remove();
      cb(null, {});
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async GetWatchlist(call, cb) {
    try {
      const instance = await db;
      const docs = await instance.watchlist.find({ selector: { user_id: call.request.userId } }).exec();
      cb(null, { items: docs.map(toItem) });
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async UpdateProgress(call, cb) {
    try {
      const { userId, animeId, episodeId, positionSeconds = 0, completed = false } = call.request;
      const updated_at = new Date().toISOString();
      const instance = await db;
      const existing = await instance.progress.findOne({ selector: { user_id: userId, anime_id: animeId } }).exec();
      let record;
      if (existing) {
        await existing.patch({ episode_id: episodeId, position_seconds: positionSeconds, completed, updated_at });
        record = existing;
      } else {
        record = await instance.progress.insert({
          user_id: userId, anime_id: animeId, episode_id: episodeId,
          position_seconds: positionSeconds, completed, updated_at,
        });
      }
      await publish('progress.updated', toProgress(record));
      if (completed) {
        await publish('anime.completed', { user_id: userId, anime_id: animeId, completed_at: updated_at });
        const wl = await instance.watchlist.findOne({ selector: { user_id: userId, anime_id: animeId } }).exec();
        if (wl) await wl.patch({ status: 'completed' });
      }
      cb(null, toProgress(record));
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async GetProgress(call, cb) {
    try {
      const { userId, animeId } = call.request;
      const instance = await db;
      const doc = await instance.progress.findOne({ selector: { user_id: userId, anime_id: animeId } }).exec();
      cb(null, doc ? toProgress(doc) : {
        userId, animeId, episodeId: '', positionSeconds: 0, completed: false, updatedAt: '',
      });
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },
};
