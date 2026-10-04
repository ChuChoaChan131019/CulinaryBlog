import { describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiGetPaged,
  parse,
  parsePaged,
  unwrap,
} from './api';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('API response envelope', () => {
  it('bóc data của response thông thường', () => {
    expect(unwrap<{ id: string }>({ data: { id: 'recipe-1' } })).toEqual({
      id: 'recipe-1',
    });
  });

  it('từ chối response thành công không có envelope', async () => {
    await expect(parse(json({ id: 'recipe-1' }))).rejects.toThrow(
      'Response API không đúng envelope',
    );
  });

  it('giữ data và meta của response phân trang', async () => {
    const response = await parsePaged<{ id: string }>(
      json({
        data: [{ id: 'recipe-1' }],
        meta: {
          totalCount: 1,
          page: 1,
          pageSize: 12,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      }),
    );

    expect(response.data).toEqual([{ id: 'recipe-1' }]);
    expect(response.meta).toMatchObject({ page: 1, totalPages: 1 });
  });

  it('từ chối response phân trang thiếu metadata bắt buộc', async () => {
    await expect(
      parsePaged(json({ data: [], meta: { page: 1, pageSize: 12 } })),
    ).rejects.toThrow('Response API phân trang không đúng envelope');
  });

  it('trả undefined cho response 204', async () => {
    await expect(parse(new Response(null, { status: 204 }))).resolves.toBeUndefined();
  });

  it('giữ Problem Details khi API trả lỗi', async () => {
    const error = await parse(
      json(
        {
          type: 'about:blank',
          title: 'Dữ liệu không hợp lệ',
          status: 422,
          detail: 'VALIDATION_ERROR',
        },
        422,
      ),
    ).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
  });

  it('apiGetPaged gửi query và trả metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({
        data: [],
        meta: {
          totalCount: 0,
          page: 2,
          pageSize: 12,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    try {
      const response = await apiGetPaged('/recipes', { page: 2 });
      expect(response.meta.page).toBe(2);
      expect(String(fetchMock.mock.calls[0][0])).toContain('/recipes?page=2');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
