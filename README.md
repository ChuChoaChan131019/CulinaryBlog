# Culinary Blog

Nền tảng chia sẻ công thức nấu ăn — đồ án học phần Phát triển ứng dụng web nâng cao.

## Tech stack

| Layer | Công nghệ |
|---|---|
| Backend | NestJS 11 (CommonJS + Jest), Clean Architecture + CQRS |
| Frontend | Next.js App Router, TypeScript, Tailwind |
| Database | PostgreSQL 16 + Drizzle ORM, Full-Text Search tiếng Việt (`tsvector` + unaccent) |
| Cache / Jobs | Redis 7 (ioredis), BullMQ |
| Storage | MinIO (S3-compatible) |
| Auth | JWT (access 15m, refresh 7d có rotation) + Google OAuth 2.0 |
| Observability | Pino, OpenTelemetry, lỗi theo RFC 7807 |

## Chạy dự án

Yêu cầu: Node >= 20, pnpm 12, Docker.

```bash
git submodule update --init --recursive   # vendor/minio — xem vendor/README.md
pnpm install
cp .env.example .env
```

**Local dev**

```bash
pnpm dev        # backend + frontend song song
pnpm dev:be     # chỉ backend
pnpm dev:fe     # chỉ frontend  -> http://localhost:3000
```

> macOS: port 5000 bị AirPlay Receiver chiếm, đổi `BACKEND_PORT=5050` trong `.env`.

**Docker — dev (chỉ hạ tầng: Postgres, Redis, MinIO)**

```bash
pnpm docker:up      # backend/frontend vẫn chạy local qua `pnpm dev` (hot reload)
pnpm docker:down
```

**Docker — prod (full stack đóng container, kèm nginx)**

```bash
pnpm docker:prod:up      # http://localhost  (/ -> frontend, /api/ -> backend), build backend/frontend/nginx
pnpm docker:prod:down
```

> `docker-compose.yml` là hạ tầng dùng chung; `docker-compose.prod.yml` là overlay thêm backend/frontend/nginx — `docker:prod:*` tự ghép 2 file này (`-f docker-compose.yml -f docker-compose.prod.yml`).

## Scripts

| Lệnh | Mô tả |
|---|---|
| `pnpm build` | Build toàn workspace |
| `pnpm lint` | Lint toàn workspace |
| `pnpm typecheck` | Typecheck toàn workspace |
| `pnpm db:generate` | Sinh migration Drizzle |
| `pnpm db:migrate` | Chạy migration |
| `pnpm db:seed` | Tạo dữ liệu mẫu lab 2, có thể chạy lại mà không tạo bản ghi trùng |
| `pnpm db:verify` | Truy vấn database để kiểm tra số lượng và số recipe thiếu nguyên liệu/bước |
| `pnpm --filter backend test` | Unit test backend |

### Dữ liệu mẫu lab 2

Từ thư mục gốc, chạy trong PowerShell (thay thông tin kết nối nếu bạn đã đổi `.env`):

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d postgres
$env:DATABASE_URL = 'postgresql://culinary:culinary_dev_password@localhost:5432/culinary_blog'
pnpm db:migrate
pnpm db:seed
pnpm db:verify
```

Script seed tạo một tác giả mẫu (không có mật khẩu đăng nhập), dùng 20 danh mục có tên tự nhiên và tạo 100 công thức; mỗi công thức có 10–12 nguyên liệu và 5–7 bước. Công thức mẫu có slug bắt đầu bằng `lab2-`; chạy lại sẽ thêm bản ghi còn thiếu, đồng bộ tên hiển thị của tác giả, danh mục, công thức hiện có và ẩn các danh mục `Lab 2` cũ mà không xóa dữ liệu. `db:verify` truy vấn số danh mục, số công thức và số công thức có dưới 10 nguyên liệu hoặc dưới 5 bước. Nếu `DATABASE_URL` trỏ tới PostgreSQL ở máy khác, đặt biến môi trường đó trước khi chạy ba lệnh `db:*`.

## Cấu trúc

```
apps/
  backend/src/{modules,infrastructure,common}/   # NestJS
  frontend/src/{app,components,lib}/             # Next.js
packages/
  shared/    # @culinary/shared — DTO types dùng chung BE <-> FE
  config/    # tsconfig.base.json
nginx/       # reverse proxy config
docker/minio/  # Dockerfile build MinIO server từ source
vendor/minio/  # git submodule — source MinIO (xem vendor/README.md)
```

## License

[MIT](LICENSE)
