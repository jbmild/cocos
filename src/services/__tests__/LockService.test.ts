import { LockService } from '../LockService';
import { QueryRunner } from 'typeorm';

describe('LockService', () => {
  let mockQueryRunner: jest.Mocked<QueryRunner>;

  beforeEach(() => {
    mockQueryRunner = {
      query: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('acquireUserLock', () => {
    it('should call pg_advisory_lock with userId', async () => {
      mockQueryRunner.query = jest.fn().mockResolvedValue([]);

      await LockService.acquireUserLock(mockQueryRunner, 123);

      expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_advisory_lock($1)', [123]);
      expect(mockQueryRunner.query).toHaveBeenCalledTimes(1);
    });

    it('should handle different userIds', async () => {
      mockQueryRunner.query = jest.fn().mockResolvedValue([]);

      await LockService.acquireUserLock(mockQueryRunner, 1);
      await LockService.acquireUserLock(mockQueryRunner, 999);

      expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_advisory_lock($1)', [1]);
      expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_advisory_lock($1)', [999]);
    });
  });

  describe('tryAcquireUserLock', () => {
    it('should return true when lock is acquired', async () => {
      mockQueryRunner.query = jest.fn().mockResolvedValue([{ acquired: true }]);

      const result = await LockService.tryAcquireUserLock(mockQueryRunner, 123);

      expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_try_advisory_lock($1) as acquired', [123]);
      expect(result).toBe(true);
    });

    it('should return false when lock cannot be acquired', async () => {
      mockQueryRunner.query = jest.fn().mockResolvedValue([{ acquired: false }]);

      const result = await LockService.tryAcquireUserLock(mockQueryRunner, 123);

      expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_try_advisory_lock($1) as acquired', [123]);
      expect(result).toBe(false);
    });

    it('should return false when result is undefined', async () => {
      mockQueryRunner.query = jest.fn().mockResolvedValue([{}]);

      const result = await LockService.tryAcquireUserLock(mockQueryRunner, 123);

      expect(result).toBe(false);
    });

    it('should return false when result array is empty', async () => {
      mockQueryRunner.query = jest.fn().mockResolvedValue([]);

      const result = await LockService.tryAcquireUserLock(mockQueryRunner, 123);

      expect(result).toBe(false);
    });
  });

  describe('releaseUserLock', () => {
    it('should call pg_advisory_unlock with userId', async () => {
      mockQueryRunner.query = jest.fn().mockResolvedValue([]);

      await LockService.releaseUserLock(mockQueryRunner, 123);

      expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1)', [123]);
      expect(mockQueryRunner.query).toHaveBeenCalledTimes(1);
    });

    it('should handle different userIds', async () => {
      mockQueryRunner.query = jest.fn().mockResolvedValue([]);

      await LockService.releaseUserLock(mockQueryRunner, 1);
      await LockService.releaseUserLock(mockQueryRunner, 999);

      expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1)', [1]);
      expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1)', [999]);
    });
  });
});
