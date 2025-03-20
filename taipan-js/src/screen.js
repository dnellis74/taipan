import blessed from 'blessed';

export class Screen {
  constructor(screen, gameState) {
    this.screen = screen;
    this.game = gameState;
    
    // Create main box for game content
    this.mainBox = blessed.box({
      parent: screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%-1',
      tags: true,
      border: {
        type: 'line'
      },
      style: {
        fg: 'white',
        bg: 'black'
      }
    });

    // Create input box
    this.inputBox = blessed.textbox({
      parent: screen,
      bottom: 0,
      left: 0,
      height: 1,
      width: '100%',
      keys: true,
      mouse: true,
      inputOnFocus: true,
      input: true,
      style: {
        fg: 'white',
        bg: 'black'
      }
    });

    // Hide input box initially
    this.inputBox.hide();

    // Focus handling
    this.inputBox.key(['escape', 'C-c'], () => {
      process.exit(0);
    });

    // Handle input submission
    this.inputBox.on('submit', () => {
      const value = this.inputBox.getValue();
      if (value !== null) {
        this.inputBox.clearValue();
        this.inputBox.hide();
        if (this.onSubmit) {
          this.onSubmit(value);
        }
        this.screen.render();
      }
    });

    // Initial render
    screen.render();
  }

  showSplashScreen() {
    return new Promise((resolve) => {
      this.mainBox.setContent(`
         _____  _    ___ ____   _    _   _               ===============
        |_   _|/ \\  |_ _|  _ \\ / \\  | \\ | |              Created by:
          | | / _ \\  | || |_) / _ \\ |  \\| |                 Art Canfil
          | |/ ___ \\ | ||  __/ ___ \\| |\\  |
          |_/_/   \\_\\___|_| /_/   \\_\\_| \\_|              ===============
                                                         Programmed by:
   A game based on the China trade of the 1800's            Jay Link

                      ~~|     ,                          jlink@ilbbs.com
                       ,|\`-._/|
                     .' |   /||\\                         ===============
                   .'   | ./ ||\`\\                         Copyright (c)
                  / \`-. |/._ ||  \\                         1978 - 2002
                 /     \`||  \`|;-._\\                         Art Canfil
                 |      ||   ||   \\
~^~_-~^~=~^~~^= /       ||   ||__  \\~^=~^~-~^~_~^~=      ===============
 ~=~^~ _~^~ =~ \`--------|\`---||  \`"-\`___~~^~ =_~^=        Press ENTER
~ ~^~=~^_~^~ =~ \\~~~~~~~'~~~~'~~~~/~~\`\` ~=~^~ ~^=           to start.
 ~^=~^~_~-=~^~ ^ \`--------------'~^~=~^~_~^=~^~=~
      `);
      
      const listener = (ch, key) => {
        if (key.name === 'enter') {
          this.screen.removeListener('keypress', listener);
          resolve();
        }
      };
      
      this.screen.on('keypress', listener);
      this.screen.render();
    });
  }

  showNameFirm() {
    return new Promise((resolve) => {
      this.mainBox.setContent(`
 _______________________________________
|     Taipan,                           |
|                                       |
| What will you name your               |
|                                       |
|     Firm:                             |
|           ----------------------      |
|_______________________________________|
      `);
      
      // Set up input handler before showing the input box
      this.setSubmitHandler((value) => {
        if (value && value.trim()) {  // Make sure we have a non-empty value
          const trimmedValue = value.trim();
          this.clearSubmitHandler();
          this.inputBox.hide();
          resolve(trimmedValue);
        }
      });
      
      this.inputBox.show();
      this.inputBox.focus();
      this.screen.render();
    });
  }

  showStartChoice() {
    return new Promise((resolve) => {      
      this.mainBox.setContent(`
Do you want to start . . .

  1) With cash (and a debt)

                >> or <<

  2) With five guns and no cash
                (But no debt!)

          ?
      `);

      // Set up input handler
      this.setSubmitHandler((value) => {
        if (value === '1' || value === '2') {
          this.clearSubmitHandler();
          resolve(value);
        }
      });
      
      // Show and focus the input box
      this.inputBox.show();
      this.inputBox.focus();
      this.screen.render();
    });
  }

