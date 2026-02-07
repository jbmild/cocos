import { cancelOrderParamsSchema } from '../cancelOrderValidators';

describe('cancelOrderValidators', () => {
  describe('cancelOrderParamsSchema', () => {
    it('should validate valid orderId', () => {
      const result = cancelOrderParamsSchema.parse({ orderId: '123' });
      expect(result.orderId).toBe(123);
    });

    it('should transform string number to number', () => {
      const result = cancelOrderParamsSchema.parse({ orderId: '999' });
      expect(typeof result.orderId).toBe('number');
      expect(result.orderId).toBe(999);
    });

    it('should reject non-numeric orderId', () => {
      expect(() => cancelOrderParamsSchema.parse({ orderId: 'abc' })).toThrow();
    });

    it('should reject negative orderId', () => {
      expect(() => cancelOrderParamsSchema.parse({ orderId: '-1' })).toThrow();
    });

    it('should reject empty orderId', () => {
      expect(() => cancelOrderParamsSchema.parse({ orderId: '' })).toThrow();
    });

    it('should reject missing orderId', () => {
      expect(() => cancelOrderParamsSchema.parse({})).toThrow();
    });
  });
});
