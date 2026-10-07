# vendor/

Thư mục chứa source code bên thứ ba được vendor vào repo qua **git submodule** — không phải code do nhóm viết, không sửa trực tiếp ở đây.

## vendor/minio

Submodule trỏ tới [PTUDW-2026-Nhom2/minio](https://github.com/PTUDW-2026-Nhom2/minio) (fork của [minio/minio](https://github.com/minio/minio)), chứa toàn bộ source server MinIO. Build thành image Docker qua `docker/minio/Dockerfile` (build trực tiếp từ source bằng `go build`, không qua Docker Hub).

### Vì sao vendor source thay vì pull image có sẵn

Image chính thức `minio/minio` trên Docker Hub đã bị MinIO Inc **khai tử**: archive 2026-02, xoá khỏi Docker Hub 2026-09-11 (MinIO Inc dồn lực sang sản phẩm thương mại AIStor). `docker-compose.yml` từng đổi qua 2 mirror không chính thức (`quay.io/minio/minio`, rồi `alphatran/minio`) — cả hai đều có rủi ro: không do MinIO hay GitHub org nào của nhóm kiểm soát, có thể bị gỡ bất kỳ lúc nào giống `minio/minio`, và `alphatran/minio` chỉ build amd64 (không chạy được trên runner CI arm64, QEMU emulation cũng không dùng được vì Go runtime của MinIO crash dưới user-mode QEMU).

Build từ source do nhóm tự vendor giải quyết cả hai vấn đề: không phụ thuộc registry ngoài có thể biến mất, và build native trên mọi kiến trúc (`go build` cross-compile bình thường, không cần multi-arch manifest hay QEMU).

### Vì sao dùng git submodule (không copy thẳng code vào repo)

- **Tách biệt lịch sử**: submodule chỉ lưu 1 con trỏ (commit SHA) tới repo `PTUDW-2026-Nhom2/minio`, không kéo theo toàn bộ lịch sử commit của MinIO (hàng chục nghìn commit) vào `git log` của `CulinaryBlog`.
- **Rõ ràng đây là code vendor, không phải code nhóm viết** — khác với `apps/`, `packages/`.
- **Cập nhật có kiểm soát**: muốn lấy bản MinIO mới hơn thì vào submodule, `git pull`, rồi commit lại con trỏ ở repo chính — không tự động đổi khi người khác pull `CulinaryBlog`.

### Lệnh thường dùng

```bash
# Clone CulinaryBlog lần đầu — phải thêm --recurse-submodules, nếu không vendor/minio sẽ trống
git clone --recurse-submodules <url-CulinaryBlog>

# Đã clone thường (quên --recurse-submodules) rồi mới nhớ ra
git submodule update --init --recursive

# Cập nhật submodule lên commit mới nhất của branch default trên PTUDW-2026-Nhom2/minio
git submodule update --remote vendor/minio
git add vendor/minio
git commit -m "chore(docker): cập nhật submodule minio lên commit mới"

# Kiểm tra submodule đang trỏ tới commit nào
git -C vendor/minio log -1 --oneline
```

> CI (`.github/workflows/ci.yml`) checkout bằng `submodules: recursive` nên không cần làm gì thêm — job build/run docker compose tự thấy `vendor/minio`.

### Không sửa code trong vendor/minio

Nếu cần patch MinIO (vd fix bug, thêm tính năng) — sửa và commit ở repo fork `PTUDW-2026-Nhom2/minio` trước, push lên đó, rồi quay lại đây chạy `git submodule update --remote` để lấy commit mới. Sửa trực tiếp trong `vendor/minio/` ở repo `CulinaryBlog` sẽ tạo trạng thái "dirty submodule" (detached, không trace được) và biến mất khi người khác `git submodule update`.
