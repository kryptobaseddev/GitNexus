#!/usr/bin/env node
/**
 * Build script that compiles gitnexus, optionally bundles the local web UI,
 * and inlines gitnexus-shared into the dist.
 *
 * Steps:
 *  1. Build gitnexus-shared (tsc)
 *  2. Build gitnexus (tsc)
 *  3. Copy gitnexus-shared/dist → dist/_shared
 *  4. Build gitnexus-web when present in the monorepo
 *  5. Copy gitnexus-web/dist → dist/web when available
 *  6. Rewrite bare 'gitnexus-shared' specifiers → relative paths
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHARED_ROOT = path.resolve(ROOT, '..', 'gitnexus-shared');
const WEB_ROOT = path.resolve(ROOT, '..', 'gitnexus-web');
const DIST = path.join(ROOT, 'dist');
const SHARED_DEST = path.join(DIST, '_shared');
const WEB_DEST = path.join(DIST, 'web');

function resolveLocalBin(packageRoot, binName) {
  const ext = process.platform === 'win32' ? '.cmd' : '';
  return path.join(packageRoot, 'node_modules', '.bin', `${binName}${ext}`);
}

function runLocalBin(packageRoot, binName, args = '') {
  const binPath = resolveLocalBin(packageRoot, binName);
  if (!fs.existsSync(binPath)) {
    throw new Error(
      `Missing local binary: ${binName} in ${packageRoot}. Run npm install in that package first.`,
    );
  }

  const quotedBin = JSON.stringify(binPath);
  const command = args ? `${quotedBin} ${args}` : quotedBin;
  execSync(command, { cwd: packageRoot, stdio: 'inherit' });
}

// ── 1. Build gitnexus-shared ───────────────────────────────────────
console.log('[build] compiling gitnexus-shared…');
runLocalBin(SHARED_ROOT, 'tsc');

// ── 2. Build gitnexus ──────────────────────────────────────────────
console.log('[build] compiling gitnexus…');
runLocalBin(ROOT, 'tsc');

// ── 3. Copy shared dist ────────────────────────────────────────────
console.log('[build] copying shared module into dist/_shared…');
fs.cpSync(path.join(SHARED_ROOT, 'dist'), SHARED_DEST, { recursive: true });

// ── 4. Build bundled web UI when available ─────────────────────────
if (fs.existsSync(WEB_ROOT)) {
  console.log('[build] compiling gitnexus-web…');
  execSync('npm run build', { cwd: WEB_ROOT, stdio: 'inherit' });

  console.log('[build] copying web UI into dist/web…');
  fs.rmSync(WEB_DEST, { recursive: true, force: true });
  fs.cpSync(path.join(WEB_ROOT, 'dist'), WEB_DEST, { recursive: true });
} else {
  console.log('[build] gitnexus-web not present, skipping bundled web UI build.');
}

// ── 5. Rewrite imports ─────────────────────────────────────────────
console.log('[build] rewriting gitnexus-shared imports…');
let rewritten = 0;

function rewriteFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('gitnexus-shared')) return;

  const relDir = path.relative(path.dirname(filePath), SHARED_DEST);
  // Always use posix separators and point to the package index
  const relImport = relDir.split(path.sep).join('/') + '/index.js';

  const updated = content
    .replace(/from\s+['"]gitnexus-shared['"]/g, `from '${relImport}'`)
    .replace(/import\(\s*['"]gitnexus-shared['"]\s*\)/g, `import('${relImport}')`);

  if (updated !== content) {
    fs.writeFileSync(filePath, updated);
    rewritten++;
  }
}

function walk(dir, extensions, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, extensions, cb);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      cb(full);
    }
  }
}

walk(DIST, ['.js', '.d.ts'], rewriteFile);

// ── 6. Make CLI entry executable ────────────────────────────────────
const cliEntry = path.join(DIST, 'cli', 'index.js');
if (fs.existsSync(cliEntry)) fs.chmodSync(cliEntry, 0o755);

console.log(`[build] done — rewrote ${rewritten} files.`);
