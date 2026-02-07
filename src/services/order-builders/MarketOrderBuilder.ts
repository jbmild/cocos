import { OrderBuilder } from './OrderBuilder';
import { CreateOrderInput } from '../OrderService';
import { Order } from '../../entities/Order';
import { Instrument } from '../../entities/Instrument';
import { OrderType } from '../../enums/OrderType';
import { ValidationError } from '../../errors/ValidationError';

export class MarketOrderBuilder implements OrderBuilder {
  validateInput(input: CreateOrderInput): void {
    if (input.amount && input.type !== OrderType.MARKET) {
      throw new ValidationError('Amount can only be used with MARKET orders');
    }

    if (!input.size && !input.amount) {
      throw new ValidationError('Either size or amount must be provided');
    }
  }

  buildOrder(
    input: CreateOrderInput,
    instrument: Instrument,
    marketPrice?: number
  ): { order: Order; marketPrice: number } {
    const isCashOperation = input.side === 'CASH_IN' || input.side === 'CASH_OUT';
    const finalPrice = isCashOperation ? 1 : marketPrice;
    
    if (!isCashOperation && !marketPrice) {
      throw new ValidationError('Market price is required for MARKET orders');
    }

    // Calcular size si se proporciona amount
    let size: number;
    if (input.amount) {
      if (isCashOperation) {
        size = Math.floor(input.amount);
      } else {
        size = Math.floor(input.amount / marketPrice!);
      }
      if (size <= 0) {
        throw new ValidationError('Amount is too small to buy at least one share');
      }
    } else {
      size = input.size!;
    }

    // Construir la orden con el precio ya asignado
    const order = new Order();
    order.userId = input.userId;
    order.instrumentId = input.instrumentId;
    order.side = input.side as any;
    order.type = input.type;
    order.size = size;
    order.price = finalPrice!;
    
    order.instrument = instrument;
    order.datetime = new Date();

    return { order, marketPrice: finalPrice! };
  }
}
