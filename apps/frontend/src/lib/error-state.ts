import { ApiError } from "./api";

export interface ErrorStateInfo {
  status?: number;
  code?: string;
  message?: string;
}

/** Chuyển lỗi API về dữ liệu an toàn để truyền cho Client Component. */
export function toErrorStateInfo(error: unknown): ErrorStateInfo {
  if (!(error instanceof ApiError)) return {};

  return {
    status: error.status,
    code: error.code,
    // Không đưa detail của lỗi 5xx lên giao diện; server có thể chứa thông tin nhạy cảm.
    message: error.status >= 500 ? undefined : error.message,
  };
}

export function getErrorStateMessage(error?: ErrorStateInfo): string {
  switch (error?.status) {
    case 401:
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi thử lại.";
    case 403:
      return "Bạn không có quyền xem nội dung này.";
    case 404:
      return "Nội dung không còn tồn tại hoặc đã được chuyển đi.";
    case 429:
      return "Có quá nhiều yêu cầu. Vui lòng chờ một lát rồi thử lại.";
    default:
      return error?.message ?? "Máy chủ đang bận hoặc kết nối bị gián đoạn. Vui lòng thử lại.";
  }
}