  showPortStats() {
    const status = this.game.getShipStatus();
    const inUse = this.game.warehouseStock.reduce((a, b) => a + b, 0);
    const vacant = 10000 - inUse;

    let content = `${' '.repeat(12 - Math.floor(this.game.firm.length / 2))}${this.game.firm}\n`;
    content += ` ______________________________________\n`;
    content += `|Hong Kong Warehouse                   |    Date\n`;
    content += `|   Opium           In Use:            |    15 ${this.game.months[this.game.month - 1]} ${this.game.year}\n`;
    content += `|   Silk                               |\n`;
    content += `|   Arms            Vacant:            |    Location\n`;
    content += `|   General                            |    ${this.game.locations[this.game.port]}\n`;
    content += `|______________________________________|\n`;
    content += `|Hold               Guns               |    Debt\n`;
    content += `|   Opium                              |    ${this.game.formatNumber(this.game.debt)}\n`;
    content += `|   Silk                               |\n`;
    content += `|   Arms                               |    Ship Status\n`;
    content += `|   General                            |    ${status.text}:${status.percent}%\n`;
    content += `|______________________________________|\n`;
    content += `Cash:               Bank:\n`;
    content += `________________________________________\n`;

    // Fill in the values with proper padding
    const padNum = (num) => num.toString().padStart(8);

    // Warehouse values
    content = content.replace(/Opium\s+In Use:/g, `Opium ${padNum(this.game.warehouseStock[0])}     In Use: ${inUse}`);
    content = content.replace(/Silk\s+/g, `Silk  ${padNum(this.game.warehouseStock[1])}`);
    content = content.replace(/Arms\s+Vacant:/g, `Arms  ${padNum(this.game.warehouseStock[2])}     Vacant: ${vacant}`);
    content = content.replace(/General\s+/g, `General ${padNum(this.game.warehouseStock[3])}`);
    
    // Hold values
    content = content.replace(/Hold\s+Guns/g, `Hold ${padNum(this.game.hold)}     Guns ${this.game.guns}`);
    content = content.replace(/Opium\s+/g, `Opium ${padNum(this.game.holdStock[0])}`);
    content = content.replace(/Silk\s+/g, `Silk  ${padNum(this.game.holdStock[1])}`);
    content = content.replace(/Arms\s+/g, `Arms  ${padNum(this.game.holdStock[2])}`);
    content = content.replace(/General\s+/g, `General ${padNum(this.game.holdStock[3])}`);

    // Cash and Bank
    content = content.replace(/Cash:\s+Bank:/g, `Cash: ${this.game.formatNumber(this.game.cash).padStart(12)}     Bank: ${this.game.formatNumber(this.game.bank)}`);

    this.mainBox.setContent(content);
    this.screen.render();
  }

  showPortChoices(message) {
    // Build the price report
    let priceReport = '\nComprador\'s Report\n\nCurrent Prices:\n\n';
    priceReport += `Opium:         ${this.game.formatNumber(this.game.price[0])}\n`;
    priceReport += `Silk:          ${this.game.formatNumber(this.game.price[1])}\n`;
    priceReport += `Arms:          ${this.game.formatNumber(this.game.price[2])}\n`;
    priceReport += `General:       ${this.game.formatNumber(this.game.price[3])}\n\n`;

    // Add the message
    priceReport += `${message}\n\n`;

    // Add context-sensitive menu options
    let menuOptions = '';
    menuOptions += '(B)uy\n';
    menuOptions += '(S)ell\n';
    
    // Hong Kong specific options
    if (this.game.port === 1) { // Hong Kong
      menuOptions += '(V)isit Bank\n';
      menuOptions += '(T)ransfer Cargo\n';
      menuOptions += '(W)heedle Elder Brother Wu\n';
      // Only show retire option if player is rich enough
      if ((this.game.cash + this.game.bank) >= 1000000) {
        menuOptions += '(R)etire\n';
      }
    }
    
    menuOptions += '(Q)uit Trading';

    const reportBox = blessed.box({
      parent: this.mainBox,
      top: 15,
      left: 0,
      width: '100%',
      height: 20,
      content: priceReport + menuOptions,
      style: {
        fg: 'white',
        bg: 'black'
      }
    });
    
    this.screen.render();
  }

  clearPortChoices() {
    this.mainBox.children.forEach(child => child.detach());
    this.screen.render();
  }

  drawBattleFrame(elements) {
    // Clear battle area
    for (let y = 6; y < 16; y++) {
      for (let x = 0; x < 60; x++) {
        this.mainBox.setLine(y, x, ' ');
      }
    }

    // Draw each element
    elements.forEach(({x, y, content}) => {
      this.mainBox.setLine(y, x, content);
    });

    this.screen.render();
  }

  showBattlePrompt() {
    this.mainBox.setLine(3, 0, 'Taipan, what shall we do??    (f=Fight, r=Run, t=Throw cargo)');
    this.screen.render();
  }

