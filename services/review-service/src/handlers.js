const grpc = require('@grpc/grpc-js');
const { v4: uuid } = require('uuid');
const { db } = require('./db');
const { publish } = require('./kafka/producer');

function toReview(doc) {
  return {
    id: doc.id,
    user_id: doc.user_id,
    anime_id: doc.anime_id,
    rating: doc.rating,
    body: doc.body,
    likes: doc.likes || 0,
    created_at: doc.created_at,
  };
}

module.exports = {
  async CreateReview(call, cb) {
    try {
      const { user_id, anime_id, rating, body } = call.request;
      if (!user_id || !anime_id || !rating) {
        return cb({ code: grpc.status.INVALID_ARGUMENT, message: 'user_id, anime_id, rating required' });
      }
      const instance = await db;
      const doc = await instance.reviews.insert({
        id: uuid(), user_id, anime_id, rating, body: body || '',
        likes: 0, likedBy: [], created_at: new Date().toISOString(),
      });
      await publish('review.posted', { review_id: doc.id, user_id, anime_id, rating });
      cb(null, toReview(doc));
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async GetReviews(call, cb) {
    try {
      const { anime_id, limit = 50 } = call.request;
      const instance = await db;
      const docs = await instance.reviews.find({
        selector: { anime_id },
        sort: [{ created_at: 'desc' }],
        limit: limit || 50,
      }).exec();
      cb(null, { items: docs.map(toReview) });
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async LikeReview(call, cb) {
    try {
      const { review_id, user_id } = call.request;
      const instance = await db;
      const doc = await instance.reviews.findOne(review_id).exec();
      if (!doc) return cb({ code: grpc.status.NOT_FOUND, message: 'review not found' });
      const likedBy = new Set(doc.likedBy || []);
      if (likedBy.has(user_id)) return cb(null, toReview(doc));
      likedBy.add(user_id);
      await doc.patch({ likedBy: [...likedBy], likes: likedBy.size });
      cb(null, toReview(doc));
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async DeleteReview(call, cb) {
    try {
      const instance = await db;
      const doc = await instance.reviews.findOne(call.request.review_id).exec();
      if (doc) await doc.remove();
      cb(null, {});
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },
};
