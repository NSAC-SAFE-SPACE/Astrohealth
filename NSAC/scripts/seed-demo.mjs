import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const host = getArg('--host', 'localhost');
const port = getArg('--port', '5173');
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const child = spawn(process.execPath, [vite, '--mode', 'demo', '--host', host, '--port', port, '--strictPort', '--open'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_LOAD_DEMO_DATA: 'true',
    VITE_DEMO_SEED_FORCE: 'true'
  }
});

console.log(`Demo dataset refresh is enabled for ${host}:${port}. The browser seeds its own IndexedDB when Astrohealth starts. Only marked demo records are refreshed; manual entries stay intact. Stop the server with Ctrl+C when finished.`);
child.on('exit', (code) => { process.exitCode = code ?? 1; });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
