# Build MinIO server trực tiếp từ source (git submodule vendor/minio, fork
# PTUDW-2026-Nhom2/minio) thay vì pull image minio/minio trên Docker Hub —
# image đó đã bị archive (2026-02) và xoá khỏi Docker Hub (2026-09-11).
# Xem vendor/README.md để biết lý do vendor bằng git submodule.
FROM golang:1.24-alpine AS build

RUN apk add --no-cache git make bash

WORKDIR /src
COPY vendor/minio .

# CGO_ENABLED=0: binary tĩnh, chạy được trên alpine runtime không cần glibc.
# tag kqueue: giữ đúng flag build chính thức của MinIO (buildscripts/Makefile).
RUN CGO_ENABLED=0 go build -tags kqueue -trimpath -ldflags "-s -w" -o /out/minio .

FROM alpine:3.20

RUN apk add --no-cache ca-certificates curl

COPY --from=build /out/minio /usr/bin/minio
COPY vendor/minio/dockerscripts/docker-entrypoint.sh /usr/bin/docker-entrypoint.sh
RUN chmod +x /usr/bin/docker-entrypoint.sh /usr/bin/minio

ENTRYPOINT ["/usr/bin/docker-entrypoint.sh"]
VOLUME ["/data"]
EXPOSE 9000 9001
CMD ["minio"]
