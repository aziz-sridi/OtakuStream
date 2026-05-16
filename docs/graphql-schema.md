# GraphQL Schema

Endpoint: `http://localhost:4000/graphql`

Pass JWT via `Authorization: Bearer <token>` for queries that require a user (`myWatchlist`, `myNotifications`).

## Why GraphQL here

The catalog has rich relationships (anime → episodes, anime → reviews, watchlist → anime). REST would either over-fetch or require multiple round-trips. With GraphQL the client picks exactly the fields needed, and the gateway resolves nested relations by calling the relevant gRPC services.

## Schema

```graphql
type Anime {
  id: ID!
  title: String!
  description: String
  coverUrl: String
  genres: [String!]!
  rating: Float
  episodeCount: Int
  episodes: [Episode!]!     # resolved via Catalog.GetEpisodes
  reviews: [Review!]!       # resolved via Review.GetReviews
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
  anime: Anime              # resolved via Catalog.GetAnime
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
```

## Example queries

Browse with minimal fields:

```graphql
{ anime(limit: 5) { id title rating } }
```

Anime detail with nested episodes and reviews:

```graphql
{
  animeById(id: "...") {
    title
    description
    episodes { number title }
    reviews { rating body createdAt }
  }
}
```

User's watchlist with embedded anime info:

```graphql
{
  myWatchlist {
    animeId status
    anime { title rating episodeCount }
  }
}
```
