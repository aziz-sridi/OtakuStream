# OtakuStream

Microservices anime streaming platform — 5 services + API Gateway, communicating over gRPC, exposed via REST + GraphQL, with Kafka for async events.

## Stack

- **Node.js 20** across all services
- **gRPC** (`@grpc/grpc-js`) between gateway and services
- **REST** (Express) and **GraphQL** (Apollo) at the gateway
- **Kafka** (Apache image, KRaft mode) for async events
- **SQLite** (`better-sqlite3`) for Auth + Catalog
- **RxDB** (`storage-memory` + JSON-dump persistence) for Watchlist + Review + Notification
- **Docker Compose** orchestrates the full stack

## Quick start

```bash
docker compose up --build
```

Then:

- REST: <http://localhost:4000/api>
- GraphQL Playground: <http://localhost:4000/graphql>
- Health: <http://localhost:4000/health>

Smoke test:

```bash
# register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"pw"}'

# list anime (no auth)
curl http://localhost:4000/api/anime?limit=5
```

GraphQL example:

```graphql
query {
  anime(limit: 3) {
    title
    rating
    episodes { number title }
  }
}
```

## Repo layout

```
otakustream/
├── docker-compose.yml
├── proto/                          # shared gRPC contracts
├── api-gateway/                    # REST + GraphQL + gRPC clients
└── services/
    ├── auth-service/               # SQLite + JWT + bcrypt
    ├── catalog-service/            # SQLite + 20 seeded anime
    ├── watchlist-service/          # RxDB + Kafka producer/consumer
    ├── review-service/             # RxDB + Kafka producer/consumer
    └── notification-service/       # RxDB + Kafka consumer (4 topics)
```

## Service ports

| Service | gRPC | HTTP |
|---|---|---|
| api-gateway | — | 4000 |
| auth-service | 50051 | — |
| catalog-service | 50052 | — |
| watchlist-service | 50053 | — |
| review-service | 50054 | — |
| notification-service | 50055 | — |
| kafka | 9092 (internal), 9094 (external) | — |

## Kafka topics

| Topic | Producer | Consumer(s) |
|---|---|---|
| `user.registered` | auth | notification |
| `episode.published` | catalog | notification, watchlist |
| `progress.updated` | watchlist | notification |
| `anime.completed` | watchlist | review |
| `review.posted` | review | notification |

See [docs/kafka-topics.md](docs/kafka-topics.md) for payload schemas.

## Documentation

- [docs/architecture.md](docs/architecture.md)
- [docs/rest-endpoints.md](docs/rest-endpoints.md)
- [docs/graphql-schema.md](docs/graphql-schema.md)
- [docs/kafka-topics.md](docs/kafka-topics.md)
- [docs/databases.md](docs/databases.md)

## Local development (without Docker)

Each service runs standalone:

```bash
cd services/auth-service
npm install
KAFKA_BROKERS=localhost:9094 npm start
```

The gateway expects services on `localhost:5005x` by default; override with `*_GRPC` env vars.
