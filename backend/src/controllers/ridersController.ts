// backend/src/controllers/ridersController.ts
import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

// GET /api/riders/web - NUOVA FUNZIONE PER LA WEB APP
export const getRidersForWeb = async (req: Request, res: Response) => {
  try {
    const {
      category,
      search,
      sortBy = 'value',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const whereClauses: Prisma.Sql[] = [Prisma.sql`"isActive" = true`];
    if (category) {
      whereClauses.push(Prisma.sql`"category" = ${category}`);
    }
    if (search) {
      const searchString = `%${String(search)}%`;
      whereClauses.push(Prisma.sql`("name" ILIKE ${searchString} OR "team" ILIKE ${searchString})`);
    }

    const where = Prisma.sql`WHERE ${Prisma.join(whereClauses, ' AND ')}`;

    const riderTypeOrder = Prisma.sql`
      CASE "riderType"
        WHEN 'OFFICIAL' THEN 1
        WHEN 'REPLACEMENT' THEN 2
        WHEN 'WILDCARD' THEN 3
        WHEN 'TEST_RIDER' THEN 4
        ELSE 5
      END
    `;

    const orderBy = Prisma.sql`ORDER BY ${riderTypeOrder} ASC, "value" DESC, "number" ASC`;

    const ridersRaw: any[] = await prisma.$queryRaw`
      SELECT * FROM "Rider"
      ${where}
      ${orderBy}
      LIMIT ${Number(limit)}
      OFFSET ${skip}
    `;
    
    const riders = ridersRaw.map(rider => ({
      ...rider,
      number: Number(rider.number),
      value: Number(rider.value),
    }));

    const total = await prisma.rider.count({
        where: {
            isActive: true,
            ...(category && { category: category as any }),
            ...(search && {
                OR: [
                    { name: { contains: String(search), mode: 'insensitive' } },
                    { team: { contains: String(search), mode: 'insensitive' } },
                ]
            })
        }
    });

    res.json({
      riders, // Invia i dati corretti per il web
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Errore recupero piloti per web:', error);
    res.status(500).json({ error: 'Errore nel recupero dei piloti' });
  }
};

// GET /api/riders - Lista piloti con filtri e ordinamento personalizzato
export const getRiders = async (req: Request, res: Response) => {
  try {
    const {
      category,
      search,
      sortBy = 'value',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Costruisci filtri
    const whereClauses: Prisma.Sql[] = [Prisma.sql`"isActive" = true`];
    if (category) {
      whereClauses.push(Prisma.sql`"category" = ${category}`);
    }
    if (search) {
      const searchString = `%${String(search)}%`;
      whereClauses.push(Prisma.sql`("name" ILIKE ${searchString} OR "team" ILIKE ${searchString})`);
    }

    const where = Prisma.sql`WHERE ${Prisma.join(whereClauses, ' AND ')}`;

    // Ordinamento personalizzato per riderType
    const riderTypeOrder = Prisma.sql`
      CASE "riderType"
        WHEN 'OFFICIAL' THEN 1
        WHEN 'REPLACEMENT' THEN 2
        WHEN 'WILDCARD' THEN 3
        WHEN 'TEST_RIDER' THEN 4
        ELSE 5
      END
    `;

    const orderBy = Prisma.sql`ORDER BY ${riderTypeOrder} ASC, "value" DESC, "number" ASC`;

    // Query piloti con ordinamento personalizzato
    const riders = await prisma.$queryRaw`
      SELECT * FROM "Rider"
      ${where}
      ${orderBy}
      LIMIT ${Number(limit)}
      OFFSET ${skip}
    `;

    const total = await prisma.rider.count({
        where: {
            isActive: true,
            ...(category && { category: category as any }),
            ...(search && {
                OR: [
                    { name: { contains: String(search), mode: 'insensitive' } },
                    { team: { contains: String(search), mode: 'insensitive' } },
                ]
            })
        }
    });

    res.json({
      riders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Errore recupero piloti:', error);
    res.status(500).json({ error: 'Errore nel recupero dei piloti' });
  }
};

// GET /api/riders/values - Valori di mercato
export const getRiderValues = async (req: Request, res: Response) => {
  try {
    const values = await prisma.rider.groupBy({
      by: ['category'],
      where: { isActive: true },
      _avg: { value: true },
      _min: { value: true },
      _max: { value: true },
      _count: true
    });

    res.json({ values });
  } catch (error) {
    console.error('Errore recupero valori:', error);
    res.status(500).json({ error: 'Errore nel recupero dei valori' });
  }
};

// PUT /api/riders/:id/value - Aggiorna valore pilota (ADMIN)
export const updateRiderValue = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { value } = req.body;

    const updatedRider = await prisma.rider.update({
      where: { id },
      data: { value: Number(value) }
    });

    res.json({
      success: true,
      rider: updatedRider
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Pilota non trovato' });
    }

    console.error('Errore aggiornamento valore:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del valore' });
  }
};

// GET /api/riders/:id - Ottieni dettagli di un pilota
export const getRiderById = async (req: Request, res: Response) => {
  const { id } = req.params; // Corretto: usa 'id'

  try {
    const rider = await prisma.rider.findUnique({
      where: { id }, // Corretto: usa 'id'
      include: {
        statistics: {
          where: {
            season: new Date().getFullYear(),
          },
        },
        raceResults: {
          take: 10,
          orderBy: {
            race: {
              gpDate: 'desc',
            },
          },
          include: {
            race: {
              select: {
                id: true,
                name: true,
                circuit: true,
                gpDate: true,
              },
            },
          },
        },
      },
    });

    if (!rider) {
      return res.status(404).json({ error: 'Pilota non trovato' });
    }

    res.json({ rider });
  } catch (error) {
    console.error('Errore recupero dettagli pilota:', error);
    res.status(500).json({ error: 'Errore nel recupero dei dettagli del pilota' });
  }
};

// GET /api/riders/:id/stats - Ottieni statistiche di un pilota
export const getRiderStats = async (req: Request, res: Response) => {
  const { id: riderId } = req.params; // Corretto: usa 'id' e rinominalo in riderId
  const { season } = req.query;
  const targetSeason = season ? parseInt(season as string) : new Date().getFullYear();

  try {
    // Statistiche stagionali
    const seasonStats = await prisma.riderStats.findUnique({
      where: {
        riderId_season: {
          riderId,
          season: targetSeason,
        },
      },
    });

    // Risultati della stagione
    const seasonResults = await prisma.raceResult.findMany({
      where: {
        riderId,
        race: {
          season: targetSeason,
        },
      },
      include: {
        race: {
          select: {
            id: true,
            name: true,
            circuit: true,
            gpDate: true,
            round: true,
          },
        },
      },
      orderBy: {
        race: {
          round: 'asc',
        },
      },
    });

    // Calcola statistiche aggiuntive
    const stats = {
      season: targetSeason,
      races: seasonResults.length,
      wins: seasonResults.filter(r => r.position === 1).length,
      podiums: seasonResults.filter(r => r.position && r.position <= 3).length,
      top10: seasonResults.filter(r => r.position && r.position <= 10).length,
      dnf: seasonResults.filter(r => r.status === 'DNF').length,
      avgPosition: seasonStats?.avgPosition || 0,
      points: seasonStats?.points || 0,
      bestResult: Math.min(...seasonResults.filter(r => r.position).map(r => r.position!)),
      worstResult: Math.max(...seasonResults.filter(r => r.position).map(r => r.position!)),
    };

    // Grafico posizioni
    const positionChart = seasonResults.map(result => ({
      round: result.race.round,
      race: result.race.name,
      position: result.position || null,
      status: result.status,
    }));

    res.json({
      rider: riderId,
      season: targetSeason,
      stats,
      positionChart,
      results: seasonResults,
    });
  } catch (error) {
    console.error('Errore recupero statistiche pilota:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
};

// GET /api/riders/by-category/:category - Ottieni piloti per categoria
export const getRidersByCategory = async (req: Request, res: Response) => {
  const { category } = req.params;

  if (!['MOTOGP', 'MOTO2', 'MOTO3'].includes(category)) {
    return res.status(400).json({ error: 'Categoria non valida' });
  }

  try {
    const riders = await prisma.rider.findMany({
      where: {
        category: category as any,
        isActive: true,
      },
      orderBy: [
        { value: 'desc' },
        { number: 'asc' },
      ],
    });

    res.json({
      category,
      riders,
      total: riders.length,
    });
  } catch (error) {
    console.error('Errore recupero piloti per categoria:', error);
    res.status(500).json({ error: 'Errore nel recupero dei piloti' });
  }
};
