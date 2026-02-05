import { OrderProcessor } from './OrderProcessor';
import { Order } from '../../entities/Order';
import { Instrument } from '../../entities/Instrument';
import { InstrumentType } from '../../enums/InstrumentType';

export class SellOrderProcessor implements OrderProcessor {
  constructor(private order: Order) {}

  processCash(cash: number): number {
    // Solo procesar cash si NO es un instrumento de cash
    const isCashInstrument =
      this.order.instrument?.ticker === 'ARS' ||
      this.order.instrument?.type === InstrumentType.MONEDA;

    if (isCashInstrument) {
      return cash; // No afecta cash si es operacion de cash
    }

    const orderValue = Number(this.order.size) * Number(this.order.price);
    return cash + orderValue; // Recibe cash al vender
  }

  processPositions(
    positions: Map<number, { quantity: number; totalCost: number; instrument: Instrument }>
  ): Map<number, { quantity: number; totalCost: number; instrument: Instrument }> {
    // Validar si debe procesarse: si no tiene instrumento valido, retornar sin cambios
    if (!this.order.instrumentId || !this.order.instrument) {
      return positions;
    }

    const instrumentId = this.order.instrumentId;
    const size = Number(this.order.size);

    // Si no existe la posicion, no hay nada que vender
    if (!positions.has(instrumentId)) {
      return positions;
    }

    const position = positions.get(instrumentId)!;
    
    // Calcular costo promedio antes de la venta
    const avgCostBeforeSell = position.quantity > 0 
      ? position.totalCost / position.quantity 
      : 0;
    
    // Aplicar transformacion: venta reduce cantidad y costo proporcionalmente
    position.quantity -= size;
    position.totalCost = position.quantity * avgCostBeforeSell;

    return positions;
  }
}
