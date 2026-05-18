const express = require('express');
const clients = require('../grpc-clients');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

function handle(promise, res, status = 200) {
  promise
    .then((data) => res.status(status).json(data))
    .catch((err) => res.status(400).json({ error: err.message || String(err) }));
}

// --- Auth ---
router.post('/auth/register', (req, res) => handle(clients.auth.Register(req.body), res, 201));
router.post('/auth/login', (req, res) => handle(clients.auth.Login(req.body), res));
router.get('/auth/me', authMiddleware, (req, res) =>
  handle(clients.auth.GetUserProfile({ userId: req.user.id }), res));
router.patch('/auth/me', authMiddleware, (req, res) =>
  handle(clients.auth.UpdateProfile({
    userId: req.user.id,
    username: req.body.username,
    avatarUrl: req.body.avatar_url,
    bio: req.body.bio,
  }), res));

// --- Catalog ---
router.get('/anime', (req, res) =>
  handle(clients.catalog.ListAnime({
    limit: parseInt(req.query.limit) || 50,
    offset: parseInt(req.query.offset) || 0,
    genre: req.query.genre || '',
  }), res));
router.get('/anime/search', (req, res) =>
  handle(clients.catalog.SearchAnime({ query: req.query.q || '', limit: parseInt(req.query.limit) || 20 }), res));
router.get('/anime/:id', (req, res) =>
  handle(clients.catalog.GetAnime({ anime_id: req.params.id }), res));
router.get('/anime/:id/episodes', (req, res) =>
  handle(clients.catalog.GetEpisodes({ anime_id: req.params.id }), res));
router.post('/admin/anime', authMiddleware, (req, res) =>
  handle(clients.catalog.CreateAnime(req.body), res, 201));
router.post('/admin/episodes', authMiddleware, (req, res) =>
  handle(clients.catalog.PublishEpisode(req.body), res, 201));

// --- Watchlist ---
router.get('/watchlist', authMiddleware, (req, res) =>
  handle(clients.watchlist.GetWatchlist({ user_id: req.user.id }), res));
router.post('/watchlist', authMiddleware, (req, res) =>
  handle(clients.watchlist.AddToWatchlist({ user_id: req.user.id, anime_id: req.body.anime_id }), res, 201));
router.delete('/watchlist/:animeId', authMiddleware, (req, res) =>
  handle(clients.watchlist.RemoveFromWatchlist({ user_id: req.user.id, anime_id: req.params.animeId }), res, 204));
router.patch('/watchlist/progress', authMiddleware, (req, res) =>
  handle(clients.watchlist.UpdateProgress({ user_id: req.user.id, ...req.body }), res));
router.get('/watchlist/progress/:animeId', authMiddleware, (req, res) =>
  handle(clients.watchlist.GetProgress({ user_id: req.user.id, anime_id: req.params.animeId }), res));

// --- Reviews ---
router.get('/anime/:id/reviews', (req, res) =>
  handle(clients.review.GetReviews({ anime_id: req.params.id, limit: parseInt(req.query.limit) || 50 }), res));
router.post('/reviews', authMiddleware, (req, res) =>
  handle(clients.review.CreateReview({ user_id: req.user.id, ...req.body }), res, 201));
router.post('/reviews/:id/like', authMiddleware, (req, res) =>
  handle(clients.review.LikeReview({ review_id: req.params.id, user_id: req.user.id }), res));
router.delete('/reviews/:id', authMiddleware, (req, res) =>
  handle(clients.review.DeleteReview({ review_id: req.params.id }), res, 204));

// --- Notifications ---
router.get('/notifications', authMiddleware, (req, res) =>
  handle(clients.notification.GetNotifications({ user_id: req.user.id, limit: parseInt(req.query.limit) || 50 }), res));
router.post('/notifications/:id/read', authMiddleware, (req, res) =>
  handle(clients.notification.MarkAsRead({ id: req.params.id }), res));
router.delete('/notifications/:id', authMiddleware, (req, res) =>
  handle(clients.notification.DeleteNotification({ id: req.params.id }), res, 204));

module.exports = router;
