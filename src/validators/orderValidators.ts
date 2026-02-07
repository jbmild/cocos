import { z } from 'zod';
import { OrderSide } from '../enums/OrderSide';
import { OrderType } from '../enums/OrderType';

export const createOrderSchema = z
  .object({
    userId: z.coerce.number().int('User ID must be an integer'),
    instrumentId: z.coerce.number().int('Instrument ID must be an integer'),
    side: z.nativeEnum(OrderSide, {
      message: 'Side must be one of: BUY, SELL, CASH_IN, CASH_OUT',
    }),
    type: z.nativeEnum(OrderType, {
      message: 'Type must be one of: MARKET, LIMIT',
    }),
    size: z.coerce.number().int('Size must be an integer').positive('Size must be positive').optional(),
    amount: z.coerce.number().positive('Amount must be positive').optional(),
    price: z.coerce.number().positive('Price must be positive').optional(),
  })
  .refine(
    (data) => {
      // Debe tener size o amount
      return data.size !== undefined || data.amount !== undefined;
    },
    {
      message: 'Either size or amount must be provided',
    }
  )
  .refine(
    (data) => {
      // Si es LIMIT, debe tener price
      if (data.type === OrderType.LIMIT) {
        return data.price !== undefined;
      }
      return true;
    },
    {
      message: 'Price is required for LIMIT orders',
    }
  )
  .refine(
    (data) => {
      // Si tiene amount, debe ser MARKET
      if (data.amount !== undefined) {
        return data.type === OrderType.MARKET;
      }
      return true;
    },
    {
      message: 'Amount can only be used with MARKET orders',
    }
  );

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
