import express from 'express';
import { OrderController } from '../controllers/OrderController';
import { validate } from '../middleware/validation';
import { createOrderSchema } from '../validators/orderValidators';
import { cancelOrderParamsSchema } from '../validators/cancelOrderValidators';

const router = express.Router();
const orderController = new OrderController();

router.post('/', validate(createOrderSchema, 'body'), orderController.createOrder.bind(orderController));
router.patch('/:orderId/cancel', validate(cancelOrderParamsSchema, 'params'), orderController.cancelOrder.bind(orderController));

export default router;
