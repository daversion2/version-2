import { withTimeout } from '../withTimeout';

describe('withTimeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('passes a settled promise through', async () => {
    await expect(withTimeout(Promise.resolve(3), 1000)).resolves.toBe(3);
    await expect(withTimeout(Promise.reject(new Error('nope')), 1000)).rejects.toThrow('nope');
  });

  it('gives up on one that never settles', async () => {
    const result = withTimeout(new Promise(() => {}), 15000);
    jest.advanceTimersByTime(15000);
    await expect(result).rejects.toThrow('timeout');
  });
});
