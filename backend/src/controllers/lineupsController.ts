// backend/src/controllers/lineupsController.ts
import { Response } from 'express';
import { PrismaClient, Category } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { toPublicPosition } from '../services/resultPositions';

const prisma = new PrismaClient();

// GET /api/lineups/:raceId?teamId=... - Recupera schieramento per una gara
export const getLineup = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { raceId } = req.params;
  const { teamId } = req.query;

  if (!teamId) {
    return res.status(400).json({ error: 'ID del team mancante' });
  }

  try {
    const lineup = await prisma.raceLineup.findFirst({
      where: {
        teamId: String(teamId),
        raceId,
        team: {
          userId, 
        },
      },
      include: {
        lineupRiders: {
          include: {
            rider: true,
          },
        },
      },
    });

    const teamWithRiders = await prisma.team.findFirst({
        where: { id: String(teamId) },
        include: { riders: { include: { rider: true } } }
    });

    const riderIds = teamWithRiders?.riders.map(r => r.riderId) ?? [];

    const practiceResults = await prisma.raceResult.findMany({
        where: {
            raceId,
            riderId: { in: riderIds },
            session: { in: ['FP1', 'FP2', 'PR', 'QUALIFYING'] }
        }
    });

    const resultsByRider = practiceResults.reduce((acc, result) => {
        if (!acc[result.riderId]) {
            acc[result.riderId] = {};
        }
        const sessionKey = result.session === 'QUALIFYING' ? 'Q' : result.session;
        acc[result.riderId][sessionKey] = toPublicPosition(result.position);
        return acc;
    }, {} as Record<string, Record<string, number | null>>);


    if (!lineup) {
      return res.status(200).json({
          lineup: null, // Invia null invece di un errore
          message: 'Nessuno schieramento trovato per questa gara.',
          practiceResults: resultsByRider
      });
    }

    res.json({ lineup, practiceResults: resultsByRider });
  } catch (error) {
    console.error("Errore nel recupero dello schieramento:", error);
    res.status(500).json({ error: "Errore nel recupero dello schieramento" });
  }
};

// POST /api/lineups/:raceId - Crea o aggiorna uno schieramento
export const setLineup = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { raceId } = req.params;
  const { teamId, riders } = req.body;

  try {
    // 1. Validazione input base
    if (!teamId || !riders || !Array.isArray(riders) || riders.length !== 6) {
      return res.status(400).json({
        error: 'Dati dello schieramento non validi. Devi schierare 6 piloti (2 per categoria).'
      });
    }

    // 2. Controlla la deadline della gara
    const race = await prisma.race.findUnique({ where: { id: raceId } });
    if (!race) {
      return res.status(404).json({ error: 'Gara non trovata' });
    }

    const deadline = race.sprintDate || race.gpDate;
    if (new Date() > new Date(deadline)) {
      return res.status(403).json({ error: 'La deadline per schierare la formazione è passata.' });
    }

    // 3. Verifica che il team appartenga all'utente e ottieni i piloti
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId },
      include: {
        riders: {
          include: {
            rider: true
          }
        }
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team non trovato o non autorizzato.' });
    }

    // 4. Validazione dettagliata dello schieramento
    const schieratoPerCategoria: Record<Category, number> = {
      MOTOGP: 0,
      MOTO2: 0,
      MOTO3: 0
    };

    // Verifica che tutti i piloti schierati appartengano al team
    for (const riderLineup of riders) {
      const teamRider = team.riders.find(tr => tr.riderId === riderLineup.riderId);

      if (!teamRider) {
        return res.status(400).json({
          error: 'Uno dei piloti schierati non appartiene al tuo team'
        });
      }

      // Conta piloti per categoria
      schieratoPerCategoria[teamRider.rider.category]++;

      // Verifica posizione prevista valida
      if (!riderLineup.predictedPosition ||
          riderLineup.predictedPosition < 1 ||
          riderLineup.predictedPosition > 30) {
        return res.status(400).json({
          error: `Posizione prevista non valida per ${teamRider.rider.name}. Deve essere tra 1 e 30.`
        });
      }
    }

    // 5. Verifica esattamente 2 piloti per categoria
    if (schieratoPerCategoria.MOTOGP !== 2 ||
        schieratoPerCategoria.MOTO2 !== 2 ||
        schieratoPerCategoria.MOTO3 !== 2) {
      return res.status(400).json({
        error: 'Devi schierare esattamente 2 piloti per ogni categoria (2 MotoGP, 2 Moto2, 2 Moto3)'
      });
    }

    // 6. Crea o aggiorna lo schieramento in una transazione
    const lineup = await prisma.$transaction(async (tx) => {
      let raceLineup = await tx.raceLineup.findUnique({
          where: {
              teamId_raceId: { teamId, raceId }
          }
      });

      if (raceLineup) {
          await tx.lineupRider.deleteMany({
              where: { lineupId: raceLineup.id }
          });
      } else {
          // Altrimenti, crea un nuovo schieramento
          raceLineup = await tx.raceLineup.create({
              data: { teamId, raceId }
          });
      }

      // Aggiungi i nuovi piloti schierati
      for (const r of riders) {
        await tx.lineupRider.create({
          data: {
            lineupId: raceLineup!.id,
            riderId: r.riderId,
            predictedPosition: r.predictedPosition,
          },
        });
      }

      return tx.raceLineup.findUnique({
        where: { id: raceLineup!.id },
        include: {
          lineupRiders: {
            include: { rider: true }
          },
          race: true
        }
      });
    });

    res.json({
      success: true,
      lineup,
      message: 'Schieramento salvato con successo!'
    });

  } catch (error) {
    console.error('❌ Errore critico durante il salvataggio dello schieramento:', error);
    res.status(500).json({ error: 'Errore nel salvataggio dello schieramento' });
  }
};

