import blessed from 'blessed';
import { GameState } from './state.js';
import { Screen } from './screen.js';

// Create blessed screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'Taipan',
  cursor: {
    artificial: true,
    shape: 'line',
    blink: true,
    color: null
  },
  terminal: 'xterm-256color',
  fullUnicode: true,
  autoPadding: true,
  warnings: true,
  debug: true
});

// Set terminal title
process.title = 'Taipan';

// Initialize game state
const game = new GameState();

// Initialize screen handler
const screenHandler = new Screen(screen, game);

// Handle input - only escape and ctrl-c for program exit
screen.key(['escape', 'C-c'], function(ch, key) {
  return process.exit(0);
});

// Handle general input
screen.on('keypress', function(ch, key) {
  // Ignore input when input box is focused
  if (screenHandler.inputBox.focused) {
    return;
  }

  if (!key) return;

  // Convert numpad keys to regular numbers
  if (key.name && key.name.startsWith('num')) {
    key.name = key.name.replace('num', '');
  }

  let inputKey = key.name;
  
  // Handle enter/return keys
  if (key.name === 'return' || key.name === 'enter') {
    inputKey = 'enter';
  }
});

// Start the game
async function startGame() {
  // Show splash screen and wait for enter
  await screenHandler.showSplashScreen();
  
  // Show name firm screen and wait for input
  const firmName = await screenHandler.showNameFirm();
  game.firm = firmName;
  
  // Show start choice screen and wait for selection
  const choice = await screenHandler.showStartChoice();
  if (choice === '1') {
    game.cashStart();
  } else {
    game.gunsStart();
  }
  
  // Set initial prices and show port
  game.setPrices();
  screenHandler.showPortStats();

  let isPlaying = true;
  
  // Main game loop
  while (isPlaying) {
    // Show current port status
    screenHandler.showPortStats();

    // Show port choices and wait for player action
    screenHandler.showPortChoices("What is your wish, Taipan?");

    // Wait for and handle player input
    await new Promise(resolve => {
      const handler = async (ch, key) => {
        if (!screenHandler.inputBox.focused) {
          // Handle port actions
          switch(key.name) {
            case 'b':
            case 'B':
              screen.removeListener('keypress', handler);
              await screenHandler.showBuy();
              resolve();
              break;
            case 's':
            case 'S':
              screen.removeListener('keypress', handler);
              await screenHandler.showSell();
              resolve();
              break;
            case 'v':
            case 'V':
              if (game.port === 1) { // Only in Hong Kong
                // TODO: Visit Bank
              }
              break;
            case 't':
            case 'T':
              if (game.port === 1) { // Only in Hong Kong
                // TODO: Transfer Cargo
              }
              break;
            case 'w':
            case 'W':
              if (game.port === 1) { // Only in Hong Kong
                // TODO: Wheedle Wu
              }
              break;
            case 'r':
            case 'R':
              if (game.port === 1 && (game.cash + game.bank) >= 1000000) {
                isPlaying = false;
                screen.removeListener('keypress', handler);
                resolve();
              }
              break;
            case 'q':
            case 'Q':
              screen.removeListener('keypress', handler);
              const didTravel = await screenHandler.showTravel();
              
              if (didTravel) {
                // Random events during travel
                
                // Random chance of storm (10%)
                if (Math.random() < 0.1) {
                  await screenHandler.showMessage("Storm, Taipan!!");
                  await new Promise(r => setTimeout(r, 2000));
                  
                  // 1/30 chance of critical damage during storm
                  if (Math.random() < 0.033) {
                    await screenHandler.showMessage("I think we're going down!!");
                    await new Promise(r => setTimeout(r, 2000));
                    
                    // Check if ship survives based on damage
                    const status = game.getShipStatus();
                    if (status.percent <= 30) {
                      await screenHandler.showMessage("We're going down, Taipan!!");
                      await new Promise(r => setTimeout(r, 2000));
                      isPlaying = false;
                      break;
                    }
                  }
                  
                  await screenHandler.showMessage("We made it!!");
                  await new Promise(r => setTimeout(r, 2000));
                  
                  // 1/3 chance of being blown off course
                  if (Math.random() < 0.33) {
                    const origPort = game.port;
                    do {
                      game.port = Math.floor(Math.random() * 7) + 1;
                    } while (game.port === origPort);
                    
                    await screenHandler.showMessage(`We've been blown off course to ${game.locations[game.port]}`);
                    await new Promise(r => setTimeout(r, 2000));
                  }
                }
                
                // TODO: Add more random events like:
                // - Hostile ships
                // - Li Yuen encounters
                // - Cargo theft
                // - etc.
              }
              
              resolve();
              break;
          }
        }
      };
      screen.on('keypress', handler);
    });
  }

  // Game over cleanup
  screen.destroy();
  process.exit(0);
}

// Start the game
startGame().catch(err => {
  console.error('Game error:', err);
  process.exit(1);
});

// Ensure proper cleanup on exit
process.on('exit', () => {
  screen.destroy();
});

// Render screen
screen.render(); 