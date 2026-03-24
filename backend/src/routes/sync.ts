// backend/src/routes/sync.ts
import { Router } from 'express';
import { authenticate, requireAdmin, authenticateCron } from '../middleware/auth';
import * as syncController from '../controllers/syncController';
import { PrismaClient } from '@prisma/client';
import { motogpApi } from '../services/motogpApiService';

const prisma = new PrismaClient();
const router = Router();

router.get('/cron/scoped/:raceId', authenticateCron, syncController.syncScopedSession);
router.post('/cron/calculate-scores/:raceId', authenticateCron, syncController.triggerScoreCalculation);
router.get('/cron/sync-riders', authenticateCron, syncController.syncRiders);
router.get('/cron/sync-calendar', authenticateCron, syncController.syncCalendar);
router.get('/cron/sync-results', authenticateCron, async (req, res) => {
    try {
        console.log('CRON JOB: Inizio controllo risultati gare...');
        const racesToSync = await prisma.race.findMany({
          where: {
            gpDate: {
              gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), 
              lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: { gpDate: 'desc' }
        });

        console.log(`CRON JOB: Trovate ${racesToSync.length} gare da controllare.`);

        if (racesToSync.length === 0) {
            return res.status(200).json({ success: true, message: 'Nessuna gara da sincronizzare in questo momento.' });
        }

        for (const race of racesToSync) {
            console.log(`CRON JOB: Sincronizzazione risultati per: ${race.name}`);
            await motogpApi.syncRaceResults(race.id);
        }
        res.status(200).json({ success: true, message: `Controllo risultati completato per ${racesToSync.length} gare.` });
    } catch (error) {
        console.error('CRON JOB: Errore durante il controllo dei risultati.', error);
        res.status(500).json({ error: 'Errore durante il controllo dei risultati.' });
    }
});

router.delete('/cron/results/latest', authenticateCron, syncController.deleteLatestRaceResults);
router.delete('/race-results/:raceId',authenticateCron, syncController.deleteRaceResults);

// --- Rotte per il pannello di amministrazione (protette da login admin) ---
router.use(authenticate);
router.use(requireAdmin);

// Route sincronizzazioni manuali
router.post('/riders', syncController.syncRiders);
router.post('/calendar', syncController.syncCalendar);
router.post('/race-results/:raceId', syncController.syncRaceResults);

// Route informative per admin
router.get('/logs', syncController.getSyncLogs);
router.get('/status', syncController.getSyncStatus);

// Route per inserimento manuale risultati
router.get('/results/template/:raceId/:category', syncController.getResultsTemplate);
router.post('/results', syncController.insertRaceResults);

export default router;