// GET /api/lineups/last-valid/:teamId - Recupera l'ultimo schieramento valido
export const getLastValidLineup = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { teamId } = req.params;

  try {
    // Verifica che il team appartenga all'utente
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team non trovato o non autorizzato' });
    }

    // Trova l'ultimo schieramento fatto
    const lastLineup = await prisma.raceLineup.findFirst({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      include: {
        lineupRiders: {
          include: { rider: true }
        },
        race: true
      }
    });

    if (!lastLineup) {
      return res.status(404).json({ message: 'Nessuno schieramento precedente trovato' });
    }

    res.json({ lineup: lastLineup });
  } catch (error) {
    console.error('Errore recupero ultimo schieramento:', error);
    res.status(500).json({ error: 'Errore nel recupero dello schieramento' });
  }
};

// GET /api/lineups/weekend/:raceId?teamId=... - Recupera schieramenti per l'intero weekend
export const getWeekendLineups = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { raceId } = req.params;
  const { teamId } = req.query;

  if (!teamId) {
    return res.status(400).json({ error: 'ID del team mancante' });
  }

  try {
    // Trova la gara principale
    const race = await prisma.race.findUnique({
      where: { id: raceId },
    });

    if (!race) {
      return res.status(404).json({ error: 'Gara non trovata' });
    }

    // Trova tutte le gare dello stesso weekend (stesso circuito, date vicine)
    const weekendRaces = await prisma.race.findMany({
      where: {
        circuit: race.circuit, // Use circuit name for filtering
        gpDate: {
          gte: new Date(race.gpDate.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 giorni prima
          lte: new Date(race.gpDate.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 giorni dopo
        }
      }
    });

    // Recupera gli schieramenti per tutte le gare del weekend
    const lineups = await prisma.raceLineup.findMany({
      where: {
        teamId: String(teamId),
        raceId: {
          in: weekendRaces.map(r => r.id)
        },
        team: {
          userId
        }
      },
      include: {
        lineupRiders: {
          include: {
            rider: true
          }
        },
        race: true
      }
    });

    res.json({
      weekend: {
        mainRace: race,
        races: weekendRaces,
        lineups
      }
    });
  } catch (error) {
    console.error("Errore nel recupero degli schieramenti del weekend:", error);
    res.status(500).json({ error: "Errore nel recupero degli schieramenti" });
  }
};