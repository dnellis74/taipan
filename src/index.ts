import { Game } from './Game';
import { ConsoleUIService } from './services/ConsoleUIService';
import { BattleService } from './services/BattleService';
import { BankingService } from './services/BankingService';
import { EventService } from './services/EventService';
import { TravelService } from './services/TravelService';
import { TradingService } from './services/TradingService';

async function main() {
    // Create service instances
    const ui = new ConsoleUIService();
    const battle = new BattleService();
    const banking = new BankingService();
    const events = new EventService();
    const travel = new TravelService();
    const trading = new TradingService(ui);

    // Create and initialize game
    const game = new Game(ui, battle, banking, events, travel, trading);
    await game.init();

    // Main game loop
    while (true) {
        await game.update();
    }
}

// Start the game
main().catch(console.error); 