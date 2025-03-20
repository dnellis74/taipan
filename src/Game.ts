import {
    GameState,
    GameOptions,
    GameAction,
    Location,
    EventType,
    EventResult,
    GameEvent,
    CargoType
} from './types';
import { UIService } from './services/UIService';
import { BattleService } from './services/BattleService';
import { BankingService } from './services/BankingService';
import { EventService } from './services/EventService';
import { TravelService } from './services/TravelService';
import { TradingService } from './services/TradingService';

export class Game {
    private static readonly STARTING_CASH = 1000;
    private static readonly STARTING_CAPACITY = 60;
    private static readonly MIN_RETIRE_SCORE = 1000000;
    private static readonly MAX_GAME_MONTHS = 600; // 50 years

    private state: GameState;
    private initialized: boolean = false;

    constructor(
        private ui: UIService,
        private battle: BattleService,
        private banking: BankingService,
        private events: EventService,
        private travel: TravelService,
        private trading: TradingService
    ) {
        this.state = this.createInitialState();
    }

    private createInitialState(): GameState {
        return {
            firmName: '',
            cash: 0,
            bank: 0,
            debt: 0,
            booty: 0,
            hold: new Array(Object.keys(CargoType).length / 2).fill(0),
            warehouse: new Array(Object.keys(CargoType).length / 2).fill(0),
            capacity: Game.STARTING_CAPACITY,
            guns: 0,
            damage: 0,
            month: 1,
            year: 1860,
            liYuenStatus: false,
            currentPort: Location.HONG_KONG,
            wuWarning: false,
            wuBailout: false,
            enemyHealth: 20,
            enemyDamage: 0.5
        };
    }

    public async init(options: GameOptions): Promise<boolean> {
        if (this.initialized) {
            return false;
        }

        // Initialize UI
        await this.ui.init();

        // Show splash screen
        await this.ui.displaySplashScreen();

        // Initialize new game state
        this.state = this.createInitialState();

        // Try to load saved game if specified
        if (options.saveFile && await this.loadGame(options.saveFile)) {
            this.initialized = true;
            return true;
        }

        // Get firm name first
        this.state.firmName = await this.ui.getFirmName();

        // Set up initial cash based on game mode
        if (options.debugMode) {
            this.state.cash = 100000;
            this.state.bank = 1000000;
        } else if (options.quickStart) {
            this.state.cash = Game.STARTING_CASH * 10;
        } else {
            this.state.cash = Game.STARTING_CASH;
        }

        this.initialized = true;
        return true;
    }

    public async run(): Promise<void> {
        if (!this.initialized) {
            throw new Error("Game not initialized");
        }

        while (!this.isGameOver()) {
            // Display current port status
            await this.ui.displayPortStats(this.state);

            // Handle monthly events if in Hong Kong
            if (this.state.currentPort === Location.HONG_KONG) {
                await this.events.processMonthlyEvents(this.state);
            }

            // Check for random events
            const event = this.events.checkRandomEvents(this.state);
            if (event.type !== EventType.NONE) {
                let result: EventResult;

                if (event.requiresAction) {
                    // Display event and get player response
                    result = await this.ui.displayEventPrompt(event);
                } else {
                    // Automatically handle event
                    result = await this.events.handleAutomaticEvent(this.state, event);
                }

                // Apply event results
                this.events.applyEventResult(this.state, event, result);

                // Display event outcome
                await this.ui.displayEventResult(event, result);
            }

            // Handle player actions at port
            const action = await this.handlePortActions();

            if (action === GameAction.QUIT) {
                break;
            }

            if (action === GameAction.RETIRE && this.canRetire()) {
                await this.ui.displayRetirementMessage(this.calculateScore());
                break;
            }

            // End of month processing
            if (this.state.currentPort === Location.HONG_KONG) {
                this.handleMonthEnd();
            }
        }

        // Game over
        if (this.isGameOver()) {
            await this.ui.displayGameOver(this.calculateScore());
        }

        // Cleanup
        this.ui.cleanup();
    }

    private async handlePortActions(): Promise<GameAction> {
        while (true) {
            const choice = await this.ui.getPortMenuChoice();

            switch (choice) {
                case GameAction.BUY:
                    await this.handleBuying();
                    break;

                case GameAction.SELL:
                    await this.handleSelling();
                    break;

                case GameAction.BANK:
                    // Banking would be implemented here
                    break;

                case GameAction.WAREHOUSE:
                    if (this.state.currentPort === Location.HONG_KONG) {
                        // Warehouse handling would be implemented here
                    }
                    break;

                case GameAction.TRAVEL:
                    const dest = await this.ui.getTravelDestination();
                    if (this.travel.canTravelTo(this.state, dest)) {
                        if (await this.handleSeaTravel(dest)) {
                            return choice;
                        }
                    }
                    break;

                case GameAction.QUIT:
                    if (await this.ui.confirmQuit()) {
                        return choice;
                    }
                    break;

                case GameAction.RETIRE:
                    if (this.canRetire() && await this.ui.confirmRetire()) {
                        return choice;
                    }
                    break;
            }
        }
    }

