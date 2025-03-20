export const GENERIC = 1;
export const LI_YUEN = 2;

export const BATTLE_NOT_FINISHED = 0;
export const BATTLE_WON = 1;
export const BATTLE_INTERRUPTED = 2;
export const BATTLE_FLED = 3;
export const BATTLE_LOST = 4;

export class GameState {
  constructor() {
    this.debug = true;
    this.firm = '';
    this.items = ['Opium', 'Silk', 'Arms', 'General Cargo'];
    this.locations = ['At sea', 'Hong Kong', 'Shanghai', 'Nagasaki',
      'Saigon', 'Manila', 'Singapore', 'Batavia'];
    this.months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    this.shipStatus = ['Critical', '  Poor', '  Fair',
      '  Good', ' Prime', 'Perfect'];

    // Game state variables
    this.cash = 0;
    this.bank = 0;
    this.debt = 0;
    this.booty = 0;
    this.ec = 20;  // Base health of enemies
    this.ed = 0.5; // Damage dealt by enemies

    // Prices
    this.price = [0, 0, 0, 0];
    this.basePrice = [
      [1000, 11, 16, 15, 14, 12, 10, 13],
      [100,  11, 14, 15, 16, 10, 13, 12],
      [10,   12, 16, 10, 11, 13, 14, 15],
      [1,    10, 11, 12, 13, 14, 15, 16]
    ];

    // Warehouse and hold
    this.warehouseStock = [0, 0, 0, 0];
    this.holdStock = [0, 0, 0, 0];
    this.hold = 0;
    this.capacity = 60;
    this.guns = 0;
    this.bp = 0;
    this.damage = 0;

    // Time and location
    this.month = 1;
    this.year = 1860;
    this.li = 0;
    this.port = 1;
    this.wuWarn = 0;
    this.wuBailout = 0;

    // Game state
    this.inputBuffer = '';
  }

  setPrices() {
    for (let i = 0; i < 4; i++) {
      this.price[i] = Math.floor(
        (this.basePrice[i][this.port] / 2) * 
        (Math.floor(Math.random() * 3) + 1) * 
        this.basePrice[i][0]
      );
    }
  }

  getShipStatus() {
    const status = 100 - ((this.damage / this.capacity) * 100);
    return {
      percent: status,
      text: this.shipStatus[Math.floor(status / 20)]
    };
  }

  formatNumber(num) {
    if (num >= 100000000) {
      return `${Math.floor(num / 1000000)} Million`;
    } else if (num >= 10000000) {
      const millions = Math.floor(num / 1000000);
      const remainder = Math.floor((num % 1000000) / 100000);
      return `${millions}${remainder > 0 ? '.' + remainder : ''} Million`;
    } else if (num >= 1000000) {
      const millions = Math.floor(num / 1000000);
      const remainder = Math.floor((num % 1000000) / 10000);
      return `${millions}${remainder > 0 ? '.' + remainder : ''} Million`;
    } else {
      return num.toString();
    }
  }

  startNewGame() {
    this.month = 1;
    this.year = 1860;
    this.port = 1;
    this.currentScreen = 'nameFirm';
  }

  cashStart() {
    this.cash = 400;
    this.debt = 5000;
    this.hold = 60;
    this.guns = 0;
    this.li = 0;  // Start hostile with Li Yuen
    this.bp = 10;
    this.sp = 10;
  }

  gunsStart() {
    this.cash = 0;
    this.debt = 0;
    this.hold = 10;
    this.guns = 5;
    this.li = 1;  // Start friendly with Li Yuen
    this.bp = 7;
    this.sp = 10;
  }
} 