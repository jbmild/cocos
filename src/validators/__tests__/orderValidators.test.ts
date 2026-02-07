import { createOrderSchema } from '../orderValidators';
import { OrderSide } from '../../enums/OrderSide';
import { OrderType } from '../../enums/OrderType';

describe('orderValidators', () => {
  describe('createOrderSchema', () => {
    it('should validate valid MARKET BUY order with size', () => {
      const input = {
        userId: '3',
        instrumentId: '47',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: '10',
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.userId).toBe(3);
        expect(result.data.instrumentId).toBe(47);
        expect(result.data.side).toBe(OrderSide.BUY);
        expect(result.data.type).toBe(OrderType.MARKET);
        expect(result.data.size).toBe(10);
      }
    });

    it('should validate valid MARKET BUY order with amount', () => {
      const input = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        amount: 10000,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(10000);
        expect(result.data.type).toBe(OrderType.MARKET);
      }
    });

    it('should validate valid LIMIT BUY order with size and price', () => {
      const input = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        size: 20,
        price: 900,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.size).toBe(20);
        expect(result.data.price).toBe(900);
        expect(result.data.type).toBe(OrderType.LIMIT);
      }
    });

    it('should validate valid MARKET SELL order', () => {
      const input = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.SELL,
        type: OrderType.MARKET,
        size: 10,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.side).toBe(OrderSide.SELL);
      }
    });

    it('should validate valid CASH_IN order', () => {
      const input = {
        userId: 3,
        instrumentId: 66,
        side: OrderSide.CASH_IN,
        type: OrderType.MARKET,
        size: 1000000,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.side).toBe(OrderSide.CASH_IN);
      }
    });

    it('should validate valid CASH_OUT order', () => {
      const input = {
        userId: 3,
        instrumentId: 66,
        side: OrderSide.CASH_OUT,
        type: OrderType.MARKET,
        size: 50000,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.side).toBe(OrderSide.CASH_OUT);
      }
    });

    it('should coerce string numbers to integers', () => {
      const input = {
        userId: '3',
        instrumentId: '47',
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: '10',
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.userId).toBe('number');
        expect(typeof result.data.instrumentId).toBe('number');
        expect(typeof result.data.size).toBe('number');
      }
    });

    it('should reject when neither size nor amount is provided', () => {
      const input = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Either size or amount must be provided');
      }
    });

    it('should reject LIMIT order without price', () => {
      const input = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        size: 20,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Price is required for LIMIT orders');
      }
    });

    it('should reject when amount is used with LIMIT order', () => {
      const input = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        amount: 10000,
        price: 900,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Amount can only be used with MARKET orders');
      }
    });

    it('should reject invalid side', () => {
      const input = {
        userId: 3,
        instrumentId: 47,
        side: 'INVALID',
        type: OrderType.MARKET,
        size: 10,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Side must be one of');
      }
    });

    it('should reject invalid type', () => {
      const input = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: 'INVALID',
        size: 10,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Type must be one of');
      }
    });

    it('should reject negative size', () => {
      const input = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: -10,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Size must be positive');
      }
    });

    it('should reject zero size', () => {
      const input = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: 0,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Size must be positive');
      }
    });

    it('should reject negative amount', () => {
      const input = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        amount: -1000,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Amount must be positive');
      }
    });

    it('should reject negative price', () => {
      const input = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        size: 20,
        price: -900,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Price must be positive');
      }
    });

    it('should reject non-integer userId', () => {
      const input = {
        userId: 3.5,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: 10,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('User ID must be an integer');
      }
    });

    it('should reject non-integer instrumentId', () => {
      const input = {
        userId: 3,
        instrumentId: 47.5,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: 10,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Instrument ID must be an integer');
      }
    });

    it('should reject non-integer size', () => {
      const input = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: 10.5,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Size must be an integer');
      }
    });

    it('should accept both size and amount (size takes precedence in validation)', () => {
      const input = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.MARKET,
        size: 10,
        amount: 10000,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept LIMIT order with both size and price', () => {
      const input = {
        userId: 3,
        instrumentId: 47,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        size: 20,
        price: 900,
      };

      const result = createOrderSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.size).toBe(20);
        expect(result.data.price).toBe(900);
      }
    });

    it('should validate all order sides', () => {
      const sides = [OrderSide.BUY, OrderSide.SELL, OrderSide.CASH_IN, OrderSide.CASH_OUT];
      
      sides.forEach((side) => {
        const input = {
          userId: 3,
          instrumentId: 47,
          side,
          type: OrderType.MARKET,
          size: 10,
        };

        const result = createOrderSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.side).toBe(side);
        }
      });
    });

    it('should validate both order types', () => {
      const types = [OrderType.MARKET, OrderType.LIMIT];
      
      types.forEach((type) => {
        const input = {
          userId: 3,
          instrumentId: 47,
          side: OrderSide.BUY,
          type,
          size: 10,
          ...(type === OrderType.LIMIT && { price: 900 }),
        };

        const result = createOrderSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe(type);
        }
      });
    });
  });
});
