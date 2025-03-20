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

  async showBattle(numShips) {
    this.show();
    
    // Initialize battle state
    let shipsOnScreen = new Array(10).fill(0);
    let numOnScreen = 0;
    let orders = 0;
    let status = this.game.getShipStatus();
    
    // Show initial battle message and status
    const battleStatus = 
      `${numShips} hostile ships approaching, Taipan!\n\n` +
      `Ships: ${numShips}\n` +
      `Orders: ${orders === 0 ? 'None' : orders === 1 ? 'Fight' : orders === 2 ? 'Run' : 'Throw Cargo'}\n` +
      `Guns: ${this.game.guns}\n` +
      `Ship Status: ${status.percent}%\n\n`;
    
    await this.showMessage(battleStatus);
    
    // Draw initial ships
    let x = 10;
    let y = 6;
    for (let i = 0; i < Math.min(numShips, 10); i++) {
      if (i === 5) {
        x = 10;
        y = 12;
      }
      shipsOnScreen[i] = Math.floor(Math.random() * 30) + 20;
      this.drawLorcha(x, y);
      numOnScreen++;
      x += 10;
      await new Promise(r => setTimeout(r, 100));
    }
    
    // Battle loop
    while (numShips > 0) {
      // Update battle status
      const currentStatus = 
        `Ships: ${numShips}\n` +
        `Orders: ${orders === 0 ? 'None' : orders === 1 ? 'Fight' : orders === 2 ? 'Run' : 'Throw Cargo'}\n` +
        `Guns: ${this.game.guns}\n` +
        `Ship Status: ${status.percent}%\n\n` +
        `What are your orders, Taipan? (f=Fight, r=Run, t=Throw cargo)\n`;
      
      this.messageBox.setContent(currentStatus);
      this.screen.render();
      
      // Get player orders
      if (orders === 0) {
        orders = await this.getPlayerOrder();
      }
      
      // Handle fighting
      if (orders === 1 && this.game.guns > 0) {
        await this.showMessage(currentStatus + "\nWe're firing on 'em, Taipan!");
        
        // Fire guns
        for (let i = 0; i < this.game.guns; i++) {
          if (numShips === 0) break;
          
          // Select target
          let target = Math.floor(Math.random() * 10);
          while (shipsOnScreen[target] === 0) {
            target = Math.floor(Math.random() * 10);
          }
          
          // Calculate target position
          x = (target < 5) ? ((target + 1) * 10) : ((target - 4) * 10);
          y = (target < 5) ? 6 : 12;
          
          // Show firing animation
          this.drawBlast(x, y);
          await new Promise(r => setTimeout(r, 100));
          this.drawLorcha(x, y);
          await new Promise(r => setTimeout(r, 100));
          
          // Apply damage
          shipsOnScreen[target] -= Math.floor(Math.random() * 30) + 10;
          
          // Check if ship sunk
          if (shipsOnScreen[target] <= 0) {
            numOnScreen--;
            numShips--;
            shipsOnScreen[target] = 0;
            await this.sinkLorcha(x, y);
          }
          
          await new Promise(r => setTimeout(r, 500));
        }
        
        // Check if battle won
        if (numShips === 0) {
          await this.showMessage(currentStatus + "\nWe've won the battle, Taipan!");
          this.hide();
          return 'victory';
        }
        
        // Reset orders for next turn
        orders = 0;
      }
      
      // Handle running
      if (orders === 2) {
        await this.showMessage(currentStatus + "\nWe're running, Taipan!");
        if (Math.random() < 0.7) {
          await this.showMessage(currentStatus + "\nWe got away!");
          this.hide();
          return 'fled';
        }
        await this.showMessage(currentStatus + "\nWe couldn't escape!");
        orders = 0;
      }
      
      // Handle throwing cargo
      if (orders === 3) {
        await this.showMessage(currentStatus + "\nWe're throwing cargo overboard!");
        // TODO: Implement cargo throwing logic
        orders = 0;
      }
      
      // Enemy attacks
      if (numShips > 0) {
        await this.showMessage(currentStatus + "\nThey're firing on us!");
        // Apply damage to player's ship
        const damage = Math.floor(Math.random() * 20) + 10;
        this.game.damage += damage;
        status = this.game.getShipStatus();
        
        if (status.percent <= 0) {
          await this.showMessage(currentStatus + "\nWe're going down, Taipan!");
          this.hide();
          return 'defeat';
        }
        
        // Reset orders for next turn
        orders = 0;
      }
    }
    
    this.hide();
    return 'victory';
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