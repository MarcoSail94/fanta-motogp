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
  buildRaceScoringPlan,
  pickApiSession,
  summarizeRaceCancellations
} = loadTypeScriptModule('../src/services/raceCancellationService.ts');

describe('raceCancellationService', () => {
  it('scores every category when all races have results', () => {
    expect(buildRaceScoringPlan(['MOTOGP', 'MOTO2', 'MOTO3'], [])).toEqual({
      status: 'READY',
      scorableCategories: ['MOTOGP', 'MOTO2', 'MOTO3'],
      cancelledCategories: [],
      pendingCategories: []
    });
  });

  it('excludes a cancelled category while another one has results', () => {
    expect(buildRaceScoringPlan(['MOTO2', 'MOTO3'], ['MOTOGP'])).toMatchObject({
      status: 'READY',
      scorableCategories: ['MOTO2', 'MOTO3'],
      cancelledCategories: ['MOTOGP']
    });
    expect(buildRaceScoringPlan(['MOTO3'], ['MOTOGP', 'MOTO2'])).toMatchObject({
      status: 'READY',
      scorableCategories: ['MOTO3']
    });
  });

  it('annuls the round when every race is cancelled', () => {
    expect(buildRaceScoringPlan([], ['MOTOGP', 'MOTO2', 'MOTO3'])).toMatchObject({
      status: 'ANNULLED',
      scorableCategories: [],
      cancelledCategories: ['MOTOGP', 'MOTO2', 'MOTO3']
    });
  });

  it('waits while a category has neither results nor a cancellation', () => {
    expect(buildRaceScoringPlan(['MOTO2'], ['MOTOGP'])).toMatchObject({
      status: 'PENDING',
      pendingCategories: ['MOTO3']
    });
    expect(buildRaceScoringPlan([], [])).toMatchObject({ status: 'PENDING' });
  });

  it('lets saved results win over a stale cancellation', () => {
    expect(buildRaceScoringPlan(['MOTOGP', 'MOTO2', 'MOTO3'], ['MOTOGP'])).toMatchObject({
      status: 'READY',
      cancelledCategories: []
    });
  });

  it('summarizes cancellations for the frontend', () => {
    const partial = summarizeRaceCancellations([
      { category: 'MOTOGP', session: 'RACE' },
      { category: 'MOTOGP', session: 'SPRINT' }
    ]);
    expect(partial).toMatchObject({ cancelledRaceCategories: ['MOTOGP'], isCancelled: false });
    expect(partial.cancelledSessions).toHaveLength(2);

    const full = summarizeRaceCancellations(
      ['MOTO3', 'MOTOGP', 'MOTO2'].map(category => ({ category, session: 'RACE' }))
    );
    expect(full).toMatchObject({ cancelledRaceCategories: ['MOTOGP', 'MOTO2', 'MOTO3'], isCancelled: true });
  });

  it('falls back to the last finished session when the latest one is cancelled', () => {
    expect(pickApiSession([
      { id: 'a', number: 1, status: 'FINISHED' },
      { id: 'b', number: 2, status: 'CANCELLED' }
    ])).toMatchObject({ id: 'a' });
    expect(pickApiSession([{ id: 'c', number: null, status: 'CANCELLED' }])).toMatchObject({ id: 'c' });
    expect(pickApiSession([
      { id: 'd', number: 1, status: 'FINISHED' },
      { id: 'e', number: 2, status: 'NOT-STARTED' }
    ])).toMatchObject({ id: 'e' });
    expect(pickApiSession([])).toBeUndefined();
  });
});
