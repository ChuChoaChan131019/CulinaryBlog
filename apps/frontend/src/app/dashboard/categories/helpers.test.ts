import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { categoryErrorMessage, validateCategoryName } from './helpers';

describe('category dashboard helpers', () => {
  it('validates the category name using the backend constraints', () => {
    expect(validateCategoryName(' A ')).toContain('ít nhất 2');
    expect(validateCategoryName('<script>')).toContain('HTML');
    expect(validateCategoryName('Món Việt')).toBeNull();
  });

  it('maps duplicate names to a clear message', () => {
    const error = new ApiError(409, {
      type: 'CATEGORY_NAME_EXISTS',
      title: 'Tên danh mục đã tồn tại',
      status: 409,
      detail: 'name đã tồn tại',
    });

    expect(categoryErrorMessage(error)).toBe('Tên danh mục đã tồn tại. Hãy chọn tên khác.');
  });

  it('keeps the backend recipe count message for blocked deletes', () => {
    const error = new ApiError(409, {
      type: 'CATEGORY_DELETE_HAS_RECIPES',
      title: 'Không thể xóa danh mục',
      status: 409,
      detail: 'Danh mục còn chứa 2 công thức.',
    });

    expect(categoryErrorMessage(error)).toBe('Danh mục còn chứa 2 công thức.');
  });
});
