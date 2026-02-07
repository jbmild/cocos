import { OrderBuilder } from './OrderBuilder';
import { CreateOrderInput } from '../OrderService';
import { Order } from '../../entities/Order';
import { Instrument } from '../../entities/Instrument';
import { ValidationError } from '../../errors/ValidationError';

export class LimitOrderBuilder implements OrderBuilder {
  validateInput(input: CreateOrderInput): void {
    if (!input.price) {
      throw new ValidationError('Price is required for LIMIT orders');
    }

    if (!input.size) {
      throw new ValidationError('Size is required for LIMIT orders');
    }
  }

  buildOrder(
    input: CreateOrderInput,
    instrument: Instrument,
    marketPrice?: number
  ): { order: Order; marketPrice?: undefined } {
    // Construir la orden
    const order = new Order();
    order.userId = input.userId;
    order.instrumentId = input.instrumentId;
    order.side = input.side as any;
    order.type = input.type;
    order.size = input.size!;
    order.price = input.price!;
    order.instrument = instrument;
    order.datetime = new Date();

    return { order };
  }
}
