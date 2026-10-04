import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor();
  const context = {} as ExecutionContext;

  function intercept(value: unknown) {
    const next: CallHandler = { handle: () => of(value) };
    return lastValueFrom(interceptor.intercept(context, next));
  }

  it('bọc object thành công trong data', async () => {
    await expect(intercept({ id: 'recipe-1' })).resolves.toEqual({
      data: { id: 'recipe-1' },
    });
  });

  it('bọc array không phân trang trong data', async () => {
    await expect(intercept([{ id: 'category-1' }])).resolves.toEqual({
      data: [{ id: 'category-1' }],
    });
  });

  it('tách items và metadata của PagedResult', async () => {
    await expect(
      intercept({
        items: [{ id: 'recipe-1' }],
        totalCount: 25,
        page: 2,
        pageSize: 12,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      }),
    ).resolves.toEqual({
      data: [{ id: 'recipe-1' }],
      meta: {
        totalCount: 25,
        page: 2,
        pageSize: 12,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
    });
  });

  it('giữ metadata khi danh sách phân trang rỗng', async () => {
    await expect(
      intercept({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 12,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      }),
    ).resolves.toMatchObject({
      data: [],
      meta: { page: 1, pageSize: 12, totalCount: 0, totalPages: 0 },
    });
  });

  it('không tạo body cho endpoint 204', async () => {
    await expect(intercept(undefined)).resolves.toBeUndefined();
  });

  it('truyền exception cho global exception filter', async () => {
    const error = new Error('database unavailable');
    const next: CallHandler = {
      handle: () => throwError(() => error),
    };

    await expect(
      lastValueFrom(interceptor.intercept(context, next)),
    ).rejects.toBe(error);
  });
});
