import express from 'express';
import { OrderController } from '../controllers/OrderController';
import { validate } from '../middleware/validation';
import { createOrderSchema } from '../validators/orderValidators';

const router = express.Router();
const orderController = new OrderController();

router.post('/', validate(createOrderSchema, 'body'), orderController.createOrder.bind(orderController));

export default router;
