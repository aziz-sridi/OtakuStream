const grpc = require('@grpc/grpc-js');
const { v4: uuid } = require('uuid');
const { db } = require('./db');
const { publish } = require('./kafka/producer');

function toReview(doc) {
  return {
    id: doc.id,
    userId: doc.user_id,
    animeId: doc.anime_id,
    rating: doc.rating,
    body: doc.body,
    likes: doc.likes || 0,
    createdAt: doc.created_at,
  };
}

module.exports = {
  async CreateReview(call, cb) {
    try {
      const { userId, animeId, rating, body } = call.request;
      if (!userId || !animeId || !rating) {
        return cb({ code: grpc.status.INVALID_ARGUMENT, message: 'userId, animeId, rating required' });
      }
      const instance = await db;
      const doc = await instance.reviews.insert({
        id: uuid(), user_id: userId, anime_id: animeId, rating, body: body || '',
        likes: 0, likedBy: [], created_at: new Date().toISOString(),
      });
      await publish('review.posted', { review_id: doc.id, user_id: userId, anime_id: animeId, rating });
      cb(null, toReview(doc));
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async GetReviews(call, cb) {
    try {
      const { animeId, limit = 50 } = call.request;
      const instance = await db;
      const docs = await instance.reviews.find({
        selector: { anime_id: animeId },
        sort: [{ created_at: 'desc' }],
        limit: limit || 50,
      }).exec();
      cb(null, { items: docs.map(toReview) });
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async LikeReview(call, cb) {
    try {
      const { reviewId, userId } = call.request;
      const instance = await db;
      const doc = await instance.reviews.findOne(reviewId).exec();
      if (!doc) return cb({ code: grpc.status.NOT_FOUND, message: 'review not found' });
      const likedBy = new Set(doc.likedBy || []);
      if (likedBy.has(userId)) return cb(null, toReview(doc));
      likedBy.add(userId);
      await doc.patch({ likedBy: [...likedBy], likes: likedBy.size });
      cb(null, toReview(doc));
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },

  async DeleteReview(call, cb) {
    try {
      const instance = await db;
      const doc = await instance.reviews.findOne(call.request.reviewId).exec();
      if (doc) await doc.remove();
      cb(null, {});
    } catch (e) { cb({ code: grpc.status.INTERNAL, message: e.message }); }
  },
};
