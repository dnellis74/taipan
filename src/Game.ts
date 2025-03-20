import {
    GameState,
    GameAction,
    Location,
    EventType,
    GameEvent,
    CargoType,
    BattleResult,
    PirateType
} from './types';

import { ConsoleUIService } from './services/ConsoleUIService';
import { BankingService } from './services/BankingService';
import { BattleService } from './services/BattleService';
import { EventService } from './services/EventService';
import { TradingService } from './services/TradingService';
import { TravelService } from './services/TravelService';

export class Game {
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
            cargoSpace: 0,  // Will be set based on initial conditions
            warehouse: new Array(4).fill(0),  // One slot for each cargo type
            capacity: 0,  // Will be set based on initial conditions
            guns: 0,
            damage: 0,
            location: Location.HONG_KONG,
            nextDestination: null,
            month: 1,
            year: 1860,  // Starting year for the China trade era
            liYuenStatus: false,
            wuWarning: false,
            wuBailout: 0,
            enemyHealth: 20,  // ec in C code
            enemyDamage: 0.5,  // ed in C code
            battleProbability: 8,  // Initial bp value like C code
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

        // Initialize game state based on player choice
        const startConditions = await this.ui.getCashOrGunsChoice();
        
        // Apply initial conditions exactly as in C code
        this.state.cash = startConditions.cash;
        this.state.debt = startConditions.debt;
        this.state.hold = startConditions.hold;
        this.state.capacity = startConditions.hold; // In C, hold is both current and max capacity
        this.state.cargoSpace = startConditions.hold;
        this.state.guns = startConditions.guns;
        this.state.liYuenStatus = startConditions.liYuenStatus;
        
        // Set initial prices for starting port (Hong Kong)
        await this.trading.updatePrices(this.state, true);
        
