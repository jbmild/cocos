import { Request, Response } from 'express';
import { OrderService } from '../services/OrderService';
import { CreateOrderInput } from '../validators/orderValidators';
import { CancelOrderParams } from '../validators/cancelOrderValidators';
import { AppError } from '../errors/AppError';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const input = (req as any).validated as CreateOrderInput;
      const order = await this.orderService.createOrder(input);
      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('Error creating order:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: error.errorType,
          message: error.message,
        });
        return;
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred while creating the order',
      });
    }
  }

  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = (req as any).validated as CancelOrderParams;

      const order = await this.orderService.cancelOrder(orderId);
      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          error: error.errorType,
          message: error.message,
        });
        return;
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred while cancelling the order',
      });
    }
  }
}
