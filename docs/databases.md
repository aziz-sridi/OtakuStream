# Databases

Each microservice owns its data — no service reads another's database directly. Two engines are used per the project spec:

- **SQL** via SQLite (`better-sqlite3`) for relational data (users, anime catalog)
- **NoSQL** via **RxDB** (in-memory storage with JSON dump persistence) for document data (watchlist, reviews, notifications)

| Service | Engine | Type | Persistence |
|---|---|---|---|
| auth-service | SQLite (`better-sqlite3`) | SQL | `services/auth-service/data/auth.db` |
| catalog-service | SQLite (`better-sqlite3`) | SQL | `services/catalog-service/data/catalog.db` |
| watchlist-service | RxDB (`storage-memory`) | NoSQL doc | `services/watchlist-service/data/rxdb-dump.json` |
| review-service | RxDB (`storage-memory`) | NoSQL doc | `services/review-service/data/rxdb-dump.json` |
| notification-service | RxDB (`storage-memory`) | NoSQL doc | `services/notification-service/data/rxdb-dump.json` |

RxDB runs against the in-memory storage adapter for fast cold-starts; each service exports its state to a JSON dump on graceful shutdown (`SIGTERM`/`SIGINT`/`beforeExit`) and re-imports it on next start.

## SQL schemas

### auth.users

| Column | Type |
|---|---|
| id | TEXT PK |
| username | TEXT UNIQUE |
| email | TEXT UNIQUE |
| password_hash | TEXT |
| avatar_url | TEXT |
| bio | TEXT |
| created_at | TEXT (ISO-8601) |

### catalog.anime

| Column | Type |
|---|---|
| id | TEXT PK |
| title | TEXT |
| description | TEXT |
| cover_url | TEXT |
| genres | TEXT (JSON array) |
| rating | REAL |
| created_at | TEXT |

### catalog.episodes

| Column | Type |
|---|---|
| id | TEXT PK |
| anime_id | TEXT FK |
| number | INTEGER |
| title | TEXT |
| duration_seconds | INTEGER |
| published_at | TEXT |

## RxDB collections

Each collection is defined with a JSON schema (typed properties, required fields, indexes) and a primary key. Composite keys are declared via the `{ key, fields, separator }` form so RxDB derives the primary id from natural uniqueness.

### watchlist.watchlist

```json
{
  "primaryKey": { "key": "id", "fields": ["user_id", "anime_id"], "separator": "|" },
  "properties": {
    "user_id": "string",
    "anime_id": "string",
    "status":  "string (watching|completed)",
    "added_at": "string (ISO-8601)"
  },
  "indexes": ["user_id", "anime_id"]
}
```

### watchlist.progress

```json
{
  "primaryKey": { "key": "id", "fields": ["user_id", "anime_id"], "separator": "|" },
  "properties": {
    "user_id": "string",
    "anime_id": "string",
    "episode_id": "string",
    "position_seconds": "number",
    "completed": "boolean",
    "updated_at": "string (ISO-8601)"
  },
  "indexes": ["user_id"]
}
```

### review.reviews

```json
{
  "primaryKey": "id",
  "properties": {
    "id": "string (uuid)",
    "user_id": "string",
    "anime_id": "string",
    "rating":  "number (1..10)",
    "body":    "string",
    "likes":   "number",
    "likedBy": "string[]",
    "created_at": "string (ISO-8601)"
  },
  "indexes": ["anime_id", "created_at"]
}
```

### notification.notifications

```json
{
  "primaryKey": "id",
  "properties": {
    "id": "string (uuid)",
    "user_id": "string",
    "type":  "string (welcome|progress|review)",
    "title": "string",
    "body":  "string",
    "read":  "boolean",
    "created_at": "string (ISO-8601)"
  },
  "indexes": ["user_id", "created_at"]
}
```
