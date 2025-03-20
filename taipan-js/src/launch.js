import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { debugLog } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine the terminal command based on OS
const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';

function launchGame() {
  const gamePath = resolve(__dirname, 'index.js');
  let terminal;
  let args;

  if (isWindows) {
    terminal = 'cmd.exe';
    args = ['/c', 'start', 'cmd.exe', '/c', 'node', gamePath];
  } else if (isMac) {
    terminal = 'osascript';
    args = [
      '-e', 
      `tell application "Terminal" to do script "node ${gamePath}"`
    ];
  } else {
    // Linux and others
    terminal = 'x-terminal-emulator';
    args = ['-e', `node ${gamePath}`];
  }

  debugLog('Launching game in new terminal:', { terminal, args });

  const proc = spawn(terminal, args, {
    stdio: 'inherit',
    detached: true
  });

  proc.on('error', (err) => {
    console.error('Failed to launch game:', err);
    process.exit(1);
  });

  // Don't wait for the game to exit
  proc.unref();
}

launchGame(); 