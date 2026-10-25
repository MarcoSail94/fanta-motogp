// backend/src/services/raceWeekendDetector.ts
import { PrismaClient } from '@prisma/client';
import { findRaceWeekend, getRaceWeekendBounds } from './raceWeekendWindow';

const prisma = new PrismaClient();

export class RaceWeekendDetector {
  /**
   * Verifica se siamo attualmente in un weekend di gara
   * Logica: il weekend (startDate-endDate) inizia entro un giorno
   * o è finito da meno di due giorni
   */
  async isRaceWeekend(): Promise<{ isRaceWeekend: boolean; raceId?: string; race?: any }> {
    const now = new Date();
    const { startsBefore, endsAfter } = getRaceWeekendBounds(now);

    const candidates = await prisma.race.findMany({
      where: {
        startDate: { lte: startsBefore },
        endDate: { gte: endsAfter }
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    const race = findRaceWeekend(candidates, now);

    if (race) {
      console.log(`✅ Weekend di gara: ${race.name} (${race.startDate.toISOString()} - ${race.endDate.toISOString()})`);
      return {
        isRaceWeekend: true,
        raceId: race.id,
        race
      };
    }

    console.log(`🏖️ Nessuna gara questo weekend`);
    return { isRaceWeekend: false };
  }
}

export const raceWeekendDetector = new RaceWeekendDetector();
