import { Order } from '../../entities/Order';
import { Instrument } from '../../entities/Instrument';
import { CreateOrderInput } from '../OrderService';

export interface OrderBuilder {
  /**
   * Valida los datos de entrada según las reglas del tipo de orden
   */
  validateInput(input: CreateOrderInput): void;

  /**
   * Construye la orden con los datos proporcionados
   *  input: Datos de entrada de la orden
   *  instrument: Instrumento cargado de la base de datos
   *  marketPrice: Precio de mercado (solo para ordenes MARKET)
   */
  buildOrder(
    input: CreateOrderInput,
    instrument: Instrument,
    marketPrice?: number
  ): { order: Order; marketPrice?: number };
}
