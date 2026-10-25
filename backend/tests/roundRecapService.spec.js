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

const { pickBestAndWorst } = loadTypeScriptModule('../src/services/roundRecapService.ts');

const score = (rider, points, extra = {}) => ({
  rider,
  riderCategory: 'MOTO2',
  points,
  predicted: 3,
  actual: 4,
  ...extra
});

describe('roundRecapService', () => {
  it('picks the rider with the fewest and the most points', () => {
    const { bestPick, worstPick } = pickBestAndWorst([score('Bianchi', 1), score('Neri', 4), score('Blu', 6)]);
    expect(bestPick).toMatchObject({ rider: 'Bianchi', points: 1 });
    expect(worstPick).toMatchObject({ rider: 'Blu', points: 6 });
  });

  it('ignores riders excluded by a cancelled race', () => {
    const { bestPick, worstPick } = pickBestAndWorst([
      score('Rossi', 0, { excluded: true }),
      score('Bianchi', 2),
      score('Neri', 5)
    ]);
    expect(bestPick.rider).toBe('Bianchi');
    expect(worstPick.rider).toBe('Neri');
  });

  it('has no worst pick when a single rider counts', () => {
    expect(pickBestAndWorst([score('Bianchi', 2)])).toMatchObject({ bestPick: { rider: 'Bianchi' }, worstPick: null });
  });

  it('handles missing or invalid rider scores', () => {
    expect(pickBestAndWorst(null)).toEqual({ bestPick: null, worstPick: null });
    expect(pickBestAndWorst([{ rider: 'X', points: '-' }])).toEqual({ bestPick: null, worstPick: null });
  });
});
