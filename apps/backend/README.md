# Backend architecture

The backend follows the four layers described in `Docs/SRS.md`:

| Layer | Location | Responsibility |
| --- | --- | --- |
| Domain | `src/domain` | User, category and recipe types plus slug rules without NestJS or database imports |
| Application | `src/application` | CQRS handlers, upload validation and repository/cache/storage interfaces |
| Infrastructure | `src/infrastructure` | Drizzle repositories, transactions, Argon2, Redis and MinIO |
| Presentation | `src/modules`, `src/common/guards` | HTTP controllers, validation DTOs, guards and Nest module wiring |

The controllers keep their existing `/categories`, `/recipes`, `/auth` and `/media` routes. Nest modules bind Application tokens to Infrastructure implementations. Existing paths under `src/modules` re-export moved classes so older imports remain valid.

From the workspace root, run `pnpm --filter backend typecheck`, `pnpm --filter backend test --runInBand`, and `pnpm --filter backend build`. Database seed and verification instructions are in the root `README.md`.