        this.initialized = true;
    }

    async update(): Promise<void> {
        // Only check for random events if we're at sea
        if (this.state.location === Location.AT_SEA && this.state.nextDestination !== null) {
            // Check for random events while at sea - use bp (battle probability) like C code
            const shouldHaveBattle = Math.floor(Math.random() * this.state.battleProbability) === 0;
            
            if (shouldHaveBattle) {
                // Calculate number of ships like C code: rand()%((capacity / 10) + guns) + 1
                const numShips = Math.min(9999, Math.floor(Math.random() * (Math.floor(this.state.capacity / 10) + this.state.guns)) + 1);
                
                const event: GameEvent = {
                    type: EventType.PIRATES,
                    description: `${numShips} hostile ships approaching, Taipan!`,
                    requiresUserInput: true,
                    data: {
                        numShips
                    }
                };
                
                await this.handleEvent(event);
                
                // If we're not at sea anymore (e.g., ship was sunk), return
                if (this.state.location !== Location.AT_SEA) {
                    return;
                }
            }

            // Check for independent Li Yuen encounter (like C code)
            const liYuenChance = Math.floor(Math.random() * (4 + (8 * (this.state.liYuenStatus ? 1 : 0)))) === 0;
            if (liYuenChance) {
                if (!this.state.liYuenStatus) {
                    // Calculate Li Yuen's fleet size like C code: rand()%((capacity / 5) + guns) + 5
                    const liShips = Math.floor(Math.random() * (Math.floor(this.state.capacity / 5) + this.state.guns)) + 5;
                    
                    await this.ui.displayCompradorReport(
                        `${liShips} ships of Li Yuen's pirate\nfleet, Taipan!!`
                    );
                    const liResult = await this.battle.doSeaBattle(this.state, liShips, PirateType.LI_YUEN);
                    
                    if (liResult === BattleResult.LOST) {
                        await this.ui.displayCompradorReport(
                            'The buggers got us, Taipan!!!\nIt\'s all over, now!!!'
                        );
                        await this.handleGameOver();
                        return;
                    }
                } else {
                    await this.ui.displayCompradorReport('Good joss!! They let us be!!');
                }
            }

            // After all events, complete the journey
            this.state.location = this.state.nextDestination;
            this.state.nextDestination = null;
            
            // Process monthly events (increment month, apply interest, etc.)
            await this.eventService.processMonthlyEvents(this.state);
            
            // Set initial prices for the new port
            await this.trading.updatePrices(this.state, true);  // true = set new port prices
            
            await this.ui.displayCompradorReport(
                `Arriving at ${this.state.location}...`
            );

            // Check for McHenry's repair offer in Hong Kong when damaged
            if (this.state.location === Location.HONG_KONG && this.state.damage > 0) {
                // Calculate repair costs like C code
                const baseRepairCost = Math.floor(this.state.damage * (50 + Math.random() * 50));
                const totalRepairCost = Math.floor(baseRepairCost * (1 + this.state.capacity / 50));

                const event: GameEvent = {
                    type: EventType.MCHENRY,
                    description: `McHenry says repairs will cost $${totalRepairCost}, Taipan.\nYour ship has ${this.state.damage}% damage.`,
                    requiresUserInput: true,
                    data: {
                        baseRepairCost,
                        totalRepairCost,
                        damagePercent: this.state.damage
                    }
                };

                await this.handleEvent(event);
            }
            
            // Increase difficulty like C code
            if (this.state.battleProbability > 3) {
                this.state.battleProbability--;
            }
            
            return;
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
                case EventType.PIRATES: {
                    const numShips = event.data.numShips || 1;
                    await this.ui.displayCompradorReport(
                        `${numShips} hostile ships approaching, Taipan!`,
                        3000
                    );
                    
                    const result = await this.battle.doSeaBattle(this.state, numShips);
                    
                    if (result === BattleResult.WON) {
                        await this.ui.displayCompradorReport(
                            `We got 'em all, Taipan!\nWe captured booty worth $${this.state.booty}!`
                        );
                        this.state.cash += this.state.booty;
                    } else if (result === BattleResult.FLED) {
                        await this.ui.displayCompradorReport('We made it!');
                    } else if (result === BattleResult.LOST) {
                        await this.ui.displayCompradorReport(
                            'The buggers got us, Taipan!!!\nIt\'s all over, now!!!'
                        );
                        await this.handleGameOver();
                    } else if (result === BattleResult.INTERRUPTED) {
                        await this.ui.displayCompradorReport('Li Yuen\'s fleet drove them off!');
                        
                        // Check for Li Yuen's pirates
                        if (!this.state.liYuenStatus) {
                            // Calculate Li Yuen's fleet size like C code: (capacity/25 + guns/2 + 5) * random(0.75 to 1.25)
                            const baseShips = Math.floor(this.state.capacity/25 + this.state.guns/2 + 5);
                            const randomMultiplier = 0.75 + (Math.random() * 0.5);
                            const liShips = Math.max(1, Math.floor(baseShips * randomMultiplier));
                            
                            await this.ui.displayCompradorReport(
                                `${liShips} ships of Li Yuen's pirate\nfleet, Taipan!!`
                            );
                            const liResult = await this.battle.doSeaBattle(this.state, liShips, PirateType.LI_YUEN);
                            
                            if (liResult === BattleResult.WON) {
                                await this.ui.displayCompradorReport(
                                    `We got 'em all, Taipan!\nWe captured booty worth $${this.state.booty}!`
                                );
                                this.state.cash += this.state.booty;
                            } else if (liResult === BattleResult.FLED) {
                                await this.ui.displayCompradorReport('We made it!');
                            } else if (liResult === BattleResult.LOST) {
                                await this.ui.displayCompradorReport(
                                    'The buggers got us, Taipan!!!\nIt\'s all over, now!!!'
                                );
                                await this.handleGameOver();
                            }
                        } else {
                            await this.ui.displayCompradorReport('Good joss!! They let us be!!');
                        }
                    }
                    break;
                }
                
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

    private async handleGameOver(): Promise<void> {
        const score = this.calculateScore();
        await this.ui.displayGameOver(score);
        this.cleanup();
        process.exit(0);
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
            case GameAction.VISIT_WU:
                await this.handleVisitWu();
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
        let priceReport = 'Taipan, present prices per unit here are\n';
        priceReport += `   Opium: $${this.state.prices.opium}          Silk: $${this.state.prices.silk}\n`;
        priceReport += `   Arms: $${this.state.prices.arms}           General: $${this.state.prices.general}`;
        await this.ui.displayCompradorReport(priceReport);

        // Get cargo type using single letter like C code
        const choice = (await this.ui.question('What do you wish me to buy, Taipan? ')).toUpperCase();
        let cargoType: CargoType;
        
        switch (choice) {
            case 'O': cargoType = CargoType.OPIUM; break;
            case 'S': cargoType = CargoType.SILK; break;
            case 'A': cargoType = CargoType.ARMS; break;
            case 'G': cargoType = CargoType.GENERAL_CARGO; break;
            default: return; // Invalid choice
        }

        const amount = await this.ui.getNumber('How much shall I buy, Taipan: ');
        
        // Handle 'all' case (-1) by calculating max affordable
        const actualAmount = amount === -1 ? 
            Math.floor(this.state.cash / this.state.prices[this.trading.getCargoStateProp(cargoType)]) : 
            amount;

        if (this.trading.canBuy(this.state, cargoType, actualAmount)) {
            this.trading.buy(this.state, cargoType, actualAmount);
        } else {
            await this.ui.displayCompradorReport(
                'Cannot buy that amount of cargo, Taipan.'
            );
        }
    }

    private async handleSelling(): Promise<void> {
        // Get cargo type using single letter like C code
        const choice = (await this.ui.question('What do you wish me to sell, Taipan? ')).toUpperCase();
        let cargoType: CargoType;
        
        switch (choice) {
            case 'O': cargoType = CargoType.OPIUM; break;
            case 'S': cargoType = CargoType.SILK; break;
            case 'A': cargoType = CargoType.ARMS; break;
            case 'G': cargoType = CargoType.GENERAL_CARGO; break;
            default: return; // Invalid choice
        }

        const amount = await this.ui.getNumber('How much shall I sell, Taipan: ');
        
        // Handle 'all' case (-1) by using all available cargo
        const actualAmount = amount === -1 ? 
            this.trading.getCargoAmount(this.state, cargoType) : 
            amount;

        if (this.trading.canSell(this.state, cargoType, actualAmount)) {
            this.trading.sell(this.state, cargoType, actualAmount);
        } else {
            await this.ui.displayCompradorReport(
                `You have only ${this.trading.getCargoAmount(this.state, cargoType)}, Taipan.`
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

    private async handleVisitWu(): Promise<void> {
        // First ask if player wants to do business with Wu
        if (!await this.ui.getYesNo('Do you have business with Elder Brother\nWu, the moneylender?')) {
            return;
        }

        // Check if player is completely broke (like C code)
        const isBroke = this.state.cash === 0 && 
                       this.state.bank === 0 && 
                       this.state.guns === 0 &&
                       Object.values(this.state.inventory).every(amount => amount === 0);

        if (isBroke) {
            // Wu bailout offer (like C code)
            const loanAmount = Math.floor(Math.random() * 1000) + 500; // 500-1500
            const repayAmount = Math.floor(Math.random() * 2000 * (this.state.wuBailout + 1)) + 1500;
            
            const event: GameEvent = {
                type: EventType.WU_BUSINESS,
                description: `Elder Brother is aware of your plight, Taipan. He is willing to loan you an additional ${loanAmount} if you will pay back ${repayAmount}.`,
                requiresUserInput: true,
                data: {
                    wuLoanAmount: loanAmount,
                    wuRepayAmount: repayAmount
                }
            };

            const result = await this.ui.handleEvent(this.state, event);
            await this.eventService.applyEventResult(this.state, event, result);
            await this.ui.displayEventOutcome(event, result);
            return;
        }

        // Handle debt repayment if player has cash and debt
        if (this.state.cash > 0 && this.state.debt > 0) {
            const amount = await this.ui.getNumber('How much do you wish to repay\nhim? ');
            
            // Handle 'all' case (-1) by using lesser of cash or debt
            const actualAmount = amount === -1 ? 
                Math.min(this.state.cash, this.state.debt) : 
                amount;

            if (actualAmount > this.state.cash) {
                await this.ui.displayCompradorReport(
                    `Taipan, you only have ${this.state.cash}\nin cash.`
                );
                return;
            }

            // Don't allow overpayment
            const paymentAmount = Math.min(actualAmount, this.state.debt);
            this.state.cash -= paymentAmount;
            this.state.debt -= paymentAmount;

            if (paymentAmount === this.state.debt) {
                await this.ui.displayCompradorReport(
                    `Taipan, you owe only ${paymentAmount}.\nPaid in full.`
                );
            }
        }

        // Handle borrowing (can borrow up to 2x current cash)
        const borrowAmount = await this.ui.getNumber('How much do you wish to\nborrow? ');
        
        // Handle 'all' case (-1) by using 2x current cash
        const actualBorrowAmount = borrowAmount === -1 ? 
            this.state.cash * 2 : 
            borrowAmount;

        if (actualBorrowAmount <= this.state.cash * 2) {
            this.state.cash += actualBorrowAmount;
            this.state.debt += actualBorrowAmount;
        } else {
            await this.ui.displayCompradorReport(
                'He won\'t loan you so much, Taipan!'
            );
        }

        // Random chance of being mugged after visiting Wu with high debt
        if (this.state.debt > 20000 && this.state.cash > 0 && Math.random() < 0.2) {
            const numGuards = Math.floor(Math.random() * 3) + 1;
            const stolenAmount = this.state.cash;
            this.state.cash = 0;
            
            await this.ui.displayCompradorReport(
                `Bad joss!!\n${numGuards} of your bodyguards have been killed\nby cutthroats and you have been robbed\nof all of your cash, Taipan!!`
            );
        }
    }
} 