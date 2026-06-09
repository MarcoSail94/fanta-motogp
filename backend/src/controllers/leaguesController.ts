// backend/src/controllers/leaguesController.ts
import { Request, Response } from 'express';
import { PrismaClient, TeamScore } from '@prisma/client';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Genera codice lega unico
const generateLeagueCode = (): string => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// GET /api/leagues/my-leagues - Le mie leghe
export const getMyLeagues = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const leagues = await prisma.league.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        _count: {
          select: { teams: true }
        },
        teams: {
          include: {
            scores: true
          }
        }
      }
    });

    const formattedLeagues = leagues.map(league => {
      const standings = league.teams
        .map(team => ({
          teamId: team.id,
          userId: team.userId,
          totalPoints: (team.startingPoints || 0) + team.scores.reduce((sum: number, s: TeamScore) => sum + s.totalPoints, 0),
        }))
        .sort((a, b) => a.totalPoints - b.totalPoints);
      const userTeam = standings.find(team => team.userId === userId);
      const userPosition = userTeam ? standings.findIndex(team => team.teamId === userTeam.teamId) + 1 : null;

      return {
        id: league.id,
        name: league.name,
        code: league.code,
        isPrivate: league.isPrivate,
        maxTeams: league.maxTeams,
        budget: league.budget,
        currentTeams: league._count.teams,
        userPoints: userTeam?.totalPoints || 0,
        userPosition
      };
    });

    res.json({ leagues: formattedLeagues });
  } catch (error) {
    console.error('Errore recupero leghe:', error);
    res.status(500).json({ error: 'Errore nel recupero delle leghe' });
  }
};


//GET /api/leagues/public - Leghe pubbliche
export const getPublicLeagues = async (req: AuthRequest, res: Response) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const userId = req.userId; // Recupera l'ID utente se loggato

    const where: any = {
      isPrivate: false,
    };

    if (search) {
      where.name = {
        contains: String(search),
        mode: 'insensitive'
      };
    }
    

    let userTeamLeagueIds = new Set<string>();
    if (userId) {
      const userTeams = await prisma.team.findMany({
        where: { userId },
        select: { leagueId: true }
      });
      userTeamLeagueIds = new Set(userTeams.map(t => t.leagueId));
    }

    const [leagues, total] = await Promise.all([
      prisma.league.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          _count: {
            select: { teams: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.league.count({ where })
    ]);

    const formattedLeagues = leagues.map(league => ({
      ...league,
      currentTeams: league._count.teams,
      isFull: league._count.teams >= league.maxTeams,
      hasTeam: userTeamLeagueIds.has(league.id) // Aggiunge il nuovo campo
    }));

    res.json({
      leagues: formattedLeagues,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Errore recupero leghe pubbliche:', error);
    res.status(500).json({ error: 'Errore nel recupero delle leghe pubbliche' });
  }
};

// GET /api/leagues/:id - Dettaglio lega
export const getLeagueById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, createdAt: true }
            }
          }
        },
        teams: {
          include: {
            user: {
              select: { id: true, username: true }
            },
            riders: {
              include: {
                rider: true
              }
            },
            scores: {
              include: {
                race: true
              },
              orderBy: {
                race: {
                  gpDate: 'desc'
                }
              }
            }
          }
        }
      }
    });

    if (!league) {
      return res.status(404).json({ error: 'Lega non trovata' });
    }

    if (league.isPrivate && userId) {
      const isMember = league.members.some(m => m.userId === userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Non sei membro di questa lega' });
      }
    }

    // Crea una mappa per tracciare le posizioni precedenti
    const previousPositions = new Map<string, number>();
    
    // Se ci sono almeno 2 gare, calcola le posizioni dopo la penultima gara
    if (league.teams.some(team => team.scores.length >= 2)) {
      const penultimateStandings = league.teams
        .map(team => {
          // Escludi l'ultimo punteggio (gara più recente)
          const scoresWithoutLast = team.scores.slice(1); // slice(1) perché sono ordinate DESC
          const totalWithoutLast = scoresWithoutLast.reduce((sum, s) => sum + s.totalPoints, 0) + (team.startingPoints || 0);
          
          return {
            teamId: team.id,
            totalPoints: totalWithoutLast
          };
        })
        .sort((a, b) => a.totalPoints - b.totalPoints);

      // Assegna le posizioni precedenti
      penultimateStandings.forEach((team, index) => {
        previousPositions.set(team.teamId, index + 1);
      });
    }

    // Calcola la classifica attuale con tutti i campi necessari
    const standings = league.teams
      .map(team => {
        const totalRacePoints = team.scores.reduce((sum: number, s: TeamScore) => sum + s.totalPoints, 0);
        const totalPoints = (team.startingPoints || 0) + totalRacePoints;
        
        // Calcola i punti dell'ultima gara
        const lastRacePoints = team.scores.length > 0 ? team.scores[0].totalPoints : null;
        
        return {
          teamId: team.id,
          teamName: team.name,
          userId: team.userId,
          userName: team.user.username,
          totalPoints: totalPoints,
          lastRacePoints: lastRacePoints,
          gamesPlayed: team.scores.length
        };
      })
      .sort((a, b) => a.totalPoints - b.totalPoints)
      .map((team, index) => {
        const currentPosition = index + 1;
        const previousPosition = previousPositions.get(team.teamId);
        
        // Calcola il trend
        let trend: 'up' | 'down' | 'same' | null = null;
        if (previousPosition !== undefined) {
          if (currentPosition < previousPosition) {
            trend = 'up';
          } else if (currentPosition > previousPosition) {
            trend = 'down';
          } else {
            trend = 'same';
          }
        }
        
        return {
          ...team,
          position: currentPosition,
          trend: trend
        };
      });

    res.json({
      league: {
        ...league,
        standings,
        isMember: userId ? league.members.some(m => m.userId === userId) : false,
        isAdmin: userId ? league.members.some(m => m.userId === userId && m.role === 'ADMIN') : false
      }
    });
  } catch (error) {
    console.error('Errore recupero dettaglio lega:', error);
    res.status(500).json({ error: 'Errore nel recupero della lega' });
  }
};

