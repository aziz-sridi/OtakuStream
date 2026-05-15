const gql = require('graphql-tag');

const typeDefs = gql`
  type Anime {
    id: ID!
    title: String!
    description: String
    coverUrl: String
    genres: [String!]!
    rating: Float
    episodeCount: Int
    episodes: [Episode!]!
    reviews: [Review!]!
  }

  type Episode {
    id: ID!
    animeId: ID!
    number: Int!
    title: String!
    durationSeconds: Int
    publishedAt: String
  }

  type Review {
    id: ID!
    userId: ID!
    animeId: ID!
    rating: Int!
    body: String
    likes: Int
    createdAt: String
  }

  type WatchlistEntry {
    userId: ID!
    animeId: ID!
    status: String
    addedAt: String
    anime: Anime
  }

  type Notification {
    id: ID!
    userId: ID!
    type: String!
    title: String!
    body: String
    read: Boolean!
    createdAt: String
  }

  type Query {
    anime(limit: Int = 50, offset: Int = 0, genre: String): [Anime!]!
    animeById(id: ID!): Anime
    searchAnime(query: String!, limit: Int = 20): [Anime!]!
    myWatchlist: [WatchlistEntry!]!
    myNotifications(limit: Int = 50): [Notification!]!
    animeReviews(animeId: ID!, limit: Int = 50): [Review!]!
  }
`;

module.exports = { typeDefs };
