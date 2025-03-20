import blessed from 'blessed';

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

    // Hide initially
    this.hide();
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
    this.messageBox.setContent(message);
    this.screen.render();
    await new Promise(r => setTimeout(r, 2000));
  }

  drawLorcha(x, y) {
    const lines = this.messageBox.getContent().split('\n');
    while (lines.length <= y + 3) {
      lines.push(' '.repeat(80));
    }
    
    lines[y] = this.setLineContent(lines[y], x, "-|-_|_  ");
    lines[y + 1] = this.setLineContent(lines[y + 1], x, "-|-_|_  ");
    lines[y + 2] = this.setLineContent(lines[y + 2], x, "_|__|__/");
    lines[y + 3] = this.setLineContent(lines[y + 3], x, "\\_____/ ");
    
    this.messageBox.setContent(lines.join('\n'));
    this.screen.render();
  }

  clearLorcha(x, y) {
    const lines = this.messageBox.getContent().split('\n');
    while (lines.length <= y + 3) {
      lines.push(' '.repeat(80));
    }
    
    lines[y] = this.setLineContent(lines[y], x, "        ");
    lines[y + 1] = this.setLineContent(lines[y + 1], x, "        ");
    lines[y + 2] = this.setLineContent(lines[y + 2], x, "        ");
    lines[y + 3] = this.setLineContent(lines[y + 3], x, "        ");
    
    this.messageBox.setContent(lines.join('\n'));
    this.screen.render();
  }

  drawBlast(x, y) {
    const lines = this.messageBox.getContent().split('\n');
    while (lines.length <= y + 3) {
      lines.push(' '.repeat(80));
    }
    
    lines[y] = this.setLineContent(lines[y], x, "********");
    lines[y + 1] = this.setLineContent(lines[y + 1], x, "********");
    lines[y + 2] = this.setLineContent(lines[y + 2], x, "********");
    lines[y + 3] = this.setLineContent(lines[y + 3], x, "********");
    
    this.messageBox.setContent(lines.join('\n'));
    this.screen.render();
  }

  setLineContent(line, x, content) {
    while (line.length < x + content.length) {
      line += ' ';
    }
    return line.substring(0, x) + content + line.substring(x + content.length);
  }

  async sinkLorcha(x, y) {
    const lines = this.messageBox.getContent().split('\n');
    while (lines.length <= y + 3) {
      lines.push(' '.repeat(80));
    }
    
    // Sinking animation frames
    const frames = [
      {
        lines: [
          "        ",
          "-|-_|_  ",
          "-|-_|_  ",
          "_|__|__/"
        ]
      },
      {
        lines: [
          "        ",
          "        ",
          "-|-_|_  ",
          "-|-_|_  "
        ]
      },
      {
        lines: [
          "        ",
          "        ",
          "        ",
          "-|-_|_  "
        ]
      },
      {
        lines: [
          "        ",
          "        ",
          "        ",
          "        "
        ]
      }
    ];

    // Play sinking animation
    for (const frame of frames) {
      for (let i = 0; i < 4; i++) {
        lines[y + i] = this.setLineContent(lines[y + i], x, frame.lines[i]);
      }
      this.messageBox.setContent(lines.join('\n'));
      this.screen.render();
      await new Promise(r => setTimeout(r, 500));
    }
  }

  async getPlayerOrder() {
    return new Promise((resolve) => {
      this.inputBox.show();
      this.inputBox.focus();
      
      const handleInput = (ch, key) => {
        if (key.name === 'enter') {
          const input = this.inputBox.getValue().toLowerCase();
          this.inputBox.clearValue();
          this.inputBox.hide();
          this.screen.removeListener('keypress', handleInput);
          
          if (input === 'f') {
            resolve(1); // Fight
          } else if (input === 'r') {
            resolve(2); // Run
          } else if (input === 't') {
            resolve(3); // Throw cargo
          } else {
            // Invalid input, default to fight
            resolve(1);
          }
        }
      };
      
      this.screen.on('keypress', handleInput);
    });
  }

  async showThrowCargo() {
    return new Promise((resolve) => {
      // Show current cargo
      const content = this.messageBox.getContent().split('\n');
      content[18] = 'You have the following on board, Taipan:';
      content[19] = `   Opium: ${this.game.holdStock[0]}`.padEnd(25) + `Silk: ${this.game.holdStock[1]}`;
      content[20] = `   Arms: ${this.game.holdStock[2]}`.padEnd(25) + `General: ${this.game.holdStock[3]}`;
      
      // Update message box
      this.messageBox.setContent(content.join('\n'));
      this.setLine(3, 0, 'What shall I throw overboard, Taipan? (O/S/A/G/*=All)');
      this.screen.render();

      const handleCargoChoice = (ch, key) => {
        let cargoIndex = -1;
        if (key.name === 'o' || key.name === 'O') cargoIndex = 0;
        else if (key.name === 's' || key.name === 'S') cargoIndex = 1;
        else if (key.name === 'a' || key.name === 'A') cargoIndex = 2;
        else if (key.name === 'g' || key.name === 'G') cargoIndex = 3;
        else if (ch === '*') cargoIndex = 4;

        if (cargoIndex >= 0) {
          this.screen.removeListener('keypress', handleCargoChoice);
          
          if (cargoIndex === 4) {
            // Throw all cargo
            const totalCargo = this.game.holdStock.reduce((a, b) => a + b, 0);
            if (totalCargo > 0) {
              const escapeBonus = Math.floor(totalCargo / 10);
              this.game.holdStock = [0, 0, 0, 0];
              this.game.hold += totalCargo;
              resolve(escapeBonus);
            } else {
              this.setLine(3, 0, "There's nothing there, Taipan!");
              this.screen.render();
              setTimeout(() => resolve(0), 2000);
            }
          } else {
            // Show amount prompt for specific cargo type
            this.setLine(3, 0, `How much, Taipan?`);
            this.screen.render();

            // Handle amount input directly with keypress
            const handleAmount = (ch, key) => {
              if (key.name === 'return') {
                this.screen.removeListener('keypress', handleAmount);
                let amount = parseInt(this.inputBuffer || '');
                this.inputBuffer = '';
                
                if (isNaN(amount)) {
                  // If no amount specified, use all available cargo
                  amount = this.game.holdStock[cargoIndex];
                }
                
                if (amount >= 0 && amount <= this.game.holdStock[cargoIndex]) {
                  if (amount > 0) {
                    const escapeBonus = Math.floor(amount / 10);
                    this.game.holdStock[cargoIndex] -= amount;
                    this.game.hold += amount;
                    resolve(escapeBonus);
                  } else {
                    resolve(0);
                  }
                } else {
                  this.setLine(3, 0, `You only have ${this.game.holdStock[cargoIndex]}, Taipan!`);
                  this.screen.render();
                  setTimeout(() => resolve(0), 2000);
                }
              } else if (key.name === 'backspace') {
                if (this.inputBuffer) {
                  this.inputBuffer = this.inputBuffer.slice(0, -1);
                  this.setLine(3, 0, `How much, Taipan? ${this.inputBuffer}`);
                  this.screen.render();
                }
              } else if (/^\d$/.test(ch)) {
                this.inputBuffer = (this.inputBuffer || '') + ch;
                this.setLine(3, 0, `How much, Taipan? ${this.inputBuffer}`);
                this.screen.render();
              }
            };

            this.inputBuffer = '';
            this.screen.on('keypress', handleAmount);
          }
        }
      };

      this.screen.on('keypress', handleCargoChoice);
    });
  }

  async showBattle(numShips) {
    return new Promise(async (resolve) => {
      // Clear the main display area
      this.messageBox.setContent('');
      
      // Initialize battle state
      let shipsOnScreen = Array(10).fill(0);
      let numOnScreen = 0;
      let escapeBonus = 0;
      const time = ((this.game.year - 1860) * 12) + this.game.month;
      
      // Show initial battle stats
      this.showBattleStats(numShips, 0);
      
      // Draw ships in two rows (up to 5 in each row)
      for (let i = 0; i < Math.min(numShips, 10); i++) {
        const x = (i < 5) ? ((i + 1) * 10) : ((i - 4) * 10);
        const y = (i < 5) ? 6 : 12;
        
        // Calculate ship health
        shipsOnScreen[i] = Math.floor(Math.random() * this.game.enemyHealth + 20);
        this.drawLorcha(x, y);
        numOnScreen++;
        
        // Small delay between drawing ships
        await new Promise(r => setTimeout(r, 100));
      }
      
      // Show remaining ships indicator if needed
      if (numShips > numOnScreen) {
        this.setLine(11, 62, '+');
      }
      
      while (true) {
        // Reset and redraw battle display at start of each round
        this.messageBox.setContent('');
        this.screen.render();

        // Redraw battle stats
        this.showBattleStats(numShips, 0);

        // Redraw ships in two rows
        for (let i = 0; i < 10; i++) {
          if (shipsOnScreen[i] > 0) {
            const x = (i < 5) ? ((i + 1) * 10) : ((i - 4) * 10);
            const y = (i < 5) ? 6 : 12;
            this.drawLorcha(x, y);
          }
        }

        // Show remaining ships indicator if needed
        if (numShips > numOnScreen) {
          this.setLine(11, 62, '+');
        }

        // Show ship status
        const status = Math.floor(100 - ((this.game.damage / this.game.capacity) * 100));
        this.setLine(3, 0, `Current seaworthiness: ${status}%`);
        this.screen.render();
        await new Promise(r => setTimeout(r, 1000));

        // Show order prompt below ships
        this.setLine(16, 0, 'Taipan, what shall we do??    (f=Fight, r=Run, t=Throw cargo)');
        this.screen.render();
        
        // Get player order
        const order = await new Promise(resolveOrder => {
          const handleOrder = (ch, key) => {
            let orderValue = 0;
            if (key.name === 'f' || key.name === 'F') orderValue = 1;
            else if (key.name === 'r' || key.name === 'R') orderValue = 2;
            else if (key.name === 't' || key.name === 'T') orderValue = 3;
            
            if (orderValue > 0) {
              this.screen.removeListener('keypress', handleOrder);
              resolveOrder(orderValue);
            }
          };
          
          this.screen.on('keypress', handleOrder);
        });
        
        this.showBattleStats(numShips, order);
        
        if (order === 3) {
          // Handle throwing cargo
          const bonus = await this.showThrowCargo();
          escapeBonus += bonus;
          if (bonus > 0) {
            this.setLine(3, 0, "Let's hope we lose 'em, Taipan!");
            this.screen.render();
            await new Promise(r => setTimeout(r, 2000));
          }
          continue;
        }
        
        if (order === 2) {
          // Try to escape with bonus from thrown cargo
          const escapeChance = Math.random() * (3 + escapeBonus) > Math.random() * numShips;
          if (escapeChance) {
            this.setLine(3, 0, "We got away from 'em, Taipan!");
            this.screen.render();
            await new Promise(r => setTimeout(r, 2000));
            resolve('fled');
            return;
          } else {
            this.setLine(3, 0, "Couldn't lose 'em.");
            this.screen.render();
            await new Promise(r => setTimeout(r, 2000));
          }
        }
        
        if (order === 1) {
          if (this.game.guns === 0) {
            this.setLine(3, 0, "We have no guns, Taipan!!");
            this.screen.render();
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          // Execute fight sequence
          this.setLine(3, 0, "Aye, we'll fight 'em, Taipan.");
          this.screen.render();
          await new Promise(r => setTimeout(r, 2000));

          this.setLine(3, 0, "We're firing on 'em, Taipan!");
          this.screen.render();
          await new Promise(r => setTimeout(r, 1000));

          // Fire each gun
          for (let i = 0; i < this.game.guns; i++) {
            // Update shots remaining
            this.setLine(3, 30, `(${this.game.guns - i - 1} shots remaining.)`);
            this.screen.render();
            await new Promise(r => setTimeout(r, 100));

            // Pick a target that's still alive
            let targeted;
            do {
              targeted = Math.floor(Math.random() * 10);
            } while (shipsOnScreen[targeted] === 0 && numOnScreen > 0);

            // Calculate hit position
            const x = (targeted < 5) ? ((targeted + 1) * 10) : ((targeted - 4) * 10);
            const y = (targeted < 5) ? 6 : 12;

            // Animate the hit
            for (let j = 0; j < 2; j++) {
              this.drawBlast(x, y);
              await new Promise(r => setTimeout(r, 100));
              if (shipsOnScreen[targeted] > 0) this.drawLorcha(x, y);
              await new Promise(r => setTimeout(r, 100));
            }

            // Calculate and apply damage
            const damage = Math.floor(Math.random() * 30) + 10;
            shipsOnScreen[targeted] -= damage;

            // If ship is destroyed
            if (shipsOnScreen[targeted] <= 0) {
              numShips--;
              numOnScreen--;
              shipsOnScreen[targeted] = 0;
              await this.sinkLorcha(x, y);

              // Update + indicator if needed
              if (numShips === numOnScreen) {
                this.setLine(11, 62, ' ');
              }

              this.showBattleStats(numShips, order);
            }

            // Exit if all ships destroyed
            if (numShips === 0) {
              this.setLine(3, 0, "We got 'em all, Taipan!");
              this.screen.render();
              await new Promise(r => setTimeout(r, 2000));
              resolve('victory');
              return;
            }
          }

          // After firing all guns, check if any ships flee
          if (Math.random() * numShips < 0.4) {
            const fleeing = Math.floor(Math.random() * (numShips / 3)) + 1;
            numShips -= fleeing;
            this.setLine(3, 0, `${fleeing} ran away, Taipan!`);
            this.screen.render();
            await new Promise(r => setTimeout(r, 2000));

            // Update display for remaining ships
            if (numShips <= 10) {
              for (let i = 9; i >= 0; i--) {
                if (numOnScreen > numShips && shipsOnScreen[i] > 0) {
                  shipsOnScreen[i] = 0;
                  numOnScreen--;
                  const x = (i < 5) ? ((i + 1) * 10) : ((i - 4) * 10);
                  const y = (i < 5) ? 6 : 12;
                  this.clearLorcha(x, y);
                }
              }
              if (numShips === numOnScreen) {
                this.setLine(11, 62, ' ');
              }
            }
          }

          // Enemy return fire
          if (numShips > 0) {
            this.setLine(3, 0, "They're firing on us, Taipan!");
            this.screen.render();
            await new Promise(r => setTimeout(r, 2000));

            // Flash screen effect
            for (let i = 0; i < 3; i++) {
              this.messageBox.setContent('*'.repeat(80).repeat(24));
              this.screen.render();
              await new Promise(r => setTimeout(r, 200));
              this.messageBox.setContent(' '.repeat(80).repeat(24));
              this.screen.render();
              await new Promise(r => setTimeout(r, 200));
            }

            // Redraw battle state
            for (let i = 0; i < 10; i++) {
              if (shipsOnScreen[i] > 0) {
                const x = (i < 5) ? ((i + 1) * 10) : ((i - 4) * 10);
                const y = (i < 5) ? 6 : 12;
                this.drawLorcha(x, y);
              }
            }

            this.setLine(3, 0, "We've been hit, Taipan!!");
            this.screen.render();
            await new Promise(r => setTimeout(r, 2000));

            // Calculate damage to player
            const hitCount = Math.min(15, numShips);
            const damageMultiplier = this.game.enemyDamage * hitCount * (Math.random() + 0.5);
            this.game.damage += Math.floor(damageMultiplier);

            // Check if a gun was hit
            if (this.game.guns > 0 && 
                (Math.random() < (this.game.damage / this.game.capacity) || 
                 (this.game.damage / this.game.capacity) > 0.8)) {
              this.game.guns--;
              this.game.hold += 10;
              this.setLine(3, 0, "The buggers hit a gun, Taipan!!");
              this.screen.render();
              await new Promise(r => setTimeout(r, 2000));
            }

            // Update battle stats after damage
            this.showBattleStats(numShips, order);

            // Reset and redraw battle display
            this.messageBox.setContent('');
            this.screen.render();

            // Redraw battle stats
            this.showBattleStats(numShips, 0);

            // Redraw ships in two rows
            for (let i = 0; i < 10; i++) {
              if (shipsOnScreen[i] > 0) {
                const x = (i < 5) ? ((i + 1) * 10) : ((i - 4) * 10);
                const y = (i < 5) ? 6 : 12;
                this.drawLorcha(x, y);
              }
            }

            // Show remaining ships indicator if needed
            if (numShips > numOnScreen) {
              this.setLine(11, 62, '+');
            }

            // Check ship status
            const status = Math.floor(100 - ((this.game.damage / this.game.capacity) * 100));
            if (status <= 0) {
              this.setLine(3, 0, "The ship's going down, Taipan!!");
              this.screen.render();
              await new Promise(r => setTimeout(r, 2000));
              resolve('defeat');
              return;
            }

            // Show ship status
            this.setLine(3, 0, `Current seaworthiness: ${status}%`);
            this.screen.render();
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        // Continue battle if ships remain
        if (numShips > 0) {
          continue;
        }
        
        // End battle
        resolve('defeat');
        return;
      }
    });
  }

  setLine(lineNum, col, content) {
    const lines = this.messageBox.getContent().split('\n');
    while (lines.length <= lineNum) {
      lines.push(' '.repeat(80));
    }
    lines[lineNum] = this.setLineContent(lines[lineNum], col, content);
    this.messageBox.setContent(lines.join('\n'));
  }

  showBattleStats(ships, orders) {
    let orderText = '';
    switch(orders) {
      case 1: orderText = 'Fight      '; break;
      case 2: orderText = 'Run        '; break;
      case 3: orderText = 'Throw Cargo'; break;
      default: orderText = '          '; break;
    }
    
    // Show ships count and orders at top
    this.setLine(0, 0, `${ships.toString().padStart(4)} ship${ships === 1 ? '' : 's'} attacking, Taipan!`);
    this.setLine(1, 0, `Your orders are to: ${orderText}`);
    
    // Show guns count in top right
    this.setLine(0, 50, `|  We have`);
    this.setLine(1, 50, `|  ${this.game.guns} ${this.game.guns === 1 ? 'gun' : 'guns'}`);
    this.setLine(2, 50, `+---------`);
    
    this.screen.render();
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
    
    // Check for pirates
    let battleChance = Math.floor(Math.random() * 100);
    //await this.showMessage(`bc: ${battleChance} bp: ${this.game.bp}`);
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
    }
    
    // Check for storm
    let stormChance = Math.floor(Math.random() * 100);
    //await this.showMessage(`sc: ${stormChance} sp: ${this.game.sp}`);
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
    
    this.hide();
    return 'continue';
  }
} 