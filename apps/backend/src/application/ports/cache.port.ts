export const CACHE_PORT = Symbol('CACHE_PORT');

export interface CachePort {
  get<T>(key: string, ttlSeconds: number): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}
