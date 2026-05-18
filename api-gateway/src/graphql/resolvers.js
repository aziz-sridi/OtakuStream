const clients = require('../grpc-clients');

function mapAnime(a) {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    coverUrl: a.coverUrl,
    genres: a.genres || [],
    rating: a.rating,
    episodeCount: a.episodeCount,
  };
}

function mapEpisode(e) {
  return {
    id: e.id, animeId: e.animeId, number: e.number, title: e.title,
    durationSeconds: e.durationSeconds, publishedAt: e.publishedAt,
  };
}

function mapReview(r) {
  return {
    id: r.id, userId: r.userId, animeId: r.animeId, rating: r.rating,
    body: r.body, likes: r.likes, createdAt: r.createdAt,
  };
}

function mapWatchlist(w) {
  return { userId: w.userId, animeId: w.animeId, status: w.status, addedAt: w.addedAt };
}

function mapNotification(n) {
  return {
    id: n.id, userId: n.userId, type: n.type, title: n.title,
    body: n.body, read: n.read, createdAt: n.createdAt,
  };
}

function requireUser(ctx) {
  if (!ctx.user) throw new Error('authentication required');
  return ctx.user;
}

const resolvers = {
  Query: {
    async anime(_p, { limit, offset, genre }) {
      const res = await clients.catalog.ListAnime({ limit, offset, genre: genre || '' });
      return (res.items || []).map(mapAnime);
    },
    async animeById(_p, { id }) {
      const a = await clients.catalog.GetAnime({ animeId: id });
      return mapAnime(a);
    },
    async searchAnime(_p, { query, limit }) {
      const res = await clients.catalog.SearchAnime({ query, limit });
      return (res.items || []).map(mapAnime);
    },
    async myWatchlist(_p, _a, ctx) {
      const user = requireUser(ctx);
      const res = await clients.watchlist.GetWatchlist({ userId: user.id });
      return (res.items || []).map(mapWatchlist);
    },
    async myNotifications(_p, { limit }, ctx) {
      const user = requireUser(ctx);
      const res = await clients.notification.GetNotifications({ userId: user.id, limit });
      return (res.items || []).map(mapNotification);
    },
    async animeReviews(_p, { animeId, limit }) {
      const res = await clients.review.GetReviews({ animeId, limit });
      return (res.items || []).map(mapReview);
    },
  },

  Anime: {
    async episodes(parent) {
      const res = await clients.catalog.GetEpisodes({ animeId: parent.id });
      return (res.items || []).map(mapEpisode);
    },
    async reviews(parent) {
      const res = await clients.review.GetReviews({ animeId: parent.id, limit: 50 });
      return (res.items || []).map(mapReview);
    },
  },

  WatchlistEntry: {
    async anime(parent) {
      try {
        const a = await clients.catalog.GetAnime({ animeId: parent.animeId });
        return mapAnime(a);
      } catch {
        return null;
      }
    },
  },
};

module.exports = { resolvers };
