// backend/src/controllers/teamsController.ts
import { Request, Response } from 'express';
import { PrismaClient, Category, RiderType } from '@prisma/client';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';
import { calculateTotalPoints, loadLeagueStandings } from '../services/standingsService';

const prisma = new PrismaClient();

// GET /api/teams/my-teams - I miei team
export const getMyTeams = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Trova la prossima gara utile per controllare lo schieramento
    const upcomingRace = await prisma.race.findFirst({
      where: { gpDate: { gte: new Date() } },
      orderBy: { gpDate: 'asc' },
    });

    const teams = await prisma.team.findMany({
      where: { userId },
      include: {
        league: true,
        riders: {
          include: {
            rider: true,
          },
        },
        scores: {
          orderBy: { race: { gpDate: 'desc' } },
          take: 5,
          include: {
            race: true,
          },
        },
      },
    });

    const scoreTotals = teams.length > 0
      ? await prisma.teamScore.groupBy({
          by: ['teamId'],
          where: { teamId: { in: teams.map(team => team.id) } },
          _sum: { totalPoints: true }
        })
      : [];
    const scoreTotalsByTeam = new Map(
      scoreTotals.map(score => [score.teamId, score._sum.totalPoints ?? 0])
    );

    // Per ogni team, aggiungi le statistiche e lo stato dello schieramento
    const teamsWithData = await Promise.all(
      teams.map(async (team) => {
        let hasLineup = false;
        // Controlla se esiste uno schieramento per la prossima gara
        if (upcomingRace) {
          const lineup = await prisma.raceLineup.findUnique({
            where: { teamId_raceId: { teamId: team.id, raceId: upcomingRace.id } },
          });
          hasLineup = !!lineup;
        }

        const totalValue = team.riders.reduce((sum, tr) => sum + tr.rider.value, 0);
        const totalPoints = calculateTotalPoints(
          team.startingPoints,
          scoreTotalsByTeam.get(team.id) ?? 0
        );
        const remainingBudget = team.league.budget - totalValue;

        return {
          ...team,
          totalValue,
          totalPoints,
          remainingBudget,
          riderCount: team.riders.length,
          hasLineup,
        };
      })
    );

    res.json({ teams: teamsWithData });
  } catch (error) {
    console.error('Errore recupero team:', error);
    res.status(500).json({ error: 'Errore nel recupero dei team' });
  }
};

