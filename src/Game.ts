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

import { ConsoleUIService } from './services/ConsoleUIService';
import { BankingService } from './services/BankingService';
import { BattleService } from './services/BattleService';
import { EventService } from './services/EventService';
import { TradingService } from './services/TradingService';
import { TravelService } from './services/TravelService';

export class Game {
    private static readonly STARTING_CASH = 1000;
    private static readonly STARTING_CAPACITY = 60;
    private static readonly MIN_RETIRE_SCORE = 1000000;

    private state: GameState;
    private initialized: boolean = false;

    constructor(
        private ui: ConsoleUIService,
        private battle: BattleService,
        private banking: BankingService,
        private eventService: EventService,
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
            hold: 0,
            cargoSpace: Game.STARTING_CAPACITY,  // Initialize to match starting capacity
            warehouse: new Array(4).fill(0),  // One slot for each cargo type
            capacity: Game.STARTING_CAPACITY,  // Default warehouse capacity
            guns: 0,
            damage: 0,
            location: Location.HONG_KONG,
            nextDestination: null,  // Initialize with no destination
            month: 1,
            year: 1860,  // Starting year for the China trade era
            liYuenStatus: false,
            wuWarning: false,
            wuBailout: 0,
            enemyHealth: 20,
            enemyDamage: 0.5,
            prices: {
                general: 0,
                arms: 0,
                silk: 0,
                opium: 0
            },
            inventory: {
                general: 0,
                arms: 0,
                silk: 0,
                opium: 0
            }
        };
    }

    async init(): Promise<void> {
        if (this.initialized) return;

        await this.ui.init();
        
        // Show splash screen
        await this.ui.displaySplashScreen();

        // Get firm name
        this.state.firmName = await this.ui.getFirmName();

        // Initialize game state
        const startChoice = await this.ui.getCashOrGunsChoice();
        if (startChoice === 'cash') {
            this.state.cash = Game.STARTING_CASH;
            this.state.debt = Game.STARTING_CASH * 2;
            await this.ui.displayCompradorReport(
                `Starting with ${Game.STARTING_CASH} cash and ${this.state.debt} debt.`
            );
        } else {
            this.state.guns = 5;
            await this.ui.displayCompradorReport(
                'Starting with 5 guns and no debt.'
            );
        }

        this.state.capacity = Game.STARTING_CAPACITY;
        
        // Set initial prices for starting port (Hong Kong)
        await this.trading.updatePrices(this.state, true);
        
        this.initialized = true;
    }

    async update(): Promise<void> {
        // Only check for random events if we're completing a sea journey
        if (this.state.location === Location.AT_SEA && this.state.nextDestination !== null) {
            // Complete travel by moving to destination
            this.state.location = this.state.nextDestination;
            this.state.nextDestination = null;
            
            // Set initial prices for the new port
            await this.trading.updatePrices(this.state, true);  // true = set new port prices
            
            // Now check for random events since we've arrived at port
            const event = await this.eventService.checkRandomEvents(this.state);
            if (event.type !== EventType.NONE) {
                await this.handleEvent(event);
            }
            
            await this.ui.displayCompradorReport(
                `Arriving at ${this.state.location}...`
            );
        } else if (this.state.location !== Location.AT_SEA) {
            // While in port, 1/9 chance of price change (like original)
            await this.trading.updatePrices(this.state, false);  // false = check for random changes
        }

        // Display current port stats
        await this.ui.displayPortStats(this.state);

        // Get and handle player action
        const action = await this.ui.getPortMenuChoice();
        await this.handleAction(action);
    }

    private async handleEvent(event: GameEvent): Promise<void> {
        try {
            switch (event.type) {
                case EventType.PIRATES:
                    const numShips = event.data.numShips || 1;
                    await this.ui.displayCompradorReport(
                        `${numShips} hostile ships approaching, Taipan!`,
                        3000
                    );
                    break;
                case EventType.LI_YUEN:
                    if (this.state.location !== Location.HONG_KONG) {
                        await this.ui.displayCompradorReport(
                            'Li Yuen has sent a Lieutenant,\nTaipan. He says his admiral wishes\nto see you in Hong Kong, posthaste!',
                            3000
                        );
                    }
                    break;
                case EventType.LI_YUEN_EXTORTION:
                    const amount = event.data.extortionAmount || 0;
                    await this.ui.displayCompradorReport(
                        `Li Yuen asks ${amount} in donation\nto the temple of Tin Hau, the Sea\nGoddess.`,
                        3000
                    );
                    break;
                case EventType.OPIUM_SEIZED:
                    const fine = event.data.moneyLoss || 0;
                    await this.ui.displayCompradorReport(
                        `Bad Joss!!\nThe local authorities have seized your\nOpium cargo${fine > 0 ? ` and have also fined you\n$${fine}` : ''}, Taipan!`,
                        5000
                    );
                    break;
                case EventType.WAREHOUSE_RAID:
                    await this.ui.displayCompradorReport(
                        'Messenger reports large theft\nfrom warehouse, Taipan.',
                        5000
                    );
                    break;
                case EventType.MUGGED:
                    const stolenAmount = event.data.moneyLoss || 0;
                    await this.ui.displayCompradorReport(
                        `Bad Joss!!\nYou've been beaten up and\nrobbed of ${stolenAmount} in cash, Taipan!!`,
                        5000
                    );
                    break;
                case EventType.SHIP_OFFER:
                    await this.ui.displayCompradorReport(event.description);
                    break;
                case EventType.GUN_OFFER:
                    await this.ui.displayCompradorReport(event.description);
                    break;
            }

            const result = await this.ui.handleEvent(this.state, event);
            await this.eventService.applyEventResult(this.state, event, result);
            await this.ui.displayEventOutcome(event, result);
        } catch (e) {
            // If a new event is thrown (like gun offer after ship purchase), handle it
            if (e && typeof e === 'object' && 'type' in e && e.type === EventType.GUN_OFFER) {
                await this.handleEvent(e as GameEvent);
            } else {
                throw e;  // Re-throw if not an event
            }
        }
    }

    private async handleAction(action: GameAction): Promise<void> {
        switch (action) {
            case GameAction.BUY:
                await this.handleBuying();
                break;
            case GameAction.SELL:
                await this.handleSelling();
                break;
            case GameAction.BANK:
                await this.handleBanking();
                break;
            case GameAction.WAREHOUSE:
                await this.handleWarehouse();
                break;
            case GameAction.TRAVEL:
                await this.handleTravel();
                break;
            case GameAction.QUIT:
                if (await this.ui.confirmQuit()) {
                    this.cleanup();
                    process.exit(0);
                }
                break;
            case GameAction.RETIRE:
                if (this.canRetire() && await this.ui.confirmRetire()) {
                    await this.handleRetirement();
                } else {
                    await this.ui.displayCompradorReport(
                        'You need at least 1,000,000 to retire, Taipan!'
                    );
                }
                break;
        }
    }

    private async handleBuying(): Promise<void> {
        // Display current prices via Comprador's Report
        let priceReport = 'Current prices per unit here are:\n';
        // Use stored prices from state instead of generating new ones
        priceReport += `OPIUM: $${this.state.prices.opium}\n`;
        priceReport += `SILK: $${this.state.prices.silk}\n`;
        priceReport += `ARMS: $${this.state.prices.arms}\n`;
        priceReport += `GENERAL: $${this.state.prices.general}\n`;
        await this.ui.displayCompradorReport(priceReport);

        // Get cargo type and amount
        const cargoType = parseInt(await this.ui.question('Enter cargo type (0-3): '));
        const amount = parseInt(await this.ui.question('Enter amount: '));

        if (this.trading.canBuy(this.state, cargoType, amount)) {
            this.trading.buy(this.state, cargoType, amount);
            await this.ui.displayCompradorReport(
                `Bought ${amount} units of ${CargoType[cargoType]}.`
            );
        } else {
            await this.ui.displayCompradorReport(
                'Cannot buy that amount of cargo, Taipan.'
            );
        }
    }

    private async handleSelling(): Promise<void> {
        // Display current cargo via Comprador's Report
        let cargoReport = 'Your current cargo:\n';
        Object.values(CargoType).filter(cargo => typeof cargo === 'number').forEach(cargo => {
            const amount = this.trading.getCargoAmount(this.state, cargo as CargoType);
            const price = this.trading.getCargoPrice(this.state.location, cargo as CargoType);
            cargoReport += `${CargoType[cargo]}: ${amount} units at $${price} each\n`;
        });
        await this.ui.displayCompradorReport(cargoReport);

        // Get cargo type and amount
        const cargoType = parseInt(await this.ui.question('Enter cargo type (0-3): '));
        const amount = parseInt(await this.ui.question('Enter amount: '));

        if (this.trading.canSell(this.state, cargoType, amount)) {
            this.trading.sell(this.state, cargoType, amount);
            await this.ui.displayCompradorReport(
                `Sold ${amount} units of ${CargoType[cargoType]}.`
            );
        } else {
            await this.ui.displayCompradorReport(
                'Cannot sell that amount of cargo, Taipan.'
            );
        }
    }

    private async handleBanking(): Promise<void> {
        const depositAmount = parseInt(await this.ui.question('How much to deposit? ') || '0');
        if (depositAmount > 0 && depositAmount <= this.state.cash) {
            this.state.cash -= depositAmount;
            this.state.bank += depositAmount;
            await this.ui.displayCompradorReport(
                `Deposited $${depositAmount} in the bank.`
            );
        }

        const withdrawAmount = parseInt(await this.ui.question('How much to withdraw? ') || '0');
        if (withdrawAmount > 0 && withdrawAmount <= this.state.bank) {
            this.state.bank -= withdrawAmount;
            this.state.cash += withdrawAmount;
            await this.ui.displayCompradorReport(
                `Withdrew $${withdrawAmount} from the bank.`
            );
        }
    }

    private async handleWarehouse(): Promise<void> {
        // Show current warehouse contents
        await this.ui.displayCompradorReport(
            'Warehouse Contents:\n' +
            Object.entries(this.state.inventory)
                .map(([cargo, amount]) => `${cargo}: ${amount}`)
                .join('\n')
        );

        // Handle transfers...
    }

    private async handleTravel(): Promise<void> {
        const destination = await this.ui.getTravelDestination();
        
        if (this.state.location === destination) {
            await this.ui.displayCompradorReport(
                "You're already here, Taipan!"
            );
            return;
        }

        if (this.state.damage >= 90) {
            await this.ui.displayCompradorReport(
                "Ship damage too severe for travel, Taipan!"
            );
            return;
        }

        // Start travel - this sets location to AT_SEA and stores destination
        this.travel.travel(this.state, destination);
        await this.ui.displayCompradorReport(
            `Setting sail for ${destination}, Taipan!`
        );
    }

    private async handleRetirement(): Promise<void> {
        const score = this.calculateScore();
        await this.ui.displayRetirementMessage(score);
        this.cleanup();
        process.exit(0);
    }

    private cleanup(): void {
        this.ui.cleanup();
    }

    private canRetire(): boolean {
        return (this.state.cash + this.state.bank - this.state.debt) >= Game.MIN_RETIRE_SCORE;
    }

    private calculateScore(): number {
        const netWorth = this.state.cash + this.state.bank - this.state.debt;
        const monthsPlayed = ((this.state.year - 1860) * 12) + this.state.month;
        return Math.floor(netWorth / 100 / monthsPlayed);
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