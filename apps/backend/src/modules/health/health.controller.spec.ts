import { HealthController } from './health.controller';

describe('HealthController', () => {
  function buildResponse() {
    return { status: jest.fn().mockReturnThis(), json: jest.fn() };
  }

  function buildController(dbOk: boolean, redisOk: boolean, minioOk: boolean) {
    const db = { execute: dbOk ? jest.fn().mockResolvedValue(undefined) : jest.fn().mockRejectedValue(new Error('down')) };
    const cache = { isHealthy: jest.fn().mockResolvedValue(redisOk) };
    const fileStorage = { isHealthy: jest.fn().mockResolvedValue(minioOk) };
    return new HealthController(db as never, cache as never, fileStorage as never);
  }

  it('returns 200 Healthy when all components are up', async () => {
    const controller = buildController(true, true, true);
    const res = buildResponse();

    await controller.health(res as never);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'Healthy',
      entries: {
        database: { status: 'Healthy' },
        redis: { status: 'Healthy' },
        minio: { status: 'Healthy' },
      },
    });
  });

  it('returns 503 Unhealthy when a component is down', async () => {
    const controller = buildController(true, false, true);
    const res = buildResponse();

    await controller.health(res as never);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'Unhealthy' }));
  });

  it('always returns 200 for the liveness probe', () => {
    const controller = buildController(false, false, false);
    const res = buildResponse();

    controller.live(res as never);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 503 for readiness when Postgres is down', async () => {
    const controller = buildController(false, true, true);
    const res = buildResponse();

    await controller.ready(res as never);

    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('returns 503 for readiness when Redis is down', async () => {
    const controller = buildController(true, false, true);
    const res = buildResponse();

    await controller.ready(res as never);

    expect(res.status).toHaveBeenCalledWith(503);
  });
});