// GET /api/teams/:id - Dettaglio team
export const getTeamById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const team = await prisma.team.findFirst({
      where: { 
        id,
        OR: [
          { userId },
          { league: { members: { some: { userId } } } }
        ]
      },
      include: {
        user: {
          select: { id: true, username: true }
        },
        league: {
          include: {
            teams: { // <-- MODIFICA CHIAVE: Includi tutti i team della lega
              include: {
                riders: {
                  select: {
                    riderId: true
                  }
                }
              }
            }
          }
        },
        riders: {
          include: {
            rider: {
              include: {
                statistics: {
                  where: { season: new Date().getFullYear() },
                  take: 1
                }
              }
            }
          }
        },
        scores: {
          orderBy: { race: { gpDate: 'desc' } },
          include: {
            race: true
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team non trovato o non autorizzato' });
    }

    res.json({ team });
  } catch (error) {
    console.error('Errore recupero dettaglio team:', error);
    res.status(500).json({ error: 'Errore nel recupero del team' });
  }
};

// POST /api/teams - Crea nuovo team
export const createTeam = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, leagueId, riderIds } = req.body;

  try {
    const newTeam = await prisma.$transaction(async (tx) => {
      // 1. Verifica che l'utente sia membro della lega
      const membership = await tx.leagueMember.findUnique({
        where: { userId_leagueId: { userId, leagueId } }
      });

      if (!membership) {
        throw new Error('Non sei membro di questa lega');
      }

      // 2. Verifica che non abbia già un team in questa lega
      const existingTeam = await tx.team.findFirst({
        where: { userId, leagueId }
      });

      if (existingTeam) {
        throw new Error('Hai già un team in questa lega');
      }

      // 2.1 Verifica il numero massimo di team e se la lega è bloccata
      const league = await tx.league.findUnique({
        where: { id: leagueId },
        select: {
          teamsLocked: true,
          maxTeams: true,
          budget: true,
          _count: { select: { teams: true } }
        }
      });

      if (!league) {
        throw new Error('Lega non trovata');
      }

      if (league.teamsLocked) {
        throw new Error('Le modifiche ai team in questa lega sono bloccate dall\'amministratore.');
      }

      if (league._count.teams >= league.maxTeams) {
        throw new Error(`La lega ha raggiunto il numero massimo di team (${league.maxTeams})`);
      }

      // 2.2 Verifica che siano esattamente 9 piloti
      if (!riderIds || riderIds.length !== 9) {
        throw new Error('Il team deve contenere esattamente 9 piloti (3 per categoria)');
      }

      // 3. Recupera info sui piloti
      const riders = await tx.rider.findMany({
        where: { id: { in: riderIds } }
      });

      if (riders.length !== riderIds.length) {
        throw new Error('Uno o più piloti non trovati');
      }
      
      // Assicura che tutti i piloti siano 'OFFICIAL'
      const nonOfficialRiders = riders.filter(r => r.riderType !== RiderType.OFFICIAL);
      if (nonOfficialRiders.length > 0) {
          throw new Error(`Puoi selezionare solo piloti ufficiali. I seguenti non sono validi: ${nonOfficialRiders.map(r => r.name).join(', ')}`);
      }

      // 3.1 Verifica che ci siano esattamente 3 piloti per categoria
      const ridersByCategory = riders.reduce((acc, rider) => {
        acc[rider.category] = (acc[rider.category] || 0) + 1;
        return acc;
      }, {} as Record<Category, number>);

      if (ridersByCategory.MOTOGP !== 3 ||
          ridersByCategory.MOTO2 !== 3 ||
          ridersByCategory.MOTO3 !== 3) {
        throw new Error('Devi selezionare esattamente 3 piloti per ogni categoria (MotoGP, Moto2, Moto3)');
      }

      // 3.2 NUOVA VERIFICA: Controlla se i piloti sono già stati presi in questa lega
      const alreadyTaken = await tx.teamRider.findMany({
          where: {
              team: {
                  leagueId: leagueId
              },
              riderId: {
                  in: riderIds
              }
          },
          include: {
              rider: true
          }
      });

      if (alreadyTaken.length > 0) {
        const takenNames = alreadyTaken.map(tr => tr.rider.name).join(', ');
        throw new Error(`I seguenti piloti sono già stati presi in questa lega: ${takenNames}`);
      }

      // 4. Verifica budget
      const totalCost = riders.reduce((sum, rider) => sum + rider.value, 0);
      if (totalCost > league.budget) {
        throw new Error(`Il costo totale (${totalCost}) supera il budget disponibile (${league.budget})`);
      }

      // 5. Creazione del Team
      const team = await tx.team.create({
        data: {
          name,
          userId,
          leagueId,
          riders: {
            create: riderIds.map((riderId: string) => ({
              riderId,
              purchasePrice: riders.find(r => r.id === riderId)!.value,
            })),
          },
        },
      });
      
      return tx.team.findUnique({
        where: { id: team.id },
        include: {
          league: true,
          riders: { include: { rider: true } }
        }
      });
    });

    res.status(201).json({ success: true, team: newTeam });

  } catch (error: any) {
    console.error('Errore creazione team:', error);
    res.status(400).json({ error: error.message || 'Errore nella creazione del team' });
  }
};