// POST /api/leagues - Crea nuova lega
export const createLeague = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.userId!;
    const { 
      name, 
      isPrivate = true, 
      maxTeams = 10, 
      budget = 1000,
      scoringRules,
      startDate,
      endDate,
      lineupVisibility
    } = req.body;

    let code = generateLeagueCode();
    let codeExists = true;
    while (codeExists) {
      const existing = await prisma.league.findUnique({ where: { code } });
      if (!existing) {
        codeExists = false;
      } else {
        code = generateLeagueCode();
      }
    }

    const league = await prisma.league.create({
      data: {
        name,
        code,
        isPrivate,
        maxTeams,
        budget,
        scoringRules: scoringRules || {},
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        lineupVisibility: lineupVisibility || 'AFTER_DEADLINE',
        members: {
          create: {
            userId,
            role: 'ADMIN'
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      league
    });
  } catch (error) {
    console.error('Errore creazione lega:', error);
    res.status(500).json({ error: 'Errore nella creazione della lega' });
  }
};

// POST /api/leagues/join - Unisciti a lega con codice
export const joinLeague = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Codice lega richiesto' });
    }

    const league = await prisma.league.findUnique({
      where: { code: code.toUpperCase() },
      include: { _count: { select: { teams: true } } }
    });

    if (!league) {
      return res.status(404).json({ error: 'Lega non trovata' });
    }

    const existingMember = await prisma.leagueMember.findUnique({
      where: { userId_leagueId: { userId, leagueId: league.id } }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'Sei già membro di questa lega' });
    }

    if (league._count.teams >= league.maxTeams) {
      return res.status(400).json({ error: 'La lega è piena' });
    }

    await prisma.leagueMember.create({
      data: {
        userId,
        leagueId: league.id,
        role: 'MEMBER'
      }
    });

    res.json({
      success: true,
      message: 'Ti sei unito alla lega con successo',
      leagueId: league.id
    });
  } catch (error) {
    console.error('Errore unione lega:', error);
    res.status(500).json({ error: 'Errore nell\'unirsi alla lega' });
  }
};

// POST /api/leagues/:id/leave - Lascia lega
export const leaveLeague = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const member = await prisma.leagueMember.findUnique({
      where: { userId_leagueId: { userId, leagueId: id } }
    });

    if (!member) {
      return res.status(404).json({ error: 'Non sei membro di questa lega' });
    }

    if (member.role === 'ADMIN') {
      const otherAdmins = await prisma.leagueMember.count({
        where: { leagueId: id, role: 'ADMIN', userId: { not: userId } }
      });

      if (otherAdmins === 0) {
        return res.status(400).json({ error: 'Non puoi lasciare la lega come unico amministratore' });
      }
    }

    await prisma.$transaction([
      prisma.team.deleteMany({ where: { userId, leagueId: id } }),
      prisma.leagueMember.delete({ where: { userId_leagueId: { userId, leagueId: id } } })
    ]);

    res.json({ success: true, message: 'Hai lasciato la lega con successo' });
  } catch (error) {
    console.error('Errore uscita lega:', error);
    res.status(500).json({ error: 'Errore nell\'uscire dalla lega' });
  }
};

