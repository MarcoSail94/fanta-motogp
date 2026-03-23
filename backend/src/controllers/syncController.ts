// backend/src/controllers/syncController.ts
import { Request, Response } from 'express'; 
import { AuthRequest } from '../middleware/auth';
import { motogpApi } from '../services/motogpApiService';
import { PrismaClient, SessionType, Category } from '@prisma/client';

const prisma = new PrismaClient();

export const syncScopedSession = async (req: Request, res: Response) => {
  const { raceId } = req.params;
  const { category, session } = req.query as { category: Category, session: SessionType };

  if (!raceId || !category || !session) {
    return res.status(400).json({ error: "I parametri 'raceId', 'category', e 'session' sono obbligatori." });
  }

  try {
    console.log(`[CRON-SCOPED] Avvio sync per Gara: ${raceId}, Categoria: ${category}, Sessione: ${session}`);
    const success = await motogpApi.syncSession(raceId, category, session);
    
    if (success) {
      console.log(`[CRON-SCOPED] SUCCESSO: ${category} - ${session}`);
      return res.status(200).json({ success: true, message: `Sincronizzazione completata per ${category} - ${session}.` });
    } else {
      console.log(`[CRON-SCOPED] INFO: Nessun dato da aggiornare per ${category} - ${session}.`);
      return res.status(200).json({ success: false, message: `Nessun dato da aggiornare per ${category} - ${session}.` });
    }
  } catch (error) {
    console.error(`[CRON-SCOPED] ERRORE durante la sincronizzazione di ${category} - ${session}:`, error);
    return res.status(500).json({ error: `Errore durante la sincronizzazione di ${category} - ${session}.` });
  }
};

export const triggerScoreCalculation = async (req: Request, res: Response) => {
  const { raceId } = req.params;
  if (!raceId) {
    return res.status(400).json({ error: "Il parametro 'raceId' è obbligatorio." });
  }

  try {
    console.log(`[CRON-SCORES] Avvio calcolo punteggi per Gara ID: ${raceId}`);
    await motogpApi.calculateTeamScores(raceId, SessionType.RACE);
    
    console.log(`[CRON-SCORES] Calcolo punteggi completato per Gara ID: ${raceId}`);
    return res.status(200).json({ success: true, message: `Calcolo punteggi completato per la gara ${raceId}.` });
  } catch (error) {
    console.error(`[CRON-SCORES] ERRORE durante il calcolo dei punteggi per ${raceId}:`, error);
    return res.status(500).json({ error: `Errore durante il calcolo dei punteggi per ${raceId}.` });
  }
};

// POST /api/sync/riders - Sincronizza piloti
export const syncRiders = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.syncLog.create({
      data: {
        type: 'RIDERS',
        status: 'IN_PROGRESS',
        message: 'Sincronizzazione piloti iniziata'
      }
    });

    await motogpApi.syncRiders();

    await prisma.syncLog.create({
      data: {
        type: 'RIDERS',
        status: 'COMPLETED',
        message: 'Sincronizzazione piloti completata',
        completedAt: new Date()
      }
    });

    res.json({ 
      success: true, 
      message: 'Piloti sincronizzati con successo' 
    });
  } catch (error: any) {
    await prisma.syncLog.create({
      data: {
        type: 'RIDERS',
        status: 'FAILED',
        message: 'Errore sincronizzazione piloti',
        details: { error: error.message }
      }
    });

    console.error('Errore sync piloti:', error);
    res.status(500).json({ 
      error: 'Errore durante la sincronizzazione dei piloti' 
    });
  }
};

// POST /api/sync/calendar - Sincronizza calendario
export const syncCalendar = async (req: AuthRequest, res: Response) => {
  try {
    const { year } = req.body;
    const season = year || new Date().getFullYear();

    await prisma.syncLog.create({
      data: {
        type: 'CALENDAR',
        status: 'IN_PROGRESS',
        message: `Sincronizzazione calendario ${season} iniziata`
      }
    });

    await motogpApi.syncRaceCalendar(season);

    await prisma.syncLog.create({
      data: {
        type: 'CALENDAR',
        status: 'COMPLETED',
        message: `Calendario ${season} sincronizzato`,
        completedAt: new Date()
      }
    });

    res.json({ 
      success: true, 
      message: `Calendario ${season} sincronizzato con successo` 
    });
  } catch (error: any) {
    await prisma.syncLog.create({
      data: {
        type: 'CALENDAR',
        status: 'FAILED',
        message: 'Errore sincronizzazione calendario',
        details: { error: error.message }
      }
    });

    console.error('Errore sync calendario:', error);
    res.status(500).json({ 
      error: 'Errore durante la sincronizzazione del calendario' 
    });
  }
};

// POST /api/sync/race-results/:raceId - Sincronizza risultati gara
export const syncRaceResults = async (req: AuthRequest, res: Response) => {
  const { raceId } = req.params;

  try {
    const race = await prisma.race.findUnique({
      where: { id: raceId }
    });

    if (!race) {
      return res.status(404).json({ error: 'Gara non trovata' });
    }

    await prisma.syncLog.create({
      data: {
        type: 'RACE_RESULTS',
        status: 'IN_PROGRESS',
        message: `Sincronizzazione risultati ${race.name} iniziata`,
        details: { raceId }
      }
    });

    await motogpApi.syncRaceResults(raceId);

    await prisma.syncLog.create({
      data: {
        type: 'RACE_RESULTS',
        status: 'COMPLETED',
        message: `Risultati ${race.name} sincronizzati`,
        details: { raceId },
        completedAt: new Date()
      }
    });

    res.json({ 
      success: true, 
      message: `Risultati di ${race.name} sincronizzati con successo` 
    });
  } catch (error: any) {
    await prisma.syncLog.create({
      data: {
        type: 'RACE_RESULTS',
        status: 'FAILED',
        message: 'Errore sincronizzazione risultati',
        details: { raceId, error: error.message }
      }
    });

    console.error('Errore sync risultati:', error);
    res.status(500).json({ 
      error: 'Errore durante la sincronizzazione dei risultati' 
    });
  }
};

