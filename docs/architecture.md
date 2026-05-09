# Architecture

```
                   ┌──────────────────────────────────────┐
                   │              CLIENT                  │
                   │   (REST + GraphQL via HTTP/1.1)      │
                   └─────────────┬────────────────────────┘
                                 │
                                 ▼
                   ┌──────────────────────────────────────┐
                   │            API GATEWAY               │
                   │   Express (REST) + Apollo (GraphQL)  │
                   │   JWT validation via Auth.gRPC       │
                   └─────────────┬────────────────────────┘
                                 │ gRPC (HTTP/2 + Protobuf)
       ┌──────────────┬──────────┼──────────┬──────────────┐
       ▼              ▼          ▼          ▼              ▼
  ┌─────────┐   ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐
  │  Auth   │   │ Catalog  │ │Watchlist │ │ Review │ │ Notification │
  │ SQLite  │   │  SQLite  │ │  NoSQL   │ │ NoSQL  │ │    NoSQL     │
  └────┬────┘   └────┬─────┘ └────┬─────┘ └───┬────┘ └──────┬───────┘
       │             │            │           │             │
       │ produces    │ produces   │ produces  │ produces    │ consumes
       │ user.       │ episode.   │ progress. │ review.     │ 4 topics
       │ registered  │ published  │ updated   │ posted      │
       │             │            │ anime.    │             │
       │             │            │ completed │             │
       └─────────────┴────────────┴───────────┴─────────────┘
                                 │
                                 ▼
                       ┌──────────────────┐
                       │   KAFKA BROKER   │
                       │  (KRaft mode)    │
                       └──────────────────┘
```

## Communication layers

| From → To | Protocol | Format | Why |
|---|---|---|---|
| Client → Gateway | HTTP/1.1 | JSON (REST) or GraphQL | Browser-friendly, no special tooling |
| Gateway → Service | HTTP/2 | Protobuf (gRPC) | Strict contracts, efficient binary, streaming-ready |
| Service ↔ Service | TCP | JSON over Kafka | Async, decoupled, fan-out |

## Why each protocol earns its place

- **gRPC** is the internal contract. Every service-to-service call goes through a `.proto` file. Adding a field is a deliberate schema change, not a JSON ad-hoc.
- **REST** is the canonical resource-shaped public surface — easy for Postman, curl, and React clients.
- **GraphQL** justifies its weight on the catalog: fetching an anime with its episodes and recent reviews would be 3 REST calls; one GraphQL query resolves them all and the client picks which fields it actually wants.
- **Kafka** carries events that genuinely cross service boundaries: a user finishing an anime fires `anime.completed`, the review service prompts a review, and the notification service queues a message — none of them need to know about each other.
