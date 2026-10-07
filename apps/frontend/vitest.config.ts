import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Khớp alias "@/*" -> "./src/*" khai báo ở tsconfig.json, vitest không tự đọc tsconfig paths.
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    // Node thuần: các test hiện tại chỉ chạm lớp dữ liệu, `window`/`localStorage` được
    // stub ngay trong file test nên không cần thêm jsdom/happy-dom.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
