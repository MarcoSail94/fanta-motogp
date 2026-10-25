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
  isClassifiedPosition,
  toPublicPosition,
  withPublicPosition
} = loadTypeScriptModule('../src/services/resultPositions.ts');

describe('resultPositions', () => {
  it('keeps real positions', () => {
    expect(toPublicPosition(1)).toBe(1);
    expect(toPublicPosition(99)).toBe(99);
    expect(isClassifiedPosition(24)).toBe(true);
  });

  it('hides the 100+ placeholder of non-classified riders', () => {
    expect(toPublicPosition(100)).toBeNull();
    expect(toPublicPosition(117)).toBeNull();
    expect(toPublicPosition(null)).toBeNull();
    expect(isClassifiedPosition(103)).toBe(false);
  });

  it('maps a result without touching the other fields', () => {
    expect(withPublicPosition({ riderId: 'r1', position: 105, status: 'DNS' }))
      .toEqual({ riderId: 'r1', position: null, status: 'DNS' });
  });
});
