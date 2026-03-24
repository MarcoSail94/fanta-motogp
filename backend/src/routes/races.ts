// backend/src/routes/races.ts
import { Router } from 'express';
import * as racesController from '../controllers/racesController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Route pubbliche - non richiedono autenticazione
router.get('/latest', racesController.getLatestRace);
router.get('/upcoming', racesController.getUpcomingRaces);
router.get('/past', racesController.getPastRaces);
router.get('/is-race-weekend', racesController.checkIsRaceWeekend);
router.get('/calendar/:year', racesController.getRaceCalendar);
router.get('/latest-scores-status', authenticate, racesController.getLatestRaceScoresStatus);
router.get('/:raceId', racesController.getRaceById);
router.get('/:raceId/results', racesController.getRaceResults);
router.get('/:raceId/qualifying', racesController.getQualifyingResults);

export default router;