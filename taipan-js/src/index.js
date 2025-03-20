import blessed from 'blessed';
import { GameState } from './state.js';
import { Screen } from './screen.js';
import { CaptainsReport } from './screens/CaptainsReport.js';

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

// Initialize screen handlers
const screenHandler = new Screen(screen, game);
const captainsReport = new CaptainsReport(screen, game);

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
    await screenHandler.showPortStats();

    // Check for Li Yuen extortion in Hong Kong
    if (game.port === 1 && game.li === 0 && game.cash > 0) {
      await screenHandler.showLiYuen();
    }

    // Random chance for ship or gun offers (25% chance)
    if (Math.random() < 0.25) {
      if (Math.random() < 0.5) {
        await screenHandler.showNewShip();
      } else if (game.guns < 1000) {
        await screenHandler.showNewGun();
      }
    }

    // Check for McHenry's repair offer in Hong Kong when damaged
    if (game.port === 1 && game.damage > 0) {
      await screenHandler.showMcHenry();
    }

    // Check for Li Yuen's lieutenant message when not in Hong Kong
    if (game.port !== 1 && game.li === 0 && Math.random() > 0.25) {
      await screenHandler.showLiYuenLieutenant();
    }

    // Check for warehouse theft (1/50 chance if warehouse has cargo)
    const warehouseTotal = game.warehouseStock.reduce((a, b) => a + b, 0);
    if (Math.random() < 0.02 && warehouseTotal > 0) {
      // Calculate stolen amounts (about 45% of each type)
      for (let i = 0; i < 4; i++) {
        game.warehouseStock[i] = Math.floor(game.warehouseStock[i] * 0.55);
      }
      await screenHandler.showWarehouseTheft();
    }

    // Check for opium seizure when not in Hong Kong (1/18 chance)
    if (game.port !== 1 && Math.random() < 0.0556 && game.holdStock[0] > 0) {
      // Calculate fine (random portion of cash divided by 1.8, plus 1)
      const fine = Math.floor((game.cash / 1.8) * Math.random()) + 1;
      
      // Update game state
      game.hold += game.holdStock[0];  // Add opium space back to hold
      game.holdStock[0] = 0;  // Remove all opium
      game.cash = Math.max(0, game.cash - fine);  // Deduct fine, prevent negative cash
      
      await screenHandler.showOpiumSeizure(fine);
    }

    // Check for robbery when player has lots of cash (5% chance)
    if (game.cash > 25000 && Math.random() < 0.05) {
      // Calculate amount stolen (random portion of cash divided by 1.4)
      const stolenAmount = Math.floor((game.cash / 1.4) * Math.random());
      game.cash -= stolenAmount;
      
      await screenHandler.showRobbery(stolenAmount);
    }

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
                screen.removeListener('keypress', handler);
                await screenHandler.showBank();
                resolve();
              }
              break;
            case 't':
            case 'T':
              if (game.port === 1) { // Only in Hong Kong
                screen.removeListener('keypress', handler);
                await screenHandler.showTransfer();
                resolve();
              }
              break;
            case 'w':
            case 'W':
              if (game.port === 1) { // Only in Hong Kong
                screen.removeListener('keypress', handler);
                await screenHandler.showWu();
                if (game.gameOver) {
                  isPlaying = false;
                }
                resolve();
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
              
              // Check for overload before allowing travel
              if (game.hold < 0) {
                await screenHandler.showOverload();
                resolve();
                return;
              }
              
              const destination = await screenHandler.showTravel();
              
              // Check if destination is current port first
              if (destination === game.port) {
                await screenHandler.showMessage("You're already here, Taipan.");
                await new Promise(r => setTimeout(r, 2000));
                resolve();
                return;
              }
              
              // Handle the entire travel sequence
              const travelResult = await captainsReport.handleTravelSequence(destination);
              if (travelResult === 'game_over') {
                isPlaying = false;
              } else {
                // Update game state for the new port
                game.port = destination;
                game.setPrices();
                await screenHandler.showPortStats();
              }
              resolve();
              return;
          }
        }
      };
      screen.on('keypress', handler);
    });

    // Continue game loop if still playing
    if (!isPlaying) {
      screen.destroy();
      process.exit(0);
    }
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