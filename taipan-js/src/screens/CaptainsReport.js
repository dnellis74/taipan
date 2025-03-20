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

  async showBattle(numShips) {
    this.show();
    await this.showMessage(`${numShips} hostile ships approaching, Taipan!`);
    
    // TODO: Implement battle visualization
    // For now, just show a simple battle message
    await this.showMessage("Battle in progress...");
    await new Promise(r => setTimeout(r, 2000));
    
    // Simulate battle result (temporary)
    const result = Math.random() < 0.7 ? 'victory' : 'defeat';
    if (result === 'victory') {
      await this.showMessage("We've won the battle, Taipan!");
    } else {
      await this.showMessage("We've lost the battle, Taipan!");
    }
    
    this.hide();
    return result;
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
    await this.showMessage(`bc: ${battleChance} bp: ${this.game.bp}`);
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
    await this.showMessage(`sc: ${stormChance} sp: ${this.game.sp}`);
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