// PUT /api/teams/:id - Modifica team
export const updateTeam = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { id: teamId } = req.params;
  const { riderIds } = req.body;

  try {
    const updatedTeam = await prisma.$transaction(async (tx) => {
      // 1. Trova il team e la sua lega, verificando che appartenga all'utente
      const team = await tx.team.findFirst({
        where: { id: teamId, userId },
        include: { league: true },
      });

      if (!team) {
        throw new Error('Team non trovato o non autorizzato.');
      }

      // 2. Controlla se le modifiche sono bloccate dall'admin della lega
      if (team.league.teamsLocked) {
        throw new Error('Le modifiche ai team in questa lega sono attualmente bloccate dall\'amministratore.');
      }

      // 3. Validazione dei piloti
      if (!riderIds || !Array.isArray(riderIds) || riderIds.length !== 9) {
        throw new Error('È necessario selezionare esattamente 9 piloti.');
      }

      const newRiders = await tx.rider.findMany({
        where: { id: { in: riderIds } },
      });

      if (newRiders.length !== riderIds.length) {
        throw new Error('Uno o più ID pilota non sono validi.');
      }

      // 4. Verifica regole (budget, categorie, piloti già presi)
      const totalCost = newRiders.reduce((sum, rider) => sum + rider.value, 0);
      if (totalCost > team.league.budget) {
        throw new Error(`Budget superato. Costo: ${totalCost}, Budget: ${team.league.budget}`);
      }

      const ridersByCategory = newRiders.reduce((acc, rider) => {
        acc[rider.category] = (acc[rider.category] || 0) + 1;
        return acc;
      }, {} as Record<Category, number>);

      if (ridersByCategory.MOTOGP !== 3 || ridersByCategory.MOTO2 !== 3 || ridersByCategory.MOTO3 !== 3) {
        throw new Error('Devi selezionare 3 piloti per ogni categoria.');
      }
      
      const otherTeamsRiders = await tx.teamRider.findMany({
          where: {
              team: { leagueId: team.leagueId },
              teamId: { not: teamId }, // Escludi il team corrente
              riderId: { in: riderIds }
          },
          include: { rider: true }
      });

      if (otherTeamsRiders.length > 0) {
          const takenNames = otherTeamsRiders.map(tr => tr.rider.name).join(', ');
          throw new Error(`I seguenti piloti sono già stati presi: ${takenNames}`);
      }

      // 5. Esegui l'aggiornamento
      // Rimuovi i piloti esistenti
      await tx.teamRider.deleteMany({
        where: { teamId },
      });

      // Aggiungi i nuovi piloti
      await tx.teamRider.createMany({
        data: riderIds.map((riderId: string) => ({
          teamId,
          riderId,
          purchasePrice: newRiders.find(r => r.id === riderId)!.value,
        })),
      });

      return tx.team.findUnique({
        where: { id: teamId },
        include: { riders: { include: { rider: true } } },
      });
    });

    res.json({ success: true, team: updatedTeam, message: 'Team aggiornato con successo!' });

  } catch (error: any) {
    console.error('Errore aggiornamento team:', error);
    res.status(400).json({ error: error.message || 'Impossibile aggiornare il team.' });
  }
};


// DELETE /api/teams/:id - Elimina team
export const deleteTeam = async (req: AuthRequest, res: Response) => {
  res.status(501).json({ error: 'Funzionalità non ancora implementata.' });
};

// GET /api/teams/:id/standings - Classifica del team nella lega
export const getTeamStandings = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({
      where: { id },
      select: { leagueId: true }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team non trovato' });
    }

    const standings = (await loadLeagueStandings(prisma, team.leagueId))
      .map(standing => ({
        ...standing,
        username: standing.userName,
        isCurrentTeam: standing.teamId === id
      }));

    res.json({ standings });
  } catch (error) {
    console.error('Errore recupero classifica:', error);
    res.status(500).json({ error: 'Errore nel recupero della classifica' });
  }
};

// GET /api/teams/my-team/:leagueId - Ottieni il mio team in una lega specifica
export const getMyTeamInLeague = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { leagueId } = req.params;

  try {
    const team = await prisma.team.findFirst({
      where: {
        userId,
        leagueId,
      },
      include: {
        riders: {
          include: {
            rider: true,
          },
        },
        scores: {
          orderBy: { calculatedAt: 'desc' },
          take: 5, // Ultimi 5 punteggi
        },
      },
    });

    if (!team) {
      return res.status(404).json({ 
        error: 'Non hai un team in questa lega',
        hasTeam: false 
      });
    }

    const standings = await loadLeagueStandings(prisma, leagueId);
    const teamStanding = standings.find(standing => standing.teamId === team.id);

    res.json({
      team: {
        ...team,
        position: teamStanding?.position ?? 0,
        totalPoints: teamStanding?.totalPoints ?? calculateTotalPoints(team.startingPoints, 0),
        trend: teamStanding?.trend ?? null,
        lastRacePoints: teamStanding?.lastRacePoints ?? null,
        gamesPlayed: teamStanding?.gamesPlayed ?? 0,
      },
      hasTeam: true,
    });
  } catch (error) {
    console.error('Errore recupero team in lega:', error);
    res.status(500).json({ error: 'Errore nel recupero del team' });
  }
};
