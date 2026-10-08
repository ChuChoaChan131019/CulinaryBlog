import { ApiError } from '@/lib/api';

export function validateCategoryName(name: string): string | null {
  const value = name.trim();
  if (value.length < 2) return 'Tên danh mục phải có ít nhất 2 ký tự.';
  if (value.length > 50) return 'Tên danh mục không được dài quá 50 ký tự.';
  if (/[<>]/.test(value)) return 'Tên danh mục không được chứa HTML.';
  return null;
}

export function categoryErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Không thể kết nối tới máy chủ. Vui lòng thử lại.';
  }

  const errorType =
    error.problem?.type && error.problem.type !== 'about:blank'
      ? error.problem.type
      : error.code;
  if (errorType === 'CATEGORY_NAME_EXISTS') {
    return 'Tên danh mục đã tồn tại. Hãy chọn tên khác.';
  }
  if (errorType === 'CATEGORY_DELETE_HAS_RECIPES') {
    return error.message || 'Không thể xoá danh mục đang được dùng bởi công thức.';
  }
  if (errorType === 'CATEGORY_NOT_FOUND' || error.status === 404) {
    return 'Danh mục không tồn tại hoặc đã bị xoá. Hãy tải lại danh sách.';
  }
  if (error.status === 401) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }
  if (error.status === 403) {
    return 'Tài khoản hiện tại không có quyền quản lý danh mục.';
  }
  if (error.status === 422) {
    const fieldError = error.fieldErrors.name?.[0] ?? error.fieldErrors.description?.[0];
    return fieldError ?? 'Thông tin danh mục chưa hợp lệ.';
  }
  if (error.status >= 500) {
    return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
  }
  return error.message || 'Thao tác không thành công. Vui lòng thử lại.';
}
