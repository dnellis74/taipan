import blessed from 'blessed';
import { GENERIC, LI_YUEN } from '../state.js';

export class CaptainsReport {
  constructor(screen, game) {
    this.screen = screen;
    this.game = game;
    
    // Create the message box
    this.messageBox = blessed.box({
      parent: screen,
      top: 'center',
      left: 'center',
      width: '80%',
      height: '80%',
      content: '',
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'blue'
        }
      }
    });

    // Create the input box
    this.inputBox = blessed.textbox({
      parent: screen,
      bottom: 1,
      left: 'center',
      width: '80%',
      height: 3,
      inputOnFocus: true,
      border: {
        type: 'line'
      },
      style: {
        focus: {
          border: {
            fg: 'blue'
          }
        }
      }
    });

    // Initialize cursor position
    this.cursorY = 0;
    this.cursorX = 0;
    
    // Initialize content buffer
    this.contentBuffer = Array(24).fill(' '.repeat(80));

    // Hide initially
    this.hide();
  }

  // Mimic curses move function
  move(y, x) {
    this.cursorY = y;
    this.cursorX = x;
  }

  // Mimic curses clrtoeol (clear to end of line)
  clrtoeol() {
    const currentLine = this.contentBuffer[this.cursorY] || '';
    this.contentBuffer[this.cursorY] = currentLine.substring(0, this.cursorX) + ' '.repeat(80 - this.cursorX);
    this.messageBox.setContent(this.contentBuffer.join('\n'));
  }

  // Mimic curses printw
  printw(text) {
    // Ensure we have enough lines
    while (this.contentBuffer.length <= this.cursorY) {
      this.contentBuffer.push(' '.repeat(80));
    }

    // Get current line
    let line = this.contentBuffer[this.cursorY];

    // Insert text at cursor position
    const before = line.substring(0, this.cursorX);
    const after = line.substring(this.cursorX + text.length);
    this.contentBuffer[this.cursorY] = before + text + after;

    // Update cursor position
    this.cursorX += text.length;

    // Handle newlines in text
    if (text.includes('\n')) {
      const lines = text.split('\n');
      for (let i = 1; i < lines.length; i++) {
        this.cursorY++;
        this.cursorX = lines[i].length;
        while (this.contentBuffer.length <= this.cursorY) {
          this.contentBuffer.push(' '.repeat(80));
        }
        this.contentBuffer[this.cursorY] = lines[i] + ' '.repeat(80 - lines[i].length);
      }
    }

    // Update display
    this.messageBox.setContent(this.contentBuffer.join('\n'));
  }

  // Clear entire screen
  clear() {
    this.contentBuffer = Array(24).fill(' '.repeat(80));
    this.messageBox.setContent(this.contentBuffer.join('\n'));
    this.cursorX = 0;
    this.cursorY = 0;
  }

  // Refresh display
  refresh() {
    this.screen.render();
  }

  show() {
    this.messageBox.show();
    this.inputBox.show();
  }

  hide() {
    this.messageBox.hide();
    this.inputBox.hide();
  }

  async showMessage(message) {
    this.clear();
    this.move(0, 0);
    this.printw(message);
    this.refresh();
    await new Promise(r => setTimeout(r, 2000));
  }

  setLineContent(line, x, content) {
    while (line.length < x + content.length) {
      line += ' ';
    }
    return line.substring(0, x) + content + line.substring(x + content.length);
  }

  setLine(lineNum, col, content) {
    this.move(lineNum, col);
    this.printw(content);
    this.refresh();
  }

  async showStorm() {
    this.show();
    await this.showMessage("Storm, Taipan!!");
    
    // 1/30 chance of critical damage
    if (Math.random() < 0.033) {
      await this.showMessage("I think we're going down!!");
      
      // Check if ship survives based on damage
      const status = this.game.getShipStatus();
      if (status.percent <= 30) {
        await this.showMessage("We're going down, Taipan!!");
        this.hide();
        return 'sunk';
      }
    }
    
    await this.showMessage("We made it!!");
    
    // 1/3 chance of being blown off course
    if (Math.random() < 0.33) {
      const origPort = this.game.port;
      do {
        this.game.port = Math.floor(Math.random() * 7) + 1;
      } while (this.game.port === origPort);
      
      await this.showMessage(`We've been blown off course to ${this.game.locations[this.game.port]}`);
    }
    
    this.hide();
    return 'survived';
  }

  async showArrival(destination) {
    this.show();
    await this.showMessage(`Arriving at ${this.game.locations[destination]}...`);
    this.hide();
  }

  async handleTravel(destination) {
    // Update game state for time passage
    this.game.port = destination;
    this.game.month++;
    if (this.game.month === 13) {
      this.game.month = 1;
      this.game.year++;
    }
    
    // Update prices and interest
    this.game.debt = this.game.debt + (this.game.debt * 0.1);
    this.game.bank = this.game.bank + (this.game.bank * 0.005);
    this.game.setPrices();
  }

  async handleTravelSequence(destination) {
    this.show();
    
    // Check if ship is overloaded
    const totalCargo = this.game.opium + this.game.silk + this.game.arms + this.game.general;
    if (totalCargo > this.game.capacity) {
      await this.showMessage("Ship overloaded - cannot depart!");
      this.hide();
      return 'overloaded';
    }
    
    // Check for pirates
    let battleChance = Math.floor(Math.random() * 100);
    if (battleChance < this.game.bp) {
      let num_ships = Math.floor(Math.random() * ((this.game.capacity / 10) + this.game.guns)) + 1;
      if (num_ships > 9999) {
        num_ships = 9999;
      }
      const battleResult = await this.showBattle(num_ships);
      if (battleResult === 'defeat') {
        this.hide();
        return 'game_over';
      }
      // Add delay after battle before continuing
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // Check for storm
    let stormChance = Math.floor(Math.random() * 100);
    if (stormChance < this.game.sp) {
      const stormResult = await this.showStorm();
      if (stormResult === 'sunk') {
        this.hide();
        return 'game_over';
      }
    }

    // Show arrival and update game state
    await this.showArrival(destination);
    await this.handleTravel(destination);
    
    // Random chance for Li Yuen's pirates during travel
    if (this.game.li === 0 && Math.random() < 0.25) {
      const liShips = Math.floor(Math.random() * ((this.game.capacity / 5) + this.game.guns) + 5);
      await this.showMessage(`${liShips} ships of Li Yuen's pirate\nfleet, Taipan!!`);
      await new Promise(r => setTimeout(r, 3000));
      const result = await this.handleBattle(liShips, LI_YUEN);
      if (result === 'game_over') {
        return result;
      }
    }

    this.hide();
    return 'continue';
  }

  // Draw a lorcha (ship) at specified coordinates
  drawLorcha(x, y) {
    this.move(y, x);
    this.printw("-|-_|_  ");
    this.move(y + 1, x);
    this.printw("-|-_|_  ");
    this.move(y + 2, x);
    this.printw("_|__|__/");
    this.move(y + 3, x);
    this.printw("\\_____/ ");
  }

  // Clear a lorcha from specified coordinates
  clearLorcha(x, y) {
    this.move(y, x);
    this.printw("        ");
    this.move(y + 1, x);
    this.printw("        ");
    this.move(y + 2, x);
    this.printw("        ");
    this.move(y + 3, x);
    this.printw("        ");
  }

  // Draw explosion effect
  drawBlast(x, y) {
    this.move(y, x);
    this.printw("********");
    this.move(y + 1, x);
    this.printw("********");
    this.move(y + 2, x);
    this.printw("********");
    this.move(y + 3, x);
    this.printw("********");
  }

  // Animate ship sinking
  async sinkLorcha(x, y) {
    // Frame 1
    this.move(y, x);
    this.printw("        ");
    this.move(y + 1, x);
    this.printw("-|-_|_  ");
    this.move(y + 2, x);
    this.printw("-|-_|_  ");
    this.move(y + 3, x);
    this.printw("_|__|__/");
    this.refresh();
    await new Promise(r => setTimeout(r, 500));

    // Frame 2
    this.move(y + 1, x);
    this.printw("        ");
    this.move(y + 2, x);
    this.printw("-|-_|_  ");
    this.move(y + 3, x);
    this.printw("-|-_|_  ");
    this.refresh();
    await new Promise(r => setTimeout(r, 500));

    // Frame 3
    this.move(y + 2, x);
    this.printw("        ");
    this.move(y + 3, x);
    this.printw("-|-_|_  ");
    this.refresh();
    await new Promise(r => setTimeout(r, 500));

    // Final frame
    this.move(y + 3, x);
    this.printw("        ");
    this.refresh();
    await new Promise(r => setTimeout(r, 500));
  }

  // Show battle statistics
  showBattleStats(ships, orders) {
    let orderText = '';
    switch(orders) {
      case 1: orderText = 'Fight      '; break;
      case 2: orderText = 'Run        '; break;
      case 3: orderText = 'Throw Cargo'; break;
      default: orderText = '          '; break;
    }

    this.move(0, 0);
    if (ships === 1) {
      this.printw("   1 ship attacking, Taipan! \n");
    } else {
      this.printw(`${ships.toString().padStart(4)} ships attacking, Taipan!\n`);
    }
    this.printw(`Your orders are to: ${orderText}`);
    
    this.move(0, 50);
    this.printw("|  We have");
    this.move(1, 50);
    this.printw(`|  ${this.game.guns} ${this.game.guns === 1 ? 'gun' : 'guns'}`);
    this.move(2, 50);
    this.printw("+---------");
    this.move(16, 0);
    this.refresh();
  }

  // Get player's battle order
  async getPlayerOrder() {
    return new Promise((resolve) => {
      const handleInput = (ch, key) => {
        let order = 0;
        if (key.name === 'f' || key.name === 'F') order = 1;
        else if (key.name === 'r' || key.name === 'R') order = 2;
        else if (key.name === 't' || key.name === 'T') order = 3;
        
        if (order > 0) {
          this.screen.removeListener('keypress', handleInput);
          resolve(order);
        }
      };
      
      this.screen.on('keypress', handleInput);
    });
  }

  // Main battle sequence
  async showBattle(numShips) {
    return new Promise(async (resolve) => {
      // Initialize battle state
      let shipsOnScreen = Array(10).fill(0);
      let numOnScreen = 0;
      let escapeBonus = 0;
      const time = ((this.game.year - 1860) * 12) + this.game.month;
      
      // Calculate potential booty
      this.game.booty = Math.floor((time / 4 * 1000 * numShips) + Math.random() * 1000 + 250);

      // Clear screen and show initial stats
      this.clear();
      this.showBattleStats(numShips, 0);

      while (numShips > 0) {
        // Check ship status
        const status = Math.floor(100 - ((this.game.damage || 0) / Math.max(1, this.game.capacity) * 100));
        if (status <= 0) {
          return resolve('defeat');
        }

        this.move(3, 0);
        this.clrtoeol();
        this.printw(`Current seaworthiness: ${status}%`);
        this.refresh();

        // Draw ships
        let x = 10;
        let y = 6;
        for (let i = 0; i <= 9; i++) {
          if (i === 5) {
            x = 10;
            y = 12;
          }

          if (numShips > numOnScreen) {
            if (shipsOnScreen[i] === 0) {
              await new Promise(r => setTimeout(r, 100));
              shipsOnScreen[i] = Math.floor((this.game.ec * Math.random()) + 20);
              this.drawLorcha(x, y);
              numOnScreen++;
              this.refresh();
            }
            x += 10;
          }
        }

        // Show + indicator if more ships
        this.move(11, 62);
        this.printw(numShips > numOnScreen ? "+" : " ");

        // Get player order
        this.move(16, 0);
        this.printw("\nTaipan, what shall we do??    (f=Fight, r=Run, t=Throw cargo)");
        this.refresh();
        
        const order = await this.getPlayerOrder();
        
        // Handle player orders
        switch (order) {
          case 1: // Fight
            this.showBattleStats(numShips, order);
            
            // Player attacks
            let hits = 0;
            for (let g = 0; g < this.game.guns; g++) {
              // Find valid target
              let targetFound = false;
              let targetIndex;
              for (let tries = 0; tries < 10 && !targetFound; tries++) {
                targetIndex = Math.floor(Math.random() * 10);
                if (shipsOnScreen[targetIndex] > 0) {
                  targetFound = true;
                }
              }
              
              if (targetFound) {
                const x = 10 + ((targetIndex % 5) * 10);
                const y = 6 + (Math.floor(targetIndex / 5) * 6);
                
                // Show blast animation
                this.drawBlast(x, y);
                this.refresh();
                await new Promise(r => setTimeout(r, 300));
                
                // Calculate hit
                if (Math.random() < 0.7) {  // 70% hit chance
                  hits++;
                  shipsOnScreen[targetIndex] -= Math.floor(Math.random() * 20) + 10;
                  
                  // Check if ship is destroyed
                  if (shipsOnScreen[targetIndex] <= 0) {
                    await this.sinkLorcha(x, y);
                    shipsOnScreen[targetIndex] = 0;
                    numShips--;
                    numOnScreen--;
                    this.move(4, 0);
                    this.clrtoeol();
                    this.printw("We sunk one, Taipan!!");
                  } else {
                    // Redraw damaged ship
                    this.drawLorcha(x, y);
                    this.move(4, 0);
                    this.clrtoeol();
                    this.printw("We hit them, Taipan!!");
                  }
                } else {
                  // Miss
                  this.drawLorcha(x, y);
                  this.move(4, 0);
                  this.clrtoeol();
                  this.printw("We missed, Taipan.");
                }
                this.refresh();
                await new Promise(r => setTimeout(r, 500));
              }
            }
            break;
            
          case 2: // Run
            this.showBattleStats(numShips, order);
            const escapeChance = 0.4 + (escapeBonus / 100) + (this.game.guns / 100);
            
            if (Math.random() < escapeChance) {
              await this.showMessage("We got away, Taipan!!");
              return resolve('escaped');
            } else {
              this.move(4, 0);
              this.clrtoeol();
              this.printw("Couldn't get away, Taipan!");
              this.refresh();
              await new Promise(r => setTimeout(r, 1000));
            }
            break;
            
          case 3: // Throw cargo
            this.showBattleStats(numShips, order);
            const throwResult = await this.showThrowCargo();
            escapeBonus += throwResult;
            break;
        }
        
        // Enemy return fire if any ships remain
        if (numShips > 0) {
          this.move(4, 0);
          this.clrtoeol();
          this.printw("They're firing back, Taipan!!");
          this.refresh();
          await new Promise(r => setTimeout(r, 1000));
          
          // Each ship has a chance to hit
          for (let i = 0; i < numOnScreen; i++) {
            if (shipsOnScreen[i] > 0) {
              if (Math.random() < 0.3) {  // 30% hit chance
                const damage = Math.floor(Math.random() * 5) + 1;
                this.game.damage += damage;
                
                // Show hit message
                this.move(4, 0);
                this.clrtoeol();
                this.printw(`They hit us! Damage: ${damage}`);
                this.refresh();
                await new Promise(r => setTimeout(r, 500));
              }
            }
          }
          
          // Check if we're still floating
          const finalStatus = Math.floor(100 - ((this.game.damage || 0) / Math.max(1, this.game.capacity) * 100));
          if (finalStatus <= 0) {
            await this.showMessage("We're going down, Taipan!!");
            return resolve('defeat');
          }
          
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      
      // Victory if all ships destroyed
      await this.showMessage("We beat them all, Taipan!!");
      this.game.cash += this.game.booty;
      await this.showMessage(`We got ${this.game.booty} in booty!`);
      resolve('victory');
    });
  }

  async showThrowCargo() {
    return new Promise(async (resolve) => {
      // Show current cargo amounts
      this.clear();
      this.move(0, 0);
      this.printw("Current cargo:\n\n");
      this.printw(`Opium:   ${this.game.opium}\n`);
      this.printw(`Silk:    ${this.game.silk}\n`);
      this.printw(`Arms:    ${this.game.arms}\n`);
      this.printw(`General: ${this.game.general}\n\n`);
      this.printw("What do you want to throw overboard?\n");
      this.printw("(O=Opium, S=Silk, A=Arms, G=General, *=All)\n");
      this.refresh();

      // Get cargo type choice
      const cargoChoice = await new Promise((resolve) => {
        const handleInput = (ch, key) => {
          let choice = key.name.toLowerCase();
          if (['o', 's', 'a', 'g', '*'].includes(choice)) {
            this.screen.removeListener('keypress', handleInput);
            resolve(choice);
          }
        };
        this.screen.on('keypress', handleInput);
      });

      // Handle throwing all cargo
      if (cargoChoice === '*') {
        const totalCargo = this.game.opium + this.game.silk + this.game.arms + this.game.general;
        this.game.opium = 0;
        this.game.silk = 0;
        this.game.arms = 0;
        this.game.general = 0;
        await this.showMessage("All cargo thrown overboard, Taipan!");
        return resolve(Math.floor(totalCargo / 10)); // Return escape bonus
      }

      // Get amount to throw
      let maxAmount;
      let cargoType;
      switch (cargoChoice) {
        case 'o':
          maxAmount = this.game.opium;
          cargoType = 'opium';
          break;
        case 's':
          maxAmount = this.game.silk;
          cargoType = 'silk';
          break;
        case 'a':
          maxAmount = this.game.arms;
          cargoType = 'arms';
          break;
        case 'g':
          maxAmount = this.game.general;
          cargoType = 'general';
          break;
      }

      if (maxAmount === 0) {
        await this.showMessage(`No ${cargoType} to throw, Taipan!`);
        return resolve(0);
      }

      this.move(10, 0);
      this.clrtoeol();
      this.printw(`How much ${cargoType}? `);
      this.refresh();

      // Get amount from player
      let amount = await new Promise((resolve) => {
        let input = '';
        const handleInput = (ch, key) => {
          if (key.name === 'return') {
            this.screen.removeListener('keypress', handleInput);
            resolve(parseInt(input) || 0);
          } else if (key.name === 'backspace') {
            input = input.slice(0, -1);
            this.move(10, `How much ${cargoType}? `.length);
            this.clrtoeol();
            this.printw(input);
            this.refresh();
          } else if (/[0-9]/.test(ch)) {
            input += ch;
            this.printw(ch);
            this.refresh();
          }
        };
        this.screen.on('keypress', handleInput);
      });

      // Validate amount
      if (amount <= 0) {
        await this.showMessage("Must throw something, Taipan!");
        return resolve(0);
      }
      if (amount > maxAmount) {
        await this.showMessage(`Only have ${maxAmount} ${cargoType}, Taipan!`);
        return resolve(0);
      }

      // Update cargo and return escape bonus
      switch (cargoChoice) {
        case 'o': this.game.opium -= amount; break;
        case 's': this.game.silk -= amount; break;
        case 'a': this.game.arms -= amount; break;
        case 'g': this.game.general -= amount; break;
      }

      await this.showMessage(`${amount} ${cargoType} thrown overboard, Taipan!`);
      return resolve(Math.floor(amount / 10));
    });
  }

  async handleBattle(numShips, type = GENERIC) {
    // Random chance for Li Yuen's pirates to interrupt battle
    if (type === GENERIC && Math.random() % (4 + (8 * this.game.li)) === 0) {
      await this.showMessage("Li Yuen's pirates, Taipan!!");
      await new Promise(r => setTimeout(r, 3000));

      if (this.game.li > 0) {
        await this.showMessage("Good joss!! They let us be!!");
        await new Promise(r => setTimeout(r, 3000));
        return 'continue';
      } else {
        const liShips = Math.floor(Math.random() * ((this.game.capacity / 5) + this.game.guns) + 5);
        await this.showMessage(`${liShips} ships of Li Yuen's pirate\nfleet, Taipan!!`);
        await new Promise(r => setTimeout(r, 3000));
        return await this.handleBattle(liShips, LI_YUEN);
      }
    }

    // ... existing code ...
  }
} 