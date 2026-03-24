// backend/src/services/motogpApiService.ts
import axios from 'axios';
import { Category, PrismaClient, RiderType, Rider, SessionType, Race } from '@prisma/client';

const prisma = new PrismaClient();

interface MotoGPApiConfig {
  baseUrl: string;
  resultsApi: string;
  broadcastApi: string;
}

const config: MotoGPApiConfig = {
  baseUrl: 'https://api.pulselive.motogp.com/motogp/v1', 
  resultsApi: 'https://api.pulselive.motogp.com/motogp/v1/results',
  broadcastApi: 'https://api.pulselive.motogp.com/motogp/v1'
};

const CATEGORY_MAPPING: Record<string, Category> = {
  'e8c110ad-64aa-4e8e-8a86-f2f152f6a942': Category.MOTOGP,
  '549640b8-fd9c-4245-acfd-60e4bc38b25c': Category.MOTO2,
  '954f7e65-2ef2-4423-b949-4961cc603e45': Category.MOTO3
};

// Pesi per l'ordinamento dei piloti non classificati
const statusWeight: Record<string, number> = {
  'FINISHED': 0,
  'INSTND': 0,
  'OUTSTND': 1,           // Ritirato a gara in corso
  'NOTFINISHFIRST': 2,    // Caduto al primo giro
  'NOTSTARTED': 3,        // DNS / Non partito
  'NOTONRESTARTGRID': 4,  // Non presentatosi in griglia alla ripartenza
  'DNS': 5,
  'DSQ': 6
};

const getRiderType = (apiRider: any): RiderType => {
    const careerStep = apiRider.current_career_step;
    if (!careerStep || !careerStep.type) return RiderType.TEST_RIDER;

    switch (careerStep.type.toUpperCase()) {
        case 'OFFICIAL': return RiderType.OFFICIAL;
        case 'WILDCARD': return RiderType.WILDCARD;
        case 'REPLACEMENT':
        case 'SUBSTITUTE': return RiderType.REPLACEMENT;
        case 'TEST':
        default: return RiderType.TEST_RIDER;
    }
};