// GET /api/leagues/:id/standings - Classifica completa lega
export const getLeagueStandings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const teams = await prisma.team.findMany({
      where: { leagueId: id },
      include: {
        user: { select: { id: true, username: true } },
        scores: { include: { race: true }, orderBy: { race: { gpDate: 'desc' } } }
      }
    });

    const standings = teams.map(team => {
      const totalRacePoints = team.scores.reduce((sum: number, s: TeamScore) => sum + s.totalPoints, 0);
      const totalPoints = (team.startingPoints || 0) + totalRacePoints;
      return {
        teamId: team.id,
        teamName: team.name,
        userId: team.userId,
        userName: team.user.username,
        totalPoints,
        gamesPlayed: team.scores.length
      };
    })
    .sort((a, b) => a.totalPoints - b.totalPoints)
    .map((team, index) => ({
      ...team,
      position: index + 1,
    }));

    res.json({ standings });
  } catch (error) {
    console.error('Errore recupero classifica:', error);
    res.status(500).json({ error: 'Errore nel recupero della classifica' });
  }
};

// GET /api/leagues/:id/race/:raceId/lineups
export const getLeagueRaceLineups = async (req: AuthRequest, res: Response) => {
  try {
    const { id: leagueId, raceId } = req.params;

    // Controlla la regola di visibilità della lega prima di verificare la deadline
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { lineupVisibility: true },
    });

    if (!league) {
      return res.status(404).json({ error: 'Lega non trovata' });
    }

    const race = await prisma.race.findUnique({ where: { id: raceId } });
    if (!race) {
      return res.status(404).json({ error: 'Gara non trovata' });
    }

    const deadline = race.sprintDate || race.gpDate;
    if (league.lineupVisibility === 'AFTER_DEADLINE' && new Date() < new Date(deadline)) {
      return res.status(200).json({ lineups: [], message: 'Gli schieramenti saranno visibili dopo la deadline della gara.' });
    }

    // Trova tutti i team della lega
    const teams = await prisma.team.findMany({
      where: { leagueId },
      include: {
        user: { select: { username: true } },
        scores: { where: { raceId } },
        lineups: {
          where: { raceId },
          include: {
            lineupRiders: {
              include: {
                rider: true,
              },
              orderBy: { rider: { category: 'asc' } },
            },
          },
        },
      },
    });

    // Recupera i risultati reali della gara per confrontarli
    const raceResults = await prisma.raceResult.findMany({
      where: { raceId },
    });
    const resultsMap = new Map(raceResults.map(r => [r.riderId, { position: r.position, status: r.status }]));

    const formattedLineups = teams.map(team => {
      const lineup = team.lineups[0];
      const teamScore = team.scores[0];
      const lineupRiders = lineup?.lineupRiders.map(lr => ({
        ...lr,
        actualPosition: resultsMap.get(lr.riderId)?.position,
        actualStatus: resultsMap.get(lr.riderId)?.status,
      }));

      return {
        teamId: team.id,
        teamName: team.name,
        userName: team.user.username,
        totalPoints: teamScore?.totalPoints ?? null,
        lineup: lineupRiders || [],
        riderScores: teamScore?.riderScores ?? [],
        isFallback: lineup?.isFallback,
      };
    });

    res.json({ lineups: formattedLineups });
  } catch (error) {
    console.error('Errore recupero schieramenti di lega:', error);
    res.status(500).json({ error: 'Errore nel recupero degli schieramenti' });
  }
};

