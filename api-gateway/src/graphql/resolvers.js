const clients = require('../grpc-clients');

function mapAnime(a) {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    coverUrl: a.cover_url,
    genres: a.genres || [],
    rating: a.rating,
    episodeCount: a.episode_count,
  };
}

function mapEpisode(e) {
  return {
    id: e.id, animeId: e.anime_id, number: e.number, title: e.title,
    durationSeconds: e.duration_seconds, publishedAt: e.published_at,
  };
}

function mapReview(r) {
  return {
    id: r.id, userId: r.user_id, animeId: r.anime_id, rating: r.rating,
    body: r.body, likes: r.likes, createdAt: r.created_at,
  };
}

function mapWatchlist(w) {
  return { userId: w.user_id, animeId: w.anime_id, status: w.status, addedAt: w.added_at };
}

function mapNotification(n) {
  return {
    id: n.id, userId: n.user_id, type: n.type, title: n.title,
    body: n.body, read: n.read, createdAt: n.created_at,
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
      const a = await clients.catalog.GetAnime({ anime_id: id });
      return mapAnime(a);
    },
    async searchAnime(_p, { query, limit }) {
      const res = await clients.catalog.SearchAnime({ query, limit });
      return (res.items || []).map(mapAnime);
    },
    async myWatchlist(_p, _a, ctx) {
      const user = requireUser(ctx);
      const res = await clients.watchlist.GetWatchlist({ user_id: user.id });
      return (res.items || []).map(mapWatchlist);
    },
    async myNotifications(_p, { limit }, ctx) {
      const user = requireUser(ctx);
      const res = await clients.notification.GetNotifications({ user_id: user.id, limit });
      return (res.items || []).map(mapNotification);
    },
    async animeReviews(_p, { animeId, limit }) {
      const res = await clients.review.GetReviews({ anime_id: animeId, limit });
      return (res.items || []).map(mapReview);
    },
  },

  Anime: {
    async episodes(parent) {
      const res = await clients.catalog.GetEpisodes({ anime_id: parent.id });
      return (res.items || []).map(mapEpisode);
    },
    async reviews(parent) {
      const res = await clients.review.GetReviews({ anime_id: parent.id, limit: 50 });
      return (res.items || []).map(mapReview);
    },
  },

  WatchlistEntry: {
    async anime(parent) {
      try {
        const a = await clients.catalog.GetAnime({ anime_id: parent.animeId });
        return mapAnime(a);
      } catch {
        return null;
      }
    },
  },
};

module.exports = { resolvers };
