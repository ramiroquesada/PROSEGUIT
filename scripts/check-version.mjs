import { readFile } from 'node:fs/promises';

const manifests = [
  ['raíz', new URL('../package.json', import.meta.url)],
  ['backend', new URL('../backend/package.json', import.meta.url)],
  ['frontend', new URL('../frontend/package.json', import.meta.url)],
];

const versions = await Promise.all(
  manifests.map(async ([name, url]) => {
    const packageJson = JSON.parse(await readFile(url, 'utf8'));
    return [name, packageJson.version];
  }),
);

const expectedVersion = versions[0][1];
const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

if (!semverPattern.test(expectedVersion)) {
  throw new Error(`La versión ${expectedVersion} no cumple SemVer.`);
}

const mismatches = versions.filter(([, version]) => version !== expectedVersion);
if (mismatches.length > 0) {
  const detail = versions.map(([name, version]) => `${name}=${version}`).join(', ');
  throw new Error(`Las versiones de la aplicación no coinciden: ${detail}`);
}

console.log(`PROSEGUIT v${expectedVersion}: versiones sincronizadas.`);