  showBuy() {
    return new Promise((resolve) => {
      // First ask what to buy
      this.mainBox.setContent(`
What do you wish me to buy, Taipan?

(O)pium, (S)ilk, (A)rms, or (G)eneral cargo?`);
      
      const itemHandler = (ch, key) => {
        let choice = -1;
        if (key.name === 'o' || key.name === 'O') choice = 0;
        else if (key.name === 's' || key.name === 'S') choice = 1;
        else if (key.name === 'a' || key.name === 'A') choice = 2;
        else if (key.name === 'g' || key.name === 'G') choice = 3;
        
        if (choice !== -1) {
          this.screen.removeListener('keypress', itemHandler);
          
          // Calculate how much they can afford
          const afford = Math.floor(this.game.cash / this.game.price[choice]);
          
          // Ask how much to buy
          this.mainBox.setContent(`
How much ${this.game.items[choice]} shall I buy, Taipan?

You can afford: ${this.game.formatNumber(afford)}`);
          
          // Set up input handler for amount
          this.setSubmitHandler((value) => {
            let amount = parseInt(value);
            if (value === '') amount = afford; // Buy max if empty
            
            if (!isNaN(amount) && amount >= 0 && amount <= afford) {
              // Update game state
              this.game.cash -= (amount * this.game.price[choice]);
              this.game.holdStock[choice] += amount;
              this.game.hold -= amount;
              
              this.clearSubmitHandler();
              this.inputBox.hide();
              resolve();
            }
          });
          
          this.inputBox.show();
          this.inputBox.focus();
          this.screen.render();
        }
      };
      
      this.screen.on('keypress', itemHandler);
      this.screen.render();
    });
  }

  showSell() {
    return new Promise((resolve) => {
      // First ask what to sell
      this.mainBox.setContent(`
What do you wish me to sell, Taipan?

(O)pium, (S)ilk, (A)rms, or (G)eneral cargo?`);
      
      const itemHandler = (ch, key) => {
        let choice = -1;
        if (key.name === 'o' || key.name === 'O') choice = 0;
        else if (key.name === 's' || key.name === 'S') choice = 1;
        else if (key.name === 'a' || key.name === 'A') choice = 2;
        else if (key.name === 'g' || key.name === 'G') choice = 3;
        
        if (choice !== -1) {
          this.screen.removeListener('keypress', itemHandler);
          
          const inHold = this.game.holdStock[choice];
          
          // Ask how much to sell
          this.mainBox.setContent(`
How much ${this.game.items[choice]} shall I sell, Taipan?

You have: ${this.game.formatNumber(inHold)}`);
          
          // Set up input handler for amount
          this.setSubmitHandler((value) => {
            let amount = parseInt(value);
            if (value === '') amount = inHold; // Sell all if empty
            
            if (!isNaN(amount) && amount >= 0 && amount <= inHold) {
              // Update game state
              this.game.cash += (amount * this.game.price[choice]);
              this.game.holdStock[choice] -= amount;
              this.game.hold += amount;
              
              this.clearSubmitHandler();
              this.inputBox.hide();
              resolve();
            }
          });
          
          this.inputBox.show();
          this.inputBox.focus();
          this.screen.render();
        }
      };
      
      this.screen.on('keypress', itemHandler);
      this.screen.render();
    });
  }

  showTravel() {
    return new Promise((resolve) => {
      // Show port selection menu
      this.mainBox.setContent(`
Comprador's Report

Taipan, do you wish me to go to:

1) Hong Kong
2) Shanghai
3) Nagasaki
4) Saigon
5) Manila
6) Singapore
7) Batavia`);

      // Set up input handler for port selection
      this.setSubmitHandler((value) => {
        const choice = parseInt(value);
        if (!isNaN(choice) && choice >= 1 && choice <= 7) {
          if (choice === this.game.port) {
            // Show error if already at selected port
            this.mainBox.setContent(`
You're already here, Taipan.

Press any key to continue...`);
            this.screen.render();
            
            // Wait for keypress then resolve
            const continueHandler = () => {
              this.screen.removeListener('keypress', continueHandler);
              this.clearSubmitHandler();
              this.inputBox.hide();
              resolve(false);
            };
            this.screen.on('keypress', continueHandler);
          } else {
            // Valid port selected, update game state
            this.game.port = choice;
            
            // Show traveling message
            this.mainBox.setContent(`
Arriving at ${this.game.locations[choice]}...`);
            this.screen.render();
            
            // Update game state for time passage
            this.game.month++;
            if (this.game.month === 13) {
              this.game.month = 1;
              this.game.year++;
            }
            
            // Update prices and interest
            this.game.debt = this.game.debt + (this.game.debt * 0.1);
            this.game.bank = this.game.bank + (this.game.bank * 0.005);
            this.game.setPrices();
            
            // Wait briefly then resolve
            setTimeout(() => {
              this.clearSubmitHandler();
              this.inputBox.hide();
              resolve(true);
            }, 2000);
          }
        }
      });
      
      this.inputBox.show();
      this.inputBox.focus();
      this.screen.render();
    });
  }

  showMessage(message) {
    this.mainBox.setLine(3, 0, message);
    this.screen.render();
  }

  onKey(handler) {
    const listener = (ch, key) => {
      handler(key.name);
      this.screen.removeListener('keypress', listener);
    };
    this.screen.on('keypress', listener);
  }

  setSubmitHandler(handler) {
    this.onSubmit = handler;
  }

  clearSubmitHandler() {
    this.onSubmit = null;
  }
} 