import { corsOrigins } from './cors-origins';

describe('corsOrigins', () => {
  it('tách danh sách origin và bỏ khoảng trắng', () => {
    expect(corsOrigins('http://localhost:3000, https://culinary.test')).toEqual([
      'http://localhost:3000',
      'https://culinary.test',
    ]);
  });

  it('fail-closed khi biến không được set hoặc rỗng', () => {
    expect(corsOrigins(undefined)).toBe(false);
    expect(corsOrigins('')).toBe(false);
    expect(corsOrigins(' , ')).toBe(false);
  });
});
