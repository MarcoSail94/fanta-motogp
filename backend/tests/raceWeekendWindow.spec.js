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

const { findRaceWeekend } = loadTypeScriptModule('../src/services/raceWeekendWindow.ts');

const weekend = (id, startDate, endDate) => ({
  id,
  startDate: new Date(startDate),
  endDate: new Date(endDate)
});

// Date reali 2026: Australia e Malesia sono in weekend consecutivi
const australia = weekend('australia', '2026-10-22T21:00:00Z', '2026-10-25T12:00:00Z');
const malaysia = weekend('malaysia', '2026-10-30T00:00:00Z', '2026-11-01T10:00:00Z');
const races = [malaysia, australia];

const raceAt = iso => findRaceWeekend(races, new Date(iso))?.id ?? null;

describe('raceWeekendWindow', () => {
  it('detects the weekend while it is running', () => {
    expect(raceAt('2026-10-23T15:00:00Z')).toBe('australia');
    expect(raceAt('2026-10-25T05:00:00Z')).toBe('australia');
  });

  it('keeps the finished weekend for the Monday calculation, even when the cron is late', () => {
    expect(raceAt('2026-10-26T09:00:00Z')).toBe('australia');
    expect(raceAt('2026-10-26T18:30:00Z')).toBe('australia');
    expect(raceAt('2026-10-27T11:00:00Z')).toBe('australia');
  });

  it('closes the window two days after the end of the weekend', () => {
    expect(raceAt('2026-10-27T13:00:00Z')).toBeNull();
    expect(raceAt('2026-10-28T12:00:00Z')).toBeNull();
  });

  it('opens the next weekend one day before it starts', () => {
    expect(raceAt('2026-10-28T23:00:00Z')).toBeNull();
    expect(raceAt('2026-10-29T01:00:00Z')).toBe('malaysia');
  });

  it('prefers the weekend that started first when windows overlap', () => {
    const next = weekend('next', '2026-10-27T00:00:00Z', '2026-10-29T00:00:00Z');
    expect(findRaceWeekend([next, australia], new Date('2026-10-26T12:00:00Z'))?.id).toBe('australia');
  });
});
