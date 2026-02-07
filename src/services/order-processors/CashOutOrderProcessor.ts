import { OrderProcessor } from './OrderProcessor';
import { Order } from '../../entities/Order';
import { Instrument } from '../../entities/Instrument';
import { InstrumentType } from '../../enums/InstrumentType';
import { OrderStatus } from '../../enums/OrderStatus';

export class CashOutOrderProcessor implements OrderProcessor {
  constructor(private order: Order) {}

  processCash(cash: number): number {
    // Solo procesar cash si ES un instrumento de cash
    const isCashInstrument =
      this.order.instrument?.ticker === 'ARS' ||
      this.order.instrument?.type === InstrumentType.MONEDA;

    if (!isCashInstrument) {
      return cash; // No afecta cash si no es operacion de cash
    }

    const size = Number(this.order.size);
    return cash - size; // size ya es el monto en pesos
  }

  processPositions(
    positions: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>
  ): Map<number, { quantity: number; totalCost: number; instrument: Instrument }> {
    // Las operaciones de cash no afectan posiciones, retornar sin cambios
    return positions;
  }

  validateOrder(
    availableCash: number,
    positions: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>
  ): boolean {
    // Obtener instrumento de la orden
    if (!this.order.instrument) {
      return false;
    }

    const instrument = this.order.instrument;

    // Validar que sea un instrumento de cash
    const isCashInstrument =
      instrument.ticker === 'ARS' ||
      instrument.type === InstrumentType.MONEDA;

    if (!isCashInstrument) {
      return false;
    }

    // Validar que tenga fondos suficientes
    return availableCash >= Number(this.order.size);
  }

  determineStatus(isValid: boolean): OrderStatus {
    if (!isValid) {
      return OrderStatus.REJECTED;
    }
    // CASH_OUT siempre es MARKET, por lo que se ejecuta inmediatamente
    return OrderStatus.FILLED;
  }
}
