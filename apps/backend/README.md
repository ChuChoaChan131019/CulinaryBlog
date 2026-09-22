# Backend

Backend NestJS được tổ chức theo khối tính năng:

| Thư mục | Nội dung |
| --- | --- |
| `src/modules/auth` | Đăng ký và xác thực người dùng |
| `src/modules/categories` | Danh mục công thức |
| `src/modules/recipes` | Tạo và xem danh sách công thức |
| `src/modules/media` | Upload và lưu trữ tệp |
| `src/infrastructure` | Kết nối database, schema, migration, cache và storage |
| `src/common` | Guard, decorator và thành phần dùng chung |

Handler của từng tính năng nằm trong `commands` hoặc `queries` của module tương ứng. Script tạo và kiểm tra dữ liệu mẫu nằm tại `scripts/seed.ts`; xem hướng dẫn chạy trong `README.md` ở thư mục gốc.

Từ thư mục gốc, kiểm tra backend bằng:

```bash
pnpm --filter backend typecheck
pnpm --filter backend lint
pnpm --filter backend exec jest --runInBand
pnpm --filter backend build
```
