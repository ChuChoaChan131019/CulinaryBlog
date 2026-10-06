import { customLogLevel, customProps, genReqId } from './logging.module';

describe('logging pino-http hooks', () => {
  it('reuses an existing X-Correlation-ID header and echoes it on the response', () => {
    const req: any = { headers: { 'x-correlation-id': 'existing-id' } };
    const res: any = { setHeader: jest.fn() };

    const id = genReqId(req, res);

    expect(id).toBe('existing-id');
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'existing-id');
    expect(req.startTime).toBeDefined();
  });

  it('generates a correlation id when the header is missing', () => {
    const req: any = { headers: {} };
    const res: any = { setHeader: jest.fn() };

    const id = genReqId(req, res);

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('includes correlationId, requestPath and userId when authenticated', () => {
    const req: any = { id: 'corr-1', url: '/api/v1/recipes', user: { id: 'user-1' } };

    expect(customProps(req)).toEqual({
      correlationId: 'corr-1',
      requestPath: '/api/v1/recipes',
      userId: 'user-1',
      traceId: null,
    });
  });

  it('includes a null userId when unauthenticated', () => {
    const req: any = { id: 'corr-2', url: '/api/v1/health' };

    expect(customProps(req)).toEqual({
      correlationId: 'corr-2',
      requestPath: '/api/v1/health',
      userId: null,
      traceId: null,
    });
  });

  it('warns when a request takes longer than 500ms', () => {
    const req: any = { startTime: Date.now() - 600 };
    const res: any = { statusCode: 200 };

    expect(customLogLevel(req, res)).toBe('warn');
  });

  it('stays at info level for fast, successful requests', () => {
    const req: any = { startTime: Date.now() - 10 };
    const res: any = { statusCode: 200 };

    expect(customLogLevel(req, res)).toBe('info');
  });

  it('escalates to error on 5xx responses regardless of duration', () => {
    const req: any = { startTime: Date.now() };
    const res: any = { statusCode: 500 };

    expect(customLogLevel(req, res)).toBe('error');
  });
});