export class MotoGPApiService {
  private axiosInstance = axios.create({
    baseURL: config.baseUrl,
    timeout: 15000,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'FantaMotoGP/1.0'
    }
  });

  async syncRiders() {
    try {
      console.log('🏍️ Sincronizzazione piloti in corso...');
      const response = await this.axiosInstance.get('/riders');
      const riders = response.data;
      
      console.log(`🔎 Trovati ${riders.length} piloti totali dall'API.`);
      let syncedCount = 0;
      let skippedCount = 0;

      for (const apiRider of riders) {
        const riderFullName = `${apiRider.name} ${apiRider.surname}`;
        const careerStep = apiRider.current_career_step;

        if (!careerStep?.category?.legacy_id) {
          console.log(`🟡 SKIPPATO: ${riderFullName} - Nessun career step valido.`);
          skippedCount++;
          continue;
        }
        
        const category = this.mapLegacyCategory(careerStep.category.legacy_id);
        
        if (!category) {
          console.log(`🟡 SKIPPATO: ${riderFullName} - Categoria non gestita (${careerStep.category.name}).`);
          skippedCount++;
          continue;
        }

        const value = this.calculateRiderValue(apiRider);
        const riderType = getRiderType(apiRider);
        const photoUrl = careerStep.pictures?.profile?.main ?? careerStep.pictures?.portrait;
        const isActive = !!careerStep;

        await prisma.rider.upsert({
          where: { apiRiderId: apiRider.id },
          update: {
            name: riderFullName,
            team: careerStep.sponsored_team,
            number: careerStep.number,
            category,
            nationality: apiRider.country.iso,
            value,
            isActive,
            photoUrl: photoUrl,
            riderType,
          },
          create: {
            name: riderFullName,
            number: careerStep.number,
            team: careerStep.sponsored_team,
            category,
            nationality: apiRider.country.iso,
            value,
            isActive,
            photoUrl: photoUrl,
            riderType,
            apiRiderId: apiRider.id,
          }
        });
        syncedCount++;
      }
      
      console.log('🎉 Sincronizzazione piloti completata!');
      console.log(`📊 Riepilogo: ${syncedCount} piloti sincronizzati, ${skippedCount} piloti scartati.`);
    } catch (error) {
      console.error('❌ Errore sincronizzazione piloti:', error);
      throw error;
    }
  }

  async syncRaceCalendar(season: number = new Date().getFullYear()) {
    try {
      console.log(`📅 Sincronizzazione calendario ${season} tramite nuova API...`);
      
      // Chiamata unica che recupera tutto il calendario con dettagli
      const response = await this.axiosInstance.get(`/events?seasonYear=${season}`);
      const allEvents = response.data;

      if (!Array.isArray(allEvents)) {
          throw new Error("Formato risposta API non valido (mi aspettavo un array)");
      }

      console.log(`🔎 Trovati ${allEvents.length} eventi grezzi dall'API.`);

      let processedCount = 0;

      for (const event of allEvents) {
        // 1. Filtriamo solo i Gran Premi (Escludiamo TEST e MEDIA)
        if (event.kind !== 'GP') {
          console.log(`🟡 SKIPPATO: ${event.name} (Tipo: ${event.kind})`);
          continue;
        }

        // 2. Estrazione dati base
        const circuitName = event.circuit?.name || 'Circuito Sconosciuto';
        // A volte il paese è in event.country (codice ISO) o event.circuit.country (Nome esteso)
        const countryName = event.circuit?.country || event.country || 'N/A';
        
        // 3. Estrazione Layout Circuito (dal nuovo JSON path)
        let trackLayoutUrl: string | null = null;
        if (event.circuit?.track?.assets?.info?.path) {
            trackLayoutUrl = event.circuit.track.assets.info.path;
        }

        // 4. Estrazione Date Sessioni (Sprint e Gara) dai 'broadcasts' interni
        let raceDate: Date | null = null;
        let sprintDate: Date | null = null;
        const broadcasts = event.broadcasts || [];

        // Cerchiamo la Gara MotoGP
        const raceSession = broadcasts.find((s: any) => 
            (s.shortname === 'RAC' || s.kind === 'RACE') && 
            s.category?.acronym === 'MGP' && 
            s.type === 'SESSION' // Assicuriamoci sia una sessione
        );
        
        if (raceSession && raceSession.date_start) {
            raceDate = new Date(raceSession.date_start);
        }

        // Cerchiamo la Sprint MotoGP
        const sprintSession = broadcasts.find((s: any) => 
            (s.shortname === 'SPR') && 
            s.category?.acronym === 'MGP'
        );

        if (sprintSession && sprintSession.date_start) {
            sprintDate = new Date(sprintSession.date_start);
        }

        // Se non troviamo la data specifica della gara, usiamo la fine dell'evento
        const finalRaceDate = raceDate || new Date(event.date_end);

        // 5. Determinazione Round (Sequence)
        // Cerchiamo la sequenza specifica per la MotoGP nel JSON
        const mgpCategory = event.event_categories?.find((c: any) => 
            c.category_id === '93888447-8746-4161-882c-e08a1d48447e' // UUID MotoGP 2026
        );
        const roundNumber = mgpCategory?.sequence || event.sequence || 0;

        // 6. Salvataggio nel DB
        await prisma.race.upsert({
          where: { apiEventId: event.id },
          update: {
            name: event.name || event.additional_name,
            circuit: circuitName,
            country: countryName,
            startDate: new Date(event.date_start),
            endDate: new Date(event.date_end),
            gpDate: finalRaceDate,
            sprintDate: sprintDate,
            round: roundNumber,
            season,
            trackLayoutUrl
          },
          create: {
            name: event.name || event.additional_name,
            circuit: circuitName,
            country: countryName,
            startDate: new Date(event.date_start),
            endDate: new Date(event.date_end),
            gpDate: finalRaceDate,
            sprintDate: sprintDate,
            round: roundNumber,
            season,
            apiEventId: event.id,
            trackLayoutUrl
          }
        });
        
        console.log(`✅ Sincronizzato GP: ${event.name} (Round ${roundNumber})`);
        processedCount++;
      }

      // Ricalcolo ordine cronologico di sicurezza (nel caso l'API abbia sequence null o errate)
      console.log('🔄 Verifica ordinamento round...');
      const races = await prisma.race.findMany({
        where: { season, name: { not: { contains: 'TEST' } } }, // Escludiamo test residui
        orderBy: { gpDate: 'asc' }
      });

      for (let i = 0; i < races.length; i++) {
        if (races[i].round !== i + 1) {
            await prisma.race.update({
            where: { id: races[i].id },
            data: { round: i + 1 }
            });
        }
      }
      
      console.log(`🎉 Calendario stagione ${season} completato! ${processedCount} GP importati.`);
    } catch (error) {
      console.error(`❌ Errore sincronizzazione calendario ${season}:`, error);
      throw error;
    }
  }
  
  async syncRaceResults(raceId: string) {
    try {
      const race = await prisma.race.findUnique({ where: { id: raceId } });
      if (!race || !race.apiEventId) throw new Error('Gara non trovata o mancano dati API');

      const resultsApiEventUuid = await this.getResultsApiEventUuid(race.apiEventId);

      let allCategoriesRaceFinished = true;

      for (const [categoryId, category] of Object.entries(CATEGORY_MAPPING)) {
        try {
          const sessionsResponse = await this.axiosInstance.get(`/results/sessions?eventUuid=${resultsApiEventUuid}&categoryUuid=${categoryId}`);
          const sessions = sessionsResponse.data;
          
          // --- LOGICA E LOGS PER LE SESSIONI MULTIPLE (BANDIERA ROSSA) ---
          const racSessions = sessions.filter((s: any) => s.type === 'RAC');
          console.log(`\n[DEBUG - ${category}] Trovate ${racSessions.length} sessioni RAC. Dettagli:`, 
            racSessions.map((s: any) => ({ id: s.id, number: s.number, status: s.status }))
          );

          const sprSessions = sessions.filter((s: any) => s.type === 'SPR');
          if (sprSessions.length > 0) {
            console.log(`[DEBUG - ${category}] Trovate ${sprSessions.length} sessioni SPR. Dettagli:`, 
              sprSessions.map((s: any) => ({ id: s.id, number: s.number, status: s.status }))
            );
          }

          // Ordiniamo e prendiamo quella con il numero più alto
          const raceSession = racSessions.sort((a: any, b: any) => (b.number || 0) - (a.number || 0))[0];
          const sprintSession = sprSessions.sort((a: any, b: any) => (b.number || 0) - (a.number || 0))[0];

          if (raceSession) {
             console.log(`[DEBUG - ${category}] 🎯 RAC Selezionata: number ${raceSession.number}, status: ${raceSession.status}`);
          }
          if (sprintSession) {
             console.log(`[DEBUG - ${category}] 🎯 SPR Selezionata: number ${sprintSession.number}, status: ${sprintSession.status}`);
          }
          console.log('--------------------------------------------------');
          
          const q1Session = sessions.find((s: any) => (s.type === 'Q' && s.number === 1) || s.type === 'Q1');
          const q2Session = sessions.find((s: any) => (s.type === 'Q' && s.number === 2) || s.type === 'Q2');
          const fp1Session = sessions.find((s: any) => (s.type === 'FP' && s.number === 1) || s.type === 'FP1');
          const fp2Session = sessions.find((s: any) => (s.type === 'FP' && s.number === 2) || s.type === 'FP2');
          const prSession = sessions.find((s: any) => s.type === 'PR');

          // Controlla se la gara principale di questa categoria è finita
          if (!raceSession || raceSession.status !== 'FINISHED') {
            allCategoriesRaceFinished = false;
          }

          // Salva i risultati solo per le sessioni terminate
          if (raceSession && raceSession.status === 'FINISHED') {
            const resultsResponse = await axios.get(`https://api.pulselive.motogp.com/motogp/v2/results/classifications?session=${raceSession.id}&test=false`);
            if (resultsResponse.data?.classification) {
              await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.RACE);
            }
          }
          if (sprintSession && sprintSession.status === 'FINISHED') {
            const resultsResponse = await axios.get(`https://api.pulselive.motogp.com/motogp/v2/results/classifications?session=${sprintSession.id}&test=false`);
            if (resultsResponse.data?.classification) {
              await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.SPRINT);
            }
          }
          if (fp1Session && fp1Session.status === 'FINISHED') {
            const resultsResponse = await axios.get(`https://api.pulselive.motogp.com/motogp/v2/results/classifications?session=${fp1Session.id}&test=false`);
            if (resultsResponse.data?.classification) {
                await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.FP1);
            }
          }
          if (fp2Session && fp2Session.status === 'FINISHED') {
            const resultsResponse = await axios.get(`https://api.pulselive.motogp.com/motogp/v2/results/classifications?session=${fp2Session.id}&test=false`);
            if (resultsResponse.data?.classification) {
                await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.FP2);
            }
          }
          if (prSession && prSession.status === 'FINISHED') {
            const resultsResponse = await axios.get(`https://api.pulselive.motogp.com/motogp/v2/results/classifications?session=${prSession.id}&test=false`);
            if (resultsResponse.data?.classification) {
                await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.PR);
            }
          }

          if (q2Session && q2Session.status === 'FINISHED') {
            const q2ResultsResponse = await axios.get(`https://api.pulselive.motogp.com/motogp/v2/results/classifications?session=${q2Session.id}&test=false`);
            if (q2ResultsResponse.data?.classification) {
              let finalClassification = q2ResultsResponse.data.classification;

              if (q1Session && q1Session.status === 'FINISHED') {
                const q1ResultsResponse = await axios.get(`https://api.pulselive.motogp.com/motogp/v2/results/classifications?session=${q1Session.id}&test=false`);
                if (q1ResultsResponse.data?.classification) {
                  const q1Results = q1ResultsResponse.data.classification;
                  const q2RiderIds = new Set(finalClassification.map((r: any) => r.rider.riders_api_uuid));
                  const q1RidersToAppend = q1Results.filter((r: any) => !q2RiderIds.has(r.rider.riders_api_uuid));
                  const lastQ2Position = finalClassification.length;
                  const adjustedQ1Riders = q1RidersToAppend.map((rider: any, index: number) => ({
                      ...rider,
                      position: lastQ2Position + index + 1,
                  }));
                  finalClassification = [...finalClassification, ...adjustedQ1Riders];
                }
              }
              await this.saveRaceResults(raceId, category, finalClassification, SessionType.QUALIFYING);
            }
          }
        } catch (error) {
          console.error(`Errore sync risultati per ${category}:`, error);
        }
      }

      if (allCategoriesRaceFinished) {
        console.log(`🏁 Tutte le gare principali per ${race.name} sono terminate. Avvio calcolo punteggi...`);
        await this.calculateTeamScores(raceId, SessionType.RACE);
        if (race.sprintDate) {
          await this.calculateTeamScores(raceId, SessionType.SPRINT);
        }
      } else {
        console.log(`⏳ In attesa del completamento di tutte le gare principali per ${race.name}. Calcolo punteggi rimandato.`);
      }

      console.log(`✅ Sincronizzazione per ${race.name} completata.`);
      return { success: true, message: 'Sincronizzazione risultati completata.' };
      
    } catch (error) {
      console.error(`❌ Errore critico durante la sincronizzazione dei risultati per la gara ${raceId}:`, error);
      throw error;
    }
  }

  private async sessionHasResults (
    raceId: string, 
    category: Category, 
    sessionType: SessionType
  ): Promise<boolean> {
    const count = await prisma.raceResult.count({
      where: {
        raceId,
        session: sessionType,
        rider: { category }
      }
    });
    return count > 0;
  }

  async syncSession(raceId: string, category: Category, sessionType: SessionType): Promise<boolean> {
    const alreadyExists = await this.sessionHasResults(raceId, category, sessionType);
    
    if (alreadyExists) {
      console.log(`✅ [SKIP] ${category} - ${sessionType} già sincronizzata.`);
      return true; 
    }

    console.log(`🔄 [SYNC] Sincronizzazione ${category} - ${sessionType}...`);

    if (sessionType === SessionType.QUALIFYING) {
      return this.syncQualifyingResults(raceId, category);
    }
    if (sessionType === SessionType.RACE || sessionType === SessionType.SPRINT) {
      return this.syncRaceOrSprint(raceId, category, sessionType);
    }
    if (sessionType.startsWith('FP') || sessionType === 'PR') {
      return this.syncPractice(raceId, category, sessionType);
    }
    
    console.warn(`[SKIP] Tipo di sessione non gestito: ${sessionType}`);
    return false;
  }

  private async syncRaceOrSprint(raceId: string, category: Category, sessionType: 'RACE' | 'SPRINT'): Promise<boolean> {
    const race = await this.findRace(raceId);
    if (!race) return false;

    const categoryId = this.getApiCategoryId(category);
    if (!categoryId) return false;

    try {
        const apiSessionType = sessionType.slice(0, 3); // "RAC" o "SPR"

        // Recuperiamo tutte le sessioni
        const allSessions = await this.getAllApiSessions(race.apiEventId!, categoryId);
        
        // Estrai le sessioni del tipo richiesto
        const targetSessions = allSessions.filter((s: any) => s.type === apiSessionType);
        
        console.log(`\n[DEBUG - syncRaceOrSprint] Evento: ${race.name} | Categoria: ${category} | Tipo: ${apiSessionType}`);
        console.log(`[DEBUG - syncRaceOrSprint] Trovate ${targetSessions.length} sessioni. Dettagli:`, 
             targetSessions.map((s: any) => ({ number: s.number, status: s.status }))
        );

        // Prendi quella con il 'number' più alto
        const session = targetSessions.sort((a: any, b: any) => (b.number || 0) - (a.number || 0))[0];

        if (session) {
             console.log(`[DEBUG - syncRaceOrSprint] 🎯 Selezionata sessione con number ${session.number} e status ${session.status}\n`);
        }

        return await this.processAndSaveSessionResults(race, category, sessionType, session);
    } catch (error) {
        console.error(`[FAIL] Errore sync di ${race.name} - ${category} - ${sessionType}:`, error);
        return false;
    }
  }

  private async syncPractice(raceId: string, category: Category, sessionType: 'FP1' | 'FP2' | 'PR'): Promise<boolean> {
    const race = await this.findRace(raceId);
    if (!race) return false;

    const categoryId = this.getApiCategoryId(category);
    if (!categoryId) return false;

    try {
        const sessionNumber = parseInt(sessionType.replace(/[^0-9]/g, ''), 10) || null;
        const type = sessionType.replace(/[0-9]/g, '');
        
        const session = await this.findApiSession (
            race.apiEventId!, 
            categoryId, 
            s => s.type === sessionType || (s.type === type && s.number === sessionNumber)
        );

        return await this.processAndSaveSessionResults(race, category, sessionType, session);
    } catch (error) {
        console.error(`[FAIL] Errore sync di ${race.name} - ${category} - ${sessionType}:`, error);
        return false;
    }
  }
  
  private async syncQualifyingResults(raceId: string, category: Category): Promise<boolean> {
    const race = await this.findRace(raceId);
    const categoryId = this.getApiCategoryId(category);
    if (!race || !categoryId) return false;
    
    try {
        const allSessions = await this.getAllApiSessions(race.apiEventId!, categoryId);
        const q1Session = allSessions.find((s: any) => s.type === 'Q1' || (s.type === 'Q' && s.number === 1));
        const q2Session = allSessions.find((s: any) => s.type === 'Q2' || (s.type === 'Q' && s.number === 2));

        if (q1Session?.status !== 'FINISHED' || q2Session?.status !== 'FINISHED') {
            console.log(`[WAIT] Qualifiche per ${race.name} - ${category} non ancora concluse.`);
            return false;
        }
        
        const q2Results = await this.fetchSessionResults(q2Session.id);
        const q1Results = await this.fetchSessionResults(q1Session.id);
        
        if (!q2Results || !q1Results) {
            console.log(`[FAIL] Dati di qualifica mancanti per ${race.name} - ${category}.`);
            return false;
        }

        const finalClassification = this.mergeQualifyingResults(q2Results, q1Results);
        
        await this.saveRaceResults(raceId, category, finalClassification, SessionType.QUALIFYING);
        console.log(`[OK] Risultati qualifiche (Q1+Q2) salvati per ${race.name} - ${category}`);
        return true;
    } catch (error) {
        console.error(`[FAIL] Errore sync qualifiche per ${race.name} - ${category}:`, error);
        return false;
    }
  }

  private async fetchSessionResults(sessionId: string): Promise<any[] | null> {
      try {
        const response = await axios.get(`https://api.pulselive.motogp.com/motogp/v2/results/classifications?session=${sessionId}&test=false`);
        return response.data?.classification || null;
      } catch (error) {
        console.error(`Errore nel fetch dei risultati per la sessione ${sessionId}`, error);
        return null;
      }
  }

  private async processAndSaveSessionResults(race: Race, category: Category, sessionType: SessionType, session: any): Promise<boolean> {
    if (!session) {
      console.log(`[INFO] Sessione ${sessionType} per ${race.name} - ${category} non trovata.`);
      return false;
    }

    if (session.status === 'FINISHED') {
      const results = await this.fetchSessionResults(session.id);
      
      if (results) {
        await this.saveRaceResults(race.id, category, results, sessionType);
        console.log(`[OK] Risultati salvati per ${race.name} - ${category} - ${sessionType}`);
        return true;
      }
    } 
    // Caso 2: Sessione è una ripartenza (Gara 2, 3, ecc.) e si trova in stato NOT-STARTED
    else if (session.status === 'NOT-STARTED' && session.number > 1) {
      console.log(`[INFO] Trovata ripartenza (Gara ${session.number}) per ${race.name} in stato NOT-STARTED. Tento il fetch dei risultati...`);
      const results = await this.fetchSessionResults(session.id);
      
      if (results) {
        await this.saveRaceResults(race.id, category, results, sessionType);
        console.log(`[OK] Risultati salvati per Gara ${session.number} di ${race.name} - ${category} - ${sessionType}`);
        return true;
      } else {
         console.log(`[INFO] Gara ${session.number} non ha ancora risultati disponibili nel sistema (Stato: ${session.status}).`);
      }
    } 
    // Nessun caso soddisfatto (es. LIVE, CANCELLED o NOT-STARTED ma è la Gara 1)
    else {
      console.log(`[INFO] Sessione ${sessionType} per ${race.name} - ${category} non elaborabile (Stato: ${session.status}, Numero: ${session.number || 'N/A'}).`);
    }
    return false;
  }

  private mergeQualifyingResults(q2Results: any[], q1Results: any[]): any[] {
    const q2RiderIds = new Set(q2Results.map((r: any) => r.rider.riders_api_uuid));
    const q1RidersToAppend = q1Results.filter((r: any) => !q2RiderIds.has(r.rider.riders_api_uuid));
    const lastQ2Position = q2Results.length;
    
    const finalQ1Riders = q1RidersToAppend.map((rider: any, index: number) => ({
        ...rider,
        position: lastQ2Position + index + 1,
    }));

    return [...q2Results, ...finalQ1Riders];
  }

  private async findRace(raceId: string): Promise<Race | null> {
    const race = await prisma.race.findUnique({ where: { id: raceId } });
    if (!race || !race.apiEventId) {
        console.error(`[HELPER] Gara non trovata o senza apiEventId: ${raceId}`);
        return null;
    }
    return race;
  }

  private getApiCategoryId(category: Category): string | undefined {
    return Object.keys(CATEGORY_MAPPING).find(key => CATEGORY_MAPPING[key] === category);
  }
  
  private async getAllApiSessions(eventUuid: string, categoryUuid: string): Promise<any[]> {
    const resultsApiEventUuid = await this.getResultsApiEventUuid(eventUuid);
    const response = await this.axiosInstance.get(`/results/sessions?eventUuid=${resultsApiEventUuid}&categoryUuid=${categoryUuid}`);
    return response.data;
  }
  
  private async findApiSession(eventUuid: string, categoryUuid: string, filter: (s: any) => boolean): Promise<any | null> {
    const sessions = await this.getAllApiSessions(eventUuid, categoryUuid);
    return sessions.find(filter) || null;
  }

  private async getResultsApiEventUuid(apiEventId: string): Promise<string> {
    try {
      const response = await this.axiosInstance.get(`/events/${apiEventId}`);
      
      if (response.data && response.data['results-api-event-uuid']) {
        return response.data['results-api-event-uuid'];
      }
      
      return apiEventId; 
    } catch (error) {
      console.warn(`[API] Impossibile recuperare i dettagli dell'evento (ID: ${apiEventId}). Uso l'ID base.`, error);
      return apiEventId;
    }
  }

  // --- 🔴 METODO AGGIORNATO CON L'ALGORITMO E IL FIX DELLE POSIZIONI ---
  private async saveRaceResults(raceId: string, category: Category, classification: any[], session: SessionType) {
    // 1. Ordiniamo la classificazione in base all'algoritmo discusso
    const sortedClassification = classification.sort((a: any, b: any) => {
      if (a.position !== null && b.position !== null) return a.position - b.position;
      if (a.position !== null && b.position === null) return -1;
      if (a.position === null && b.position !== null) return 1;

      // Se entrambi sono a position null, si guarda ai giri
      if (a.total_laps !== b.total_laps) {
        return (b.total_laps || 0) - (a.total_laps || 0); // Ordine decrescente
      }

      // Se i giri sono uguali, usiamo i pesi degli status
      const weightA = statusWeight[a.status] || 99;
      const weightB = statusWeight[b.status] || 99;
      
      return weightA - weightB;
    });

    // 2. Iteriamo e salviamo nel DB
    for (let i = 0; i < sortedClassification.length; i++) {
      const result = sortedClassification[i];

      // TRUCCHETTO: se la posizione è null (non classificato), diamo una posizione progressiva fittizia (100+)
      // per permettere al DB di rispettare l'ordinamento calcolato con l'algoritmo.
      const finalPosition = result.position !== null ? result.position : (100 + i);

      let rider = await prisma.rider.findUnique({ where: { apiRiderId: result.rider.riders_api_uuid } });
      
      if (!rider) {
        rider = await this.fetchAndCreateRider(result.rider.riders_api_uuid, category);
        if (!rider) {
            console.warn(`[SAVE RESULTS] ⚠️ Impossibile trovare o creare il pilota ${result.rider.full_name}. Risultato saltato.`);
            continue;
        }
      }
      
      // Mappiamo correttamente i nuovi status in formato enum prisma
      let status: 'FINISHED' | 'DNF' | 'DNS' | 'DSQ' = 'FINISHED';
      if (['OUTSTND', 'DNF', 'NOTFINISHFIRST'].includes(result.status)) {
        status = 'DNF';
      } else if (['DNS', 'NOTSTARTED', 'NOTONRESTARTGRID'].includes(result.status)) {
        status = 'DNS';
      } else if (result.status === 'DSQ') {
        status = 'DSQ';
      } else if (!result.position) {
        status = 'DNF'; // Fallback per sicurezza
      }

      const dataToSave = {
        position: finalPosition, // Usiamo la posizione calcolata!
        points: result.points || 0,
        status,
        time: result.time || null,
        totalLaps: result.total_laps || null,
        bestLap: result.best_lap || null,
      };

      await prisma.raceResult.upsert({
        where: { raceId_riderId_session: { raceId, riderId: rider.id, session } },
        update: dataToSave,
        create: {
          session,
          ...dataToSave,
          race: { connect: { id: raceId } },
          rider: { connect: { id: rider.id } }
        },
      });
    }
  }

  private async fetchAndCreateRider(apiRiderId: string, category: Category): Promise<Rider | null> {
    try {
        console.log(`[RIDER FETCH] Pilota con ID API ${apiRiderId} non trovato nel DB. Tentativo di recupero dall'API MotoGP...`);
        const response = await this.axiosInstance.get(`/riders/${apiRiderId}`);
        const apiRider = response.data;

        if (!apiRider) {
            console.log(`[RIDER FETCH] Nessun dato trovato dall'API per l'ID ${apiRiderId}.`);
            return null;
        }

        const riderFullName = `${apiRider.name} ${apiRider.surname}`;
        const careerStep = apiRider.current_career_step;

        const riderData = {
            name: riderFullName,
            apiRiderId: apiRider.id,
            category,
            number: careerStep?.number || 999, 
            team: careerStep?.sponsored_team || 'Team Sconosciuto',
            nationality: apiRider.country?.iso || 'N/A',
            value: 0,
            isActive: true,
            photoUrl: careerStep?.pictures?.profile?.main ?? careerStep?.pictures?.portrait,
            riderType: getRiderType(apiRider) || RiderType.WILDCARD,
        };

        const newRider = await prisma.rider.create({
            data: riderData
        });
        console.log(`[RIDER FETCH] Pilota "${newRider.name}" creato con successo nel DB.`);
        return newRider;
    } catch (error) {
        console.error(`[RIDER FETCH] ❌ Errore durante il recupero e la creazione del pilota con ID API ${apiRiderId}:`, error);
        return null;
    }
  }

  async calculateTeamScores(raceId: string, session: SessionType) {
    if (session !== SessionType.RACE) {
      console.log(`-- Il calcolo dei punteggi per la sessione ${session} verrà eseguito insieme a quello della gara principale. --`);
      return;
    }

    console.log(`-- Inizio calcolo punteggi combinato (Gara + Sprint) per la gara ${raceId} --`);
    try {
      const allSessionResults = await prisma.raceResult.findMany({
        where: { raceId, session: { in: ['RACE', 'SPRINT'] } },
        include: { rider: true },
      });

      if (allSessionResults.length === 0) {
        console.log(`Nessun risultato (Gara/Sprint) trovato per la gara ${raceId}. Calcolo saltato.`);
        return;
      }
      
      const raceResultsMap = new Map<string, { position: number | null, status: string }>();
      const sprintResultsMap = new Map<string, { position: number | null, status: string }>();
      const maxPositions: Record<string, { race: number, sprint: number }> = {
        MOTOGP: { race: 0, sprint: 0 },
        MOTO2: { race: 0, sprint: 0 },
        MOTO3: { race: 0, sprint: 0 },
      };

      allSessionResults.forEach(result => {
        const category = result.rider.category;
        
        // TRUCCHETTO INVERSO: Per il calcolo base del FantaMotoGP, trattiamo le posizioni > 100 come DNF/null
        const effectivePosition = (result.position && result.position < 100) ? result.position : null;

        if (result.session === 'RACE') {
          raceResultsMap.set(result.riderId, { position: effectivePosition, status: result.status });
          if (effectivePosition) maxPositions[category].race = Math.max(maxPositions[category].race, effectivePosition);
        } else if (result.session === 'SPRINT') {
          sprintResultsMap.set(result.riderId, { position: effectivePosition, status: result.status });
          if (effectivePosition) maxPositions[category].sprint = Math.max(maxPositions[category].sprint, effectivePosition);
        }
      });
      
      // Bonus Qualifiche
      const qualifyingResults = await prisma.raceResult.findMany({
          where: { raceId, session: 'QUALIFYING', position: { in: [1, 2, 3] } },
          select: { riderId: true, position: true }
      });

      const qualifyingBonusMap = new Map<string, number>();
      qualifyingResults.forEach(result => {
          if (result.position === 1) qualifyingBonusMap.set(result.riderId, -5);
          if (result.position === 2) qualifyingBonusMap.set(result.riderId, -3);
          if (result.position === 3) qualifyingBonusMap.set(result.riderId, -2);
      });

      // NUOVO: Bonus Sprint per MotoGP (solo top 10)
      const sprintBonusMap = new Map<string, number>();
      const sprintBonusPoints = [-10, -9, -8, -7, -6, -5, -4, -3, -2, -1]; // Dal 1° al 10°
      
      // Filtra solo i piloti MotoGP per la Sprint
      const motogpSprintResults = await prisma.raceResult.findMany({
        where: { 
          raceId, 
          session: 'SPRINT',
          position: { lte: 10, gte: 1 },
          rider: { category: 'MOTOGP' }
        },
        select: { riderId: true, position: true },
        orderBy: { position: 'asc' }
      });

      motogpSprintResults.forEach(result => {
        if (result.position && result.position <= 10) {
          sprintBonusMap.set(result.riderId, sprintBonusPoints[result.position - 1]);
        }
      });

      const teamsInRace = await prisma.team.findMany({
          include: {
              riders: { include: { rider: true } },
              lineups: { 
                  where: { raceId },
                  include: { lineupRiders: { include: { rider: true } } }
              }
          }
      });

      for (const team of teamsInRace) {
        let lineupToUse = team.lineups[0];
        let calculationNotes = null;

        if (!lineupToUse) {
            const lastValidLineup = await prisma.raceLineup.findFirst({
                where: { teamId: team.id },
                orderBy: { createdAt: 'desc' },
                include: { lineupRiders: { include: { rider: true } } }
            });

            if (lastValidLineup) {
                // Crea una nuova lineup di fallback per la gara corrente
                const createdLineup = await prisma.raceLineup.create({
                    data: {
                        teamId: team.id,
                        raceId: raceId,
                        isFallback: true,
                        lineupRiders: {
                            create: lastValidLineup.lineupRiders.map(lr => ({
                                riderId: lr.riderId,
                                predictedPosition: lr.predictedPosition
                            }))
                        }
                    },
                    include: { lineupRiders: { include: { rider: true } } }
                });
                lineupToUse = createdLineup;
                calculationNotes = `Calcolato usando lo schieramento della gara precedente (fallback).`;
            } else {
                const penaltyRiders = ['MOTOGP', 'MOTO2', 'MOTO3'].flatMap(category => 
                    team.riders
                        .filter(r => r.rider.category === category)
                        .sort((a, b) => a.rider.value - b.rider.value)
                        .slice(0, 2)
                );

                lineupToUse = {
                    lineupRiders: penaltyRiders.map(tr => ({
                        rider: tr.rider,
                        predictedPosition: 30 
                    }))
                } as any;
                calculationNotes = `Nessuno schieramento trovato, applicata penalità massima (fallback).`;
            }
        }
        
        let totalTeamPoints = 0;
        const riderScores = [];

        for (const lineupRider of lineupToUse.lineupRiders) {
          const rider = lineupRider.rider;
          const predictedPosition = lineupRider.predictedPosition;
          
          const raceResult = raceResultsMap.get(rider.id);
          const sprintResult = sprintResultsMap.get(rider.id);
          
          // Calcolo punti base (solo dalla gara principale)
          const raceBasePoints = raceResult?.position ?? (maxPositions[rider.category].race + 1);
          
          // Calcolo malus previsione (solo per la gara principale)
          const racePredictionMalus = Math.abs(predictedPosition - raceBasePoints);
          
          // Bonus qualifiche
          const qualifyingBonus = qualifyingBonusMap.get(rider.id) || 0;
          
          // NUOVO: Bonus Sprint (solo per piloti MotoGP)
          const sprintBonus = sprintBonusMap.get(rider.id) || 0;
          
          // Calcolo totale punti pilota
          const pilotTotalPoints = raceBasePoints + racePredictionMalus + qualifyingBonus + sprintBonus;
          totalTeamPoints += pilotTotalPoints;

          riderScores.push({
            rider: rider.name,
            riderCategory: rider.category,
            points: pilotTotalPoints,
            predicted: predictedPosition,
            actual: raceResult?.position ?? raceResult?.status,
            sprintPosition: sprintResult?.position ?? sprintResult?.status,
            base: raceBasePoints,
            predictionMalus: racePredictionMalus,
            qualifyingBonus,
            sprintBonus,
            details: {
              raceBase: raceBasePoints,
              raceMalus: racePredictionMalus,
            }
          });
        }
        
        await prisma.teamScore.upsert({
          where: { teamId_raceId_session: { teamId: team.id, raceId, session: SessionType.RACE } },
          update: { totalPoints: totalTeamPoints, calculatedAt: new Date(), riderScores: riderScores as any, notes: calculationNotes },
          create: { teamId: team.id, raceId, session: SessionType.RACE, totalPoints: totalTeamPoints, riderScores: riderScores as any, notes: calculationNotes }
        });
        
        await prisma.teamScore.deleteMany({
          where: { teamId: team.id, raceId, session: SessionType.SPRINT }
        });

        console.log(`Team ${team.name}: ${totalTeamPoints} punti (combinato). Note: ${calculationNotes || 'Schieramento regolare'}`);
        console.log(`  - Bonus Sprint applicati: ${[...sprintBonusMap.entries()].filter(([rid]) => 
          lineupToUse.lineupRiders.some((lr: any) => lr.rider.id === rid)
        ).map(([_, bonus]) => bonus).join(', ') || 'nessuno'}`);
      }
    } catch (error) {
      console.error(`Errore nel calcolo dei punteggi combinati per la gara ${raceId}:`, error);
    }
  }
  
  private mapLegacyCategory(legacyId: number): Category | null {
    switch (legacyId) {
      case 3: return Category.MOTOGP;
      case 2: return Category.MOTO2;
      case 1: return Category.MOTO3;
      default: return null;
    }
  }

  private calculateRiderValue(apiRider: any): number {
    const baseValue = 50;
    const championships = apiRider.championships?.length || 0;
    const wins = apiRider.victories || 0;
    
    return Math.min(200, baseValue + (championships * 30) + (wins * 2));
  }
}

export const motogpApi = new MotoGPApiService();