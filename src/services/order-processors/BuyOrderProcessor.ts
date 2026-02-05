import { OrderProcessor } from './OrderProcessor';
import { Order } from '../../entities/Order';
import { Instrument } from '../../entities/Instrument';
import { InstrumentType } from '../../enums/InstrumentType';

export class BuyOrderProcessor implements OrderProcessor {
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
    return cash - orderValue; // Gasta cash al comprar
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
    const price = Number(this.order.price);

    // Crear nueva posicion si no existe
    if (!positions.has(instrumentId)) {
      positions.set(instrumentId, {
        quantity: 0,
        totalCost: 0,
        instrument: this.order.instrument,
      });
    }

    const position = positions.get(instrumentId)!;
    
    // Aplicar transformacion: compra aumenta cantidad y costo total
    position.quantity += size;
    position.totalCost += size * price;

    return positions;
  }
}
