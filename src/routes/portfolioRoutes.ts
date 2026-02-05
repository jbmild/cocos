import { Router } from 'express';
import { PortfolioController } from '../controllers/PortfolioController';
import { validate } from '../middleware/validation';
import { userIdSchema } from '../validators/portfolioValidators';

const router = Router();
const portfolioController = new PortfolioController();

/**
 * GET /portfolio/:userId - obtiene el portfolio
 *  userId - ID del usuario
 */
router.get('/:userId', validate(userIdSchema, 'params'), portfolioController.getPortfolio);

export default router;
