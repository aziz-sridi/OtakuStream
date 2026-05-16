# REST Endpoints

Base path: `http://localhost:4000/api`

Auth: `Authorization: Bearer <jwt>` (from `/auth/login` or `/auth/register`).

## Auth

| Method | Path | Auth | Body / Description |
|---|---|---|---|
| POST | `/auth/register` | — | `{username, email, password}` → `{token, user}` |
| POST | `/auth/login` | — | `{email, password}` → `{token, user}` |
| GET | `/auth/me` | yes | Current user profile |
| PATCH | `/auth/me` | yes | `{username?, avatar_url?, bio?}` |

## Catalog

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/anime?limit=&offset=&genre=` | — | List anime |
| GET | `/anime/search?q=&limit=` | — | Search |
| GET | `/anime/:id` | — | Single anime |
| GET | `/anime/:id/episodes` | — | All episodes |
| POST | `/admin/anime` | yes | `{title, description, cover_url, genres[]}` |
| POST | `/admin/episodes` | yes | `{anime_id, number, title, duration_seconds}` → fires `episode.published` |

## Watchlist

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/watchlist` | yes | Current user's list |
| POST | `/watchlist` | yes | `{anime_id}` |
| DELETE | `/watchlist/:animeId` | yes | Remove |
| PATCH | `/watchlist/progress` | yes | `{anime_id, episode_id, position_seconds, completed}` → fires `progress.updated` (and `anime.completed` if `completed=true`) |
| GET | `/watchlist/progress/:animeId` | yes | Current progress |

## Reviews

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/anime/:id/reviews?limit=` | — | All reviews for an anime |
| POST | `/reviews` | yes | `{anime_id, rating, body}` → fires `review.posted` |
| POST | `/reviews/:id/like` | yes | Like |
| DELETE | `/reviews/:id` | yes | Delete |

## Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications?limit=` | yes | User's notifications, newest first |
| POST | `/notifications/:id/read` | yes | Mark read |
| DELETE | `/notifications/:id` | yes | Delete |