    private async handleSeaTravel(destination: Location): Promise<boolean> {
        if (destination === this.state.currentPort) {
            return false;
        }

        // Check for pirates based on distance and cargo value
        const distance = this.travel.calculateDistance(this.state.currentPort, destination);
        const pirateChance = 10 + (distance * 5) + (this.getTotalCargoValue() / 1000);
        
        if (Math.random() * 100 < pirateChance) {
            const numShips = Math.floor(Math.random() * 5) + 1;
            const result = await this.battle.doSeaBattle(this.state, numShips);

            if (!result) {
                return false;
            }
        }

        // Made it to destination
        this.travel.travel(this.state, destination);
        return true;
    }

    private async handleBuying(): Promise<void> {
        // Display current prices
        console.log('\nCurrent Prices:');
        Object.values(CargoType).filter(cargo => typeof cargo === 'number').forEach(cargo => {
            const price = this.trading.getCargoPrice(this.state.currentPort, cargo as CargoType);
            console.log(`${CargoType[cargo]}: $${price}`);
        });

        // Get cargo type and amount
        const cargoType = parseInt(await this.ui.question('Enter cargo type (0-3): '));
        const amount = parseInt(await this.ui.question('Enter amount: '));

        if (this.trading.canBuy(this.state, cargoType, amount)) {
            this.trading.buy(this.state, cargoType, amount);
        } else {
            console.log('Cannot buy that amount of cargo.');
        }
    }

    private async handleSelling(): Promise<void> {
        // Display current cargo
        console.log('\nYour Cargo:');
        Object.values(CargoType).filter(cargo => typeof cargo === 'number').forEach(cargo => {
            const amount = this.trading.getCargoAmount(this.state, cargo as CargoType);
            const price = this.trading.getCargoPrice(this.state.currentPort, cargo as CargoType);
            console.log(`${CargoType[cargo]}: ${amount} units at $${price} each`);
        });

        // Get cargo type and amount
        const cargoType = parseInt(await this.ui.question('Enter cargo type (0-3): '));
        const amount = parseInt(await this.ui.question('Enter amount: '));

        if (this.trading.canSell(this.state, cargoType, amount)) {
            this.trading.sell(this.state, cargoType, amount);
        } else {
            console.log('Cannot sell that amount of cargo.');
        }
    }

    private handleMonthEnd(): void {
        // Apply bank interest
        this.banking.applyInterest(this.state);

        // Apply debt interest
        this.banking.applyDebtInterest(this.state);

        // Reset monthly status
        this.state.liYuenStatus = false;

        // Increment month
        this.state.month++;
        if (this.state.month > 12) {
            this.state.month = 1;
            this.state.year++;
        }

        // Update enemy difficulty
        this.updateGameState();
    }

    private isGameOver(): boolean {
        // Game over conditions
        if (this.state.cash === 0 && this.state.bank === 0 && this.state.debt > 0) {
            return true;
        }

        if (this.state.damage >= 100) {
            return true;
        }

        const totalMonths = (this.state.year - 1860) * 12 + this.state.month;
        if (totalMonths >= Game.MAX_GAME_MONTHS) {
            return true;
        }

        return false;
    }

    private calculateScore(): number {
        let score = this.state.cash + this.state.bank;

        // Subtract debt
        if (this.state.debt > score) {
            return 0;
        }
        score -= this.state.debt;

        // Add bonus for guns and ship capacity
        score += this.state.guns * 100;
        score += (this.state.capacity - Game.STARTING_CAPACITY) * 1000;

        // Add bonus for warehouse goods
        for (const amount of this.state.warehouse) {
            score += amount * 500;
        }

        return score;
    }

    private canRetire(): boolean {
        return this.state.cash + this.state.bank >= Game.MIN_RETIRE_SCORE;
    }

    private getTotalCargoValue(): number {
        let total = 0;
        for (let cargo = 0; cargo < this.state.hold.length; cargo++) {
            const amount = this.state.hold[cargo];
            const price = this.trading.getCargoPrice(this.state.currentPort, cargo);
            total += amount * price;
        }
        return total;
    }

    private updateGameState(): void {
        this.state.enemyHealth += 0.5;
        this.state.enemyDamage += 0.01;
    }

    // Save/Load methods would be implemented here
    private async saveGame(filename: string): Promise<boolean> {
        // Implementation would depend on platform (browser/node)
        return true;
    }

    private async loadGame(filename: string): Promise<boolean> {
        // Implementation would depend on platform (browser/node)
        return false;
    }
} 