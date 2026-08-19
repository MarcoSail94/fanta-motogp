const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const loadTypeScriptModule = (relativePath) => {
  const filename = path.resolve(__dirname, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2016
    },
    fileName: filename
  });
  const compiledModule = new Module(filename, module);
  compiledModule.filename = filename;
  compiledModule.paths = Module._nodeModulePaths(path.dirname(filename));
  compiledModule._compile(outputText, filename);
  return compiledModule.exports;
};

const {
  buildLeagueStandings,
  calculateTotalPoints
} = loadTypeScriptModule('../src/services/standingsService.ts');

const race1 = new Date('2026-03-01T14:00:00Z');
const race2 = new Date('2026-03-08T14:00:00Z');

const score = (raceId, gpDate, totalPoints) => ({
  raceId,
  race: { gpDate },
  totalPoints
});

const teams = [
  {
    id: 'alpha',
    name: 'Alpha',
    userId: 'user-alpha',
    startingPoints: 10,
    user: { username: 'alice' },
    scores: [score('race-1', race1, 5), score('race-2', race2, 10)]
  },
  {
    id: 'beta',
    name: 'Beta',
    userId: 'user-beta',
    startingPoints: 0,
    user: { username: 'bob' },
    scores: [score('race-1', race1, 20)]
  },
  {
    id: 'gamma',
    name: 'Gamma',
    userId: 'user-gamma',
    startingPoints: 3,
    user: { username: 'carol' },
    scores: []
  }
];

describe('standingsService', () => {
  it('includes starting points and teams without race scores', () => {
    const standings = buildLeagueStandings(teams);

    expect(standings.map(({ teamId, totalPoints, position }) => ({
      teamId,
      totalPoints,
      position
    }))).toEqual([
      { teamId: 'gamma', totalPoints: 3, position: 1 },
      { teamId: 'beta', totalPoints: 20, position: 2 },
      { teamId: 'alpha', totalPoints: 25, position: 3 }
    ]);
    expect(calculateTotalPoints(7, 13)).toBe(20);
  });

  it('calculates last-race points and trend from the latest global race', () => {
    const standings = buildLeagueStandings(teams);
    const alpha = standings.find(team => team.teamId === 'alpha');
    const beta = standings.find(team => team.teamId === 'beta');
    const gamma = standings.find(team => team.teamId === 'gamma');

    expect(alpha).toMatchObject({ lastRacePoints: 10, gamesPlayed: 2, trend: 'down' });
    expect(beta).toMatchObject({ lastRacePoints: null, gamesPlayed: 1, trend: 'up' });
    expect(gamma).toMatchObject({ lastRacePoints: null, gamesPlayed: 0, trend: 'same' });
  });

  it('does not expose a trend before a previous race exists', () => {
    const firstRoundTeams = teams.map(team => ({
      ...team,
      scores: team.scores.filter(item => item.raceId === 'race-1')
    }));

    expect(buildLeagueStandings(firstRoundTeams).every(team => team.trend === null)).toBe(true);
  });
});
