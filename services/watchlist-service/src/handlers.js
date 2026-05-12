const grpc = require('@grpc/grpc-js');
const { db } = require('./db');
const { publish } = require('./kafka/producer');

function toItem(doc) {
  return {
    user_id: doc.user_id,
    anime_id: doc.anime_id,
    status: doc.status,
    added_at: doc.added_at,
  };
}

function toProgress(doc) {
  return {
    user_id: doc.user_id,
    anime_id: doc.anime_id,
    episode_id: doc.episode_id,
    position_seconds: doc.position_seconds,
    completed: doc.completed,
    updated_at: doc.updated_at,
  };
}

module.exports = {
  async AddToWatchlist(call, cb) {
    try {
      const { user_id, anime_id } = call.request;
      if (!user_id || !anime_id) {
        return cb({ code: grpc.status.INVALID_ARGUMENT, message: 'user_id and anime_id required' });
      }
      const instance = await db;
      const existing = await instance.watchlist.findOne({ selector: { user_id, anime_id } }).exec();
      if (existing) return cb(null, toItem(existing));
      const doc = await instance.watchlist.insert({
        user_id, anime_id, status: 'watching', added_at: new Date().toISOString(),
      });
      cb(null, toItem(doc));
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async RemoveFromWatchlist(call, cb) {
    try {
      const { user_id, anime_id } = call.request;
      const instance = await db;
      const doc = await instance.watchlist.findOne({ selector: { user_id, anime_id } }).exec();
      if (doc) await doc.remove();
      cb(null, {});
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async GetWatchlist(call, cb) {
    try {
      const instance = await db;
      const docs = await instance.watchlist.find({ selector: { user_id: call.request.user_id } }).exec();
      cb(null, { items: docs.map(toItem) });
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async UpdateProgress(call, cb) {
    try {
      const { user_id, anime_id, episode_id, position_seconds = 0, completed = false } = call.request;
      const updated_at = new Date().toISOString();
      const instance = await db;
      const existing = await instance.progress.findOne({ selector: { user_id, anime_id } }).exec();
      let record;
      if (existing) {
        await existing.patch({ episode_id, position_seconds, completed, updated_at });
        record = existing;
      } else {
        record = await instance.progress.insert({
          user_id, anime_id, episode_id, position_seconds, completed, updated_at,
        });
      }
      await publish('progress.updated', toProgress(record));
      if (completed) {
        await publish('anime.completed', { user_id, anime_id, completed_at: updated_at });
        const wl = await instance.watchlist.findOne({ selector: { user_id, anime_id } }).exec();
        if (wl) await wl.patch({ status: 'completed' });
      }
      cb(null, toProgress(record));
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async GetProgress(call, cb) {
    try {
      const { user_id, anime_id } = call.request;
      const instance = await db;
      const doc = await instance.progress.findOne({ selector: { user_id, anime_id } }).exec();
      cb(null, doc ? toProgress(doc) : {
        user_id, anime_id, episode_id: '', position_seconds: 0, completed: false, updated_at: '',
      });
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },
};
