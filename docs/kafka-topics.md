# Kafka Topics

Broker: KRaft-mode Kafka, internal `kafka:9092`, external `localhost:9094`. Auto-create topics is enabled.

| Topic | Producer | Consumer(s) | Trigger | Payload |
|---|---|---|---|---|
| `user.registered` | auth | notification | New account created | `{user_id, username, email, created_at}` |
| `episode.published` | catalog | notification, watchlist | Admin publishes episode | `{episode_id, anime_id, anime_title, number, title, published_at}` |
| `progress.updated` | watchlist | notification | User updates watch progress | `{user_id, anime_id, episode_id, position_seconds, completed, updated_at}` |
| `anime.completed` | watchlist | review | Progress marked completed | `{user_id, anime_id, completed_at}` |
| `review.posted` | review | notification | User posts a review | `{review_id, user_id, anime_id, rating}` |

## Consumer groups

- `notification-service` — subscribed to 4 topics, persists per-user notifications
- `watchlist-service` — subscribed to `episode.published` for fan-out logic
- `review-service` — subscribed to `anime.completed` to prompt reviews

All producers are best-effort: failures are logged but do not block the originating gRPC call.
