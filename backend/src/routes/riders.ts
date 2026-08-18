// backend/src/routes/riders.ts
import { Router } from 'express';
import { query, param, body } from 'express-validator';
import * as ridersController from '../controllers/ridersController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Validatori
const getRidersValidation = [
  query('category')
    .optional()
    .isIn(['MOTOGP', 'MOTO2', 'MOTO3'])
    .withMessage('Categoria non valida'),
  query('sortBy')
    .optional()
    .isIn(['value', 'points', 'name'])
    .withMessage('Ordinamento non valido'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Direzione ordinamento non valida'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Pagina deve essere un numero positivo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve essere tra 1 e 100')
];

const riderIdValidation = [
  param('id')
    .isUUID()
    .withMessage('ID pilota non valido')
];

const updateValueValidation = [
  body('value')
    .isInt({ min: 0 })
    .withMessage('Il valore deve essere un numero positivo')
];

// Routes pubbliche
// NUOVO ENDPOINT PER IL WEB
router.get('/web', getRidersValidation, ridersController.getRidersForWeb);

// ENDPOINT ESISTENTE PER IL MOBILE
router.get('/', getRidersValidation, ridersController.getRiders);
router.get('/values', ridersController.getRiderValues);
router.get('/:id', riderIdValidation, ridersController.getRiderById);
router.get('/:id/stats', riderIdValidation, ridersController.getRiderStats);


// Routes protette (richiedono privilegi amministratore)
router.put('/:id/value',
  authenticate,
  requireAdmin,
  riderIdValidation, 
  updateValueValidation, 
  ridersController.updateRiderValue
);

export default router;
