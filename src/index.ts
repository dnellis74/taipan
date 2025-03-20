import { Game } from './Game';
import { ConsoleUIService } from './services/ConsoleUIService';
import { SimpleBattleService } from './services/SimpleBattleService';
import { SimpleBankingService } from './services/SimpleBankingService';
import { SimpleEventService } from './services/SimpleEventService';
import { SimpleTravelService } from './services/TravelService';
import { SimpleTradingService } from './services/TradingService';

async function main() {
    // Create service instances
    const ui = new ConsoleUIService();
    const battle = new SimpleBattleService();
    const banking = new SimpleBankingService();
    const events = new SimpleEventService();
    const travel = new SimpleTravelService();
    const trading = new SimpleTradingService(ui);

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