// GET /api/leagues/mobile/:id/race/:raceId/lineups - Per la webapp
export const getLeagueRaceLineupsForWeb = async (req: AuthRequest, res: Response) => {
    try {
        const { id: leagueId, raceId } = req.params;
        const userId = req.userId!;

        const league = await prisma.league.findUnique({
            where: { id: leagueId },
            select: { lineupVisibility: true },
        });

        if (!league) {
            return res.status(404).json({ error: 'Lega non trovata' });
        }

        const race = await prisma.race.findUnique({ where: { id: raceId } });
        if (!race) {
            return res.status(404).json({ error: 'Gara non trovata' });
        }

        const deadline = race.sprintDate || race.gpDate;
        const isDeadlinePassed = new Date() > new Date(deadline);
        const canViewAllLineups = league.lineupVisibility === 'ALWAYS_VISIBLE' || isDeadlinePassed;

        const teams = await prisma.team.findMany({
            where: { leagueId },
            include: {
                user: { select: { username: true, id: true } },
                scores: { where: { raceId } },
                lineups: {
                    where: { raceId },
                    include: {
                        lineupRiders: {
                            include: { rider: true },
                            orderBy: { rider: { category: 'asc' } },
                        },
                    },
                },
            },
        });

        const raceResults = await prisma.raceResult.findMany({
            where: { raceId },
        });
        const resultsMap = new Map(raceResults.map(r => [r.riderId, { position: r.position, status: r.status }]));

        const formattedLineups = teams.map(team => {
            const isOwnTeam = team.user.id === userId;
            const lineup = team.lineups[0];
            const teamScore = team.scores[0];

            const shouldShowLineup = canViewAllLineups || isOwnTeam;

            const lineupRiders = shouldShowLineup && lineup?.lineupRiders ? lineup.lineupRiders.map(lr => ({
                ...lr,
                actualPosition: resultsMap.get(lr.riderId)?.position,
                actualStatus: resultsMap.get(lr.riderId)?.status,
            })) : [];

            return {
                teamId: team.id,
                teamName: team.name,
                userName: team.user.username,
                totalPoints: teamScore?.totalPoints ?? null,
                lineup: lineupRiders,
                riderScores: teamScore?.riderScores ?? [],
                isFallback: lineup?.isFallback,
            };
        });

        const message = !canViewAllLineups ? 'Gli schieramenti degli avversari saranno visibili dopo la deadline della gara.' : undefined;

        res.json({ lineups: formattedLineups, message });

    } catch (error) {
        console.error('Errore recupero schieramenti di lega:', error);
        res.status(500).json({ error: 'Errore nel recupero degli schieramenti' });
    }
};

export const updateLeagueSettings = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { teamsLocked, lineupVisibility } = req.body;
  const userId = req.userId!;

  try {
    const member = await prisma.leagueMember.findUnique({
      where: { userId_leagueId: { userId, leagueId: id } },
    });

    if (!member || member.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo gli amministratori possono modificare le impostazioni.' });
    }

    const updatedLeague = await prisma.league.update({
      where: { id },
      data: {
        teamsLocked,
        lineupVisibility,
      },
    });

    res.json({ success: true, league: updatedLeague });
  } catch (error) {
    res.status(500).json({ error: 'Errore durante l\'aggiornamento delle impostazioni.' });
  }
};

// POST /api/leagues/:id/reset-season - Reset della stagione per una lega
export const resetLeagueSeason = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;
  
  // Opzionale: puoi passare nuove date per la stagione
  const { startDate, endDate } = req.body; 

  try {
    // 1. Verifica che l'utente sia ADMIN della lega
    const member = await prisma.leagueMember.findUnique({
      where: { userId_leagueId: { userId, leagueId: id } },
    });

    if (!member || member.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Solo gli amministratori della lega possono resettare la stagione.' });
    }

    // 2. Esegui il reset in una transazione per garantire l'integrità dei dati
    await prisma.$transaction(async (tx) => {
      
      // Trova tutti i team della lega
      const leagueTeams = await tx.team.findMany({
        where: { leagueId: id },
        select: { id: true }
      });
      
      const teamIds = leagueTeams.map(t => t.id);

      if (teamIds.length > 0) {
        // A. Elimina tutti i punteggi (TeamScore)
        await tx.teamScore.deleteMany({
          where: { teamId: { in: teamIds } }
        });

        // B. Elimina i dettagli delle formazioni (LineupRider)
        // Dobbiamo trovare le lineup prima per cancellare i rider collegati
        const lineups = await tx.raceLineup.findMany({
          where: { teamId: { in: teamIds } },
          select: { id: true }
        });
        const lineupIds = lineups.map(l => l.id);

        if (lineupIds.length > 0) {
            await tx.lineupRider.deleteMany({
                where: { lineupId: { in: lineupIds } }
            });
        }

        // C. Elimina le formazioni (RaceLineup)
        await tx.raceLineup.deleteMany({
          where: { teamId: { in: teamIds } }
        });

        // D. Svuota le rose (TeamRider) - Questo restituisce implicitamente il budget
        await tx.teamRider.deleteMany({
          where: { teamId: { in: teamIds } }
        });

        // E. Resetta i punti di partenza a 0 (se usati)
        await tx.team.updateMany({
          where: { leagueId: id },
          data: { startingPoints: 0 }
        });
      }

      // F. Se esistono regole di esclusività, libera i piloti per la lega
      await tx.leagueRider.deleteMany({
        where: { leagueId: id }
      });

      // G. Aggiorna le date della lega se fornite (per la nuova stagione)
      if (startDate || endDate) {
        await tx.league.update({
          where: { id },
          data: {
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            teamsLocked: false // Sblocca il mercato automaticamente
          }
        });
      }
    });

    res.json({ success: true, message: 'Stagione resettata con successo. I team sono pronti per il nuovo anno.' });

  } catch (error) {
    console.error('Errore reset stagione:', error);
    res.status(500).json({ error: 'Errore durante il reset della stagione.' });
  }
};
