import { Router } from 'express';
import { InstrumentController } from '../controllers/InstrumentController';
import { validate } from '../middleware/validation';
import { searchInstrumentsSchema } from '../validators/instrumentValidators';

const router = Router();
const instrumentController = new InstrumentController();

/**
 * GET /instruments/search - buscar instrumentos por ticker y/o nombre
 *  q: Termino de busqueda (opcional)
 *  limit:  opcional - default: 50
 *  offset: registros a saltar (opcional - default: 0)
 */
router.get('/search', validate(searchInstrumentsSchema, 'query'), instrumentController.search);

export default router;
