import { GENERIC, LI_YUEN, BATTLE_NOT_FINISHED, BATTLE_WON, BATTLE_INTERRUPTED, BATTLE_FLED, BATTLE_LOST } from './state.js';

export class Battle {
  constructor(screen, game, id, numShips) {
    this.screen = screen;
    this.game = game;
    this.id = id;
    this.numShips = numShips;
    this.shipsOnScreen = new Array(10).fill(0);
    this.numOnScreen = 0;
    this.orders = 0;
    this.booty = 0;
    
    // Calculate booty based on time and number of ships
    const time = ((this.game.year - 1860) * 12) + this.game.month;
    this.booty = Math.floor((time / 4 * 1000 * numShips) + Math.random() * 1000 + 250);
  }

  drawLorcha(x, y) {
    return [
      '-|-_|_  ',
      '-|-_|_  ',
      '_|__|__/',
      '\\_____/ '
    ].map((line, i) => ({x, y: y + i, content: line}));
  }

  drawBlast(x, y) {
    return [
      '********',
      '********',
      '********',
      '********'
    ].map((line, i) => ({x, y: y + i, content: line}));
  }

  async sinkLorcha(x, y) {
    const frames = [
      ['        ', '-|-_|_  ', '-|-_|_  ', '_|__|__/'],
      ['        ', '        ', '-|-_|_  ', '-|-_|_  '],
      ['        ', '        ', '        ', '-|-_|_  '],
      ['        ', '        ', '        ', '        ']
    ];

    for (const frame of frames) {
      this.screen.drawBattleFrame(frame.map((line, i) => ({x, y: y + i, content: line})));
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async start() {
    let result = BATTLE_NOT_FINISHED;
    
    while (this.numShips > 0) {
      // Check ship status
      const status = this.game.getShipStatus();
      if (status.percent <= 0) {
        return BATTLE_LOST;
      }

      // Draw ships
      this.drawBattleScreen();
      
      // Get player orders
      this.orders = await this.getOrders();
      
      // Process orders
      if (this.orders === 1) { // Fight
        result = await this.processFightOrders();
      } else if (this.orders === 2) { // Run
        result = await this.processRunOrders();
      } else if (this.orders === 3) { // Throw cargo
        result = await this.processThrowCargoOrders();
      }

      if (result !== BATTLE_NOT_FINISHED) {
        return result;
      }

      // Enemy turn
      if (this.numShips > 0) {
        await this.processEnemyTurn();
      }
    }

    return this.orders === 1 ? BATTLE_WON : BATTLE_FLED;
  }

  async getOrders() {
    return new Promise(resolve => {
      const handler = (key) => {
        if (key === 'f') resolve(1);
        else if (key === 'r') resolve(2);
        else if (key === 't') resolve(3);
      };
      
      this.screen.onKey(handler);
      this.screen.showBattlePrompt();
    });
  }

  async processFightOrders() {
    if (this.game.guns === 0) {
      this.screen.showMessage("We have no guns, Taipan!!");
      return BATTLE_NOT_FINISHED;
    }

    // Process gun fire
    for (let i = 0; i < this.game.guns; i++) {
      const target = Math.floor(Math.random() * 10);
      if (this.shipsOnScreen[target] > 0) {
        await this.fireAtShip(target);
      }
    }

    // Check if enemies flee
    if (this.numShips > 2) {
      const fleeing = Math.floor(Math.random() * (this.numShips / 3 / this.id)) + 1;
      this.numShips -= fleeing;
      this.screen.showMessage(`${fleeing} ran away, Taipan!`);
    }

    return BATTLE_NOT_FINISHED;
  }

  async processRunOrders() {
    const escapeChance = Math.random() * 10;
    if (escapeChance > this.numShips / 2) {
      return BATTLE_FLED;
    }
    return BATTLE_NOT_FINISHED;
  }

  async processThrowCargoOrders() {
    // Implement cargo throwing logic
    return BATTLE_NOT_FINISHED;
  }

  async processEnemyTurn() {
    const damage = Math.floor(
      (this.game.ed * Math.min(15, this.numShips) * this.id * Math.random()) + 
      (Math.min(15, this.numShips) / 2)
    );
    
    this.game.damage += damage;

    if (this.id === GENERIC && Math.random() < 0.05) {
      return BATTLE_INTERRUPTED;
    }

    return BATTLE_NOT_FINISHED;
  }

  async fireAtShip(target) {
    const x = (target < 5) ? ((target + 1) * 10) : ((target - 4) * 10);
    const y = (target < 5) ? 6 : 12;

    // Show blast animation
    await this.showBlastAnimation(x, y);

    // Calculate damage
    this.shipsOnScreen[target] -= Math.floor(Math.random() * 30) + 10;

    // Sink ship if destroyed
    if (this.shipsOnScreen[target] <= 0) {
      this.numShips--;
      this.numOnScreen--;
      this.shipsOnScreen[target] = 0;
      await this.sinkLorcha(x, y);
    }
  }

  async showBlastAnimation(x, y) {
    const blast = this.drawBlast(x, y);
    const ship = this.drawLorcha(x, y);

    // Alternate between blast and ship twice
    for (let i = 0; i < 2; i++) {
      this.screen.drawBattleFrame(blast);
      await new Promise(resolve => setTimeout(resolve, 100));
      this.screen.drawBattleFrame(ship);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  drawBattleScreen() {
    // Draw battle stats at top
    const content = [
      `${this.numShips} ship${this.numShips === 1 ? '' : 's'} attacking, Taipan!`,
      `Your orders are to: ${this.getOrdersText()}`,
      `|  We have`,
      `|  ${this.game.guns} gun${this.game.guns === 1 ? '' : 's'}`,
      `+---------`
    ];

    content.forEach((line, i) => {
      this.screen.mainBox.setLine(i, 0, line);
    });

    // Draw ships
    let x = 10;
    let y = 6;
    for (let i = 0; i < 10; i++) {
      if (i === 5) {
        x = 10;
        y = 12;
      }

      if (this.numShips > this.numOnScreen && this.shipsOnScreen[i] === 0) {
        this.shipsOnScreen[i] = Math.floor(this.game.ec * Math.random() + 20);
        const ship = this.drawLorcha(x, y);
        this.screen.drawBattleFrame(ship);
        this.numOnScreen++;
      }

      x += 10;
    }

    // Show "+" if more ships waiting
    if (this.numShips > this.numOnScreen) {
      this.screen.mainBox.setLine(11, 62, '+');
    } else {
      this.screen.mainBox.setLine(11, 62, ' ');
    }

    this.screen.screen.render();
  }

  getOrdersText() {
    switch(this.orders) {
      case 1: return 'Fight      ';
      case 2: return 'Run        ';
      case 3: return 'Throw Cargo';
      default: return '          ';
    }
  }
} 