// GET /api/sync/logs - Ottieni log sincronizzazioni
export const getSyncLogs = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.syncLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ logs });
  } catch (error) {
    console.error('Errore recupero log:', error);
    res.status(500).json({ error: 'Errore nel recupero dei log' });
  }
};

// GET /api/sync/status - Ottieni stato sincronizzazioni
export const getSyncStatus = async (req: AuthRequest, res: Response) => {
  try {
    // Ultimo sync per tipo
    const lastSyncs = await prisma.$queryRaw`
      SELECT DISTINCT ON (type) *
      FROM "SyncLog"
      ORDER BY type, "createdAt" DESC
    `;

    // Prossima gara
    const nextRace = await prisma.race.findFirst({
      where: {
        gpDate: { gte: new Date() }
      },
      orderBy: { gpDate: 'asc' }
    });

    // Gare senza risultati
    const racesWithoutResults = await prisma.race.findMany({
      where: {
        gpDate: { lt: new Date() },
        results: { none: {} }
      },
      orderBy: { gpDate: 'desc' },
      take: 5
    });

    res.json({
      lastSyncs,
      nextRace,
      racesWithoutResults
    });
  } catch (error) {
    console.error('Errore recupero stato:', error);
    res.status(500).json({ error: 'Errore nel recupero dello stato' });
  }
};

// GET /api/sync/results/template/:raceId/:category - Template per inserimento manuale risultati
export const getResultsTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { raceId, category } = req.params;
    
    const riders = await prisma.rider.findMany({
      where: {
        category: category as any,
        isActive: true
      },
      orderBy: { number: 'asc' }
    });

    const race = await prisma.race.findUnique({
      where: { id: raceId }
    });

    if (!race) {
      return res.status(404).json({ error: 'Gara non trovata' });
    }

    const template = riders.map(rider => ({
      riderId: rider.id,
      riderName: rider.name,
      riderNumber: rider.number,
      position: null,
      status: 'FINISHED'
    }));

    res.json({
      race: { id: race.id, name: race.name },
      category,
      template
    });
  } catch (error) {
    console.error('Errore generazione template:', error);
    res.status(500).json({ error: 'Errore nella generazione del template' });
  }
};

// POST /api/sync/results - Inserimento manuale risultati
export const insertRaceResults = async (req: AuthRequest, res: Response) => {
  try {
    const { raceId, results, session } = req.body;

    // Validazione
    if (!raceId || !Array.isArray(results) || !session) {
      return res.status(400).json({ 
        error: 'Dati non validi. Richiesti raceId, session (RACE o SPRINT) e array results.' 
      });
    }

    if (session !== SessionType.RACE && session !== SessionType.SPRINT) {
      return res.status(400).json({ error: 'Il campo session deve essere RACE o SPRINT.' });
    }

    // Upsert dei risultati
    for (const result of results) {
      await prisma.raceResult.upsert({
        where: {
          raceId_riderId_session: {
            raceId,
            riderId: result.riderId,
            session,
          },
        },
        update: {
            position: result.position,
            status: result.status || 'FINISHED',
        },
        create: {
          raceId,
          riderId: result.riderId,
          session,
          position: result.position,
          status: result.status || 'FINISHED',
        },
      });
    }

    // Ricalcola i punteggi per la sessione inserita
    await motogpApi.calculateTeamScores(raceId, session);

    res.json({
      success: true,
      message: `Risultati per ${session} inseriti e punteggi calcolati con successo`
    });
  } catch (error: any) {
    console.error('Errore inserimento risultati manuale:', error);
    res.status(500).json({ 
      error: 'Errore durante l\'inserimento dei risultati' 
    });
  }
};

export const deleteLatestRaceResults = async (req: Request, res: Response) => {
  try {
    console.log('🗑️ [DELETE-LATEST] Inizio ricerca ultima gara per cancellazione risultati...');
    const now = new Date();

    // Trova l'ultima gara disputata
    const lastRace = await prisma.race.findFirst({
      where: { gpDate: { lte: now } },
      orderBy: { gpDate: 'desc' },
    });

    if (!lastRace) {
      console.log('ℹ️ [DELETE-LATEST] Nessuna gara trovata.');
      return res.status(404).json({ success: false, message: 'Nessuna gara passata trovata.' });
    }

    console.log(`🗑️ [DELETE-LATEST] Cancellazione risultati per: ${lastRace.name} (ID: ${lastRace.id})`);
    
    // Cancella SOLO i risultati legati a questa gara
    const { count } = await prisma.raceResult.deleteMany({
      where: { raceId: lastRace.id }
    });
    
    console.log(`✅ [DELETE-LATEST] Operazione completata. Cancellati ${count} record.`);
    return res.status(200).json({ 
      success: true, 
      message: `Cancellati ${count} risultati per la gara ${lastRace.name}.`,
      deletedCount: count
    });

  } catch (error) {
    console.error('❌ [DELETE-LATEST] Errore critico:', error);
    return res.status(500).json({ error: 'Errore durante la cancellazione dei risultati dell\'ultima gara.' });
  }
};