import { GameState, GameEvent, EventResult, GameAction, Location, CargoType, EventType, ShipCondition, Month, InitialGameConditions, CASH_START_CONDITIONS, GUNS_START_CONDITIONS } from '../types';
import * as readline from 'readline';

export class ConsoleUIService {
    private rl: readline.Interface;
    private state: GameState | null = null;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async init(): Promise<void> {
        console.clear();
    }

    cleanup(): void {
        this.rl.close();
    }

    async displaySplashScreen(): Promise<void> {
        console.clear();
        console.log("\n");
        console.log("         _____  _    ___ ____   _    _   _               ===============");
        console.log("        |_   _|/ \\  |_ _|  _ \\ / \\  | \\ | |              Created by:");
        console.log("          | | / _ \\  | || |_) / _ \\ |  \\| |                 Art Canfil");
        console.log("          | |/ ___ \\ | ||  __/ ___ \\| |\\  |");
        console.log("          |_/_/   \\_\\___|_| /_/   \\_\\_| \\_|              ===============");
        console.log("                                                         Programmed by:");
        console.log("   A game based on the China trade of the 1800's            Jay Link");
        console.log("\n");
        console.log("                      ~~|     ,                          jlink@ilbbs.com");
        console.log("                       ,|`-._/|");
        console.log("                     .' |   /||\\                         ===============");
        console.log("                   .'   | ./ ||`\\                         Copyright (c)");
        console.log("                  / `-. |/._ ||  \\                         1978 - 2002");
        console.log("                 /     `||  `|;-._\\                         Art Canfil");
        console.log("                 |      ||   ||   \\");
        console.log("~^~_-~^~=~^~~^= /       ||   ||__  \\~^=~^~-~^~_~^~=      ===============");
        console.log(" ~=~^~ _~^~ =~ `--------|`---||  `\"-`___~~^~ =_~^=        Press ANY key");
        console.log("~ ~^~=~^_~^~ =~ \\~~~~~~~'~~~~'~~~~/~~`` ~=~^~ ~^=           to start.");
        console.log(" ~^=~^~_~-=~^~ ^ `--------------'~^~=~^~_~^=~^~=~\n");

        await this.waitForKey();
    }

    async displayPortStats(state: GameState): Promise<void> {
        this.state = state;
        console.clear();
        console.log(`=== ${state.firmName} ===`);
        console.log(`Location: ${state.location}`);
        // Convert month number (1-12) to Month enum value
        const monthName = Month[Object.keys(Month)[state.month - 1] as keyof typeof Month];
        console.log(`Date: 15 ${monthName} ${state.year}`);
        console.log(`Cash: $${state.cash}`);
        console.log(`Bank: $${state.bank}`);
        console.log(`Debt: $${state.debt}`);
        console.log(`Ship Capacity: ${state.capacity}`);
        console.log(`Guns: ${state.guns}`);

        // Get ship condition based on damage percentage
        let condition: ShipCondition;
        if (state.damage >= 90) {
            condition = ShipCondition.CRITICAL;
        } else if (state.damage >= 70) {
            condition = ShipCondition.POOR;
        } else if (state.damage >= 50) {
            condition = ShipCondition.FAIR;
        } else if (state.damage >= 30) {
            condition = ShipCondition.GOOD;
        } else if (state.damage >= 10) {
            condition = ShipCondition.PRIME;
        } else {
            condition = ShipCondition.PERFECT;
        }

        console.log(`Ship Condition: ${condition} (${state.damage}% damage)`);
        console.log('\nCargo:');
        Object.entries(state.inventory).forEach(([cargo, amount]) => {
            console.log(`${cargo}: ${amount}`);
        });
        console.log('');
    }

    async displayEventPrompt(event: GameEvent): Promise<EventResult> {
        console.log('\n=== Event ===');
        switch (event.type) {
            case EventType.WU_WARNING:
                console.log(event.description);
                console.log('\nElder Brother Wu reminds you of the Confucian ideal of personal worthiness,');
                console.log('and how this applies to paying one\'s debts.');
                await this.waitForKey();
                console.log('\nHe is reminded of a fabled barbarian who came to a bad end,');
                console.log('after not caring for his obligations.');
                console.log('\nHe hopes no such fate awaits you, his friend, Taipan.');
                await this.waitForKey();
                return EventResult.NONE;

            case EventType.WU_BUSINESS:
                console.log(event.description);
                if (event.data.wuLoanAmount) {
                    // Bailout offer
                    if (await this.getYesNo('Are you willing, Taipan?')) {
                        return EventResult.ACCEPTED;
                    }
                    return EventResult.DECLINED;
                } else {
                    // Regular debt repayment
                    console.log('How much do you wish to repay him?');
                    const amount = await this.getNumber('Amount: ');
                    if (amount > 0) {
                        event.data.wuPaymentAmount = amount;
                        return EventResult.ACCEPTED;
                    }
                    return EventResult.DECLINED;
                }

            case EventType.MCHENRY:
                console.log(event.description);
                const repairAmount = await this.getNumber('How much will ye spend? ');
                if (repairAmount > 0) {
                    event.data.repairAmount = repairAmount;
                    return EventResult.ACCEPTED;
                }
                return EventResult.DECLINED;

            case EventType.SHIP_OFFER:
                console.log(`You are offered a larger ship with capacity ${event.data.ship?.newCapacity}`);
                console.log(`Price: $${event.data.ship?.price}`);
                if (await this.getYesNo('Accept offer?')) {
                    return EventResult.ACCEPTED;
                }
                return EventResult.DECLINED;

            case EventType.GUN_OFFER:
                console.log(`You are offered ${event.data.gun?.numGuns} guns`);
                console.log(`Price: $${event.data.gun?.price}`);
                if (await this.getYesNo('Accept offer?')) {
                    return EventResult.ACCEPTED;
                }
                return EventResult.DECLINED;

            case EventType.LI_YUEN_EXTORTION:
                if (await this.getYesNo('Will you pay?')) {
                    return EventResult.ACCEPTED;
                }
                return EventResult.DECLINED;

            case EventType.PIRATES:
                console.log('Pirates spotted! Prepare for battle!');
                if (await this.getYesNo('Try to flee?')) {
                    return EventResult.FLED;
                }
                return EventResult.NONE;

            default:
                return EventResult.NONE;
        }
    }

    async displayEventResult(event: GameEvent, result: EventResult): Promise<void> {
        console.log('\n=== Event Result ===');
        switch (result) {
            case EventResult.ACCEPTED:
                if (event.type === EventType.WU_BUSINESS) {
                    if (event.data.wuLoanAmount) {
                        console.log('Very well, Taipan. Good joss!!');
                    } else {
                        console.log('Elder Brother Wu is pleased with your payment.');
                    }
                } else if (event.type === EventType.MCHENRY) {
                    console.log('McHenry and his crew get to work on the repairs.');
                } else if (event.type === EventType.LI_YUEN_EXTORTION) {
                    console.log('Li Yuen is pleased with your donation.');
                } else {
                    console.log('Offer accepted.');
                }
                break;
            case EventResult.DECLINED:
                if (event.type === EventType.WU_BUSINESS) {
                    if (event.data.wuLoanAmount) {
                        console.log('Very well, Taipan, the game is over!');
                        // This should trigger game over in the main game loop
                    } else {
                        console.log('Elder Brother Wu understands. Return when you can pay.');
                    }
                } else if (event.type === EventType.MCHENRY) {
                    console.log('McHenry shakes his head and leaves.');
                } else if (event.type === EventType.LI_YUEN_EXTORTION) {
                    console.log('Li Yuen is displeased. Be wary of pirates!');
                } else {
                    console.log('Offer declined.');
                }
                break;
            case EventResult.FLED:
                console.log('You fled from the encounter.');
                break;
            case EventResult.DAMAGED:
                console.log(`Your ship took ${event.data.damageAmount}% damage!`);
                break;
            case EventResult.NONE:
                break;
        }
        await this.waitForKey();
    }

    async displayRetirementMessage(score: number): Promise<void> {
        console.clear();
        console.log('=== Retirement ===');
        console.log(`Congratulations! You've retired with a score of ${score}!`);
        await this.waitForKey();
    }

    async displayGameOver(score: number): Promise<void> {
        console.clear();
        console.log('=== Game Over ===');
        console.log(`Final Score: ${score}`);
        await this.waitForKey();
    }

    async displayCompradorReport(message: string, waitTime?: number): Promise<void> {
        console.log('\nComprador\'s Report\n');
        console.log(message);
        
        if (waitTime) {
            // Use setTimeout and Promise to create a delay
            await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
            await this.waitForKey();
        }
    }

    async getFirmName(): Promise<string> {
        return this.question('Enter your firm name: ');
    }

    async getPortMenuChoice(): Promise<GameAction> {
        // First display current prices like in C code
        console.log('\nComprador\'s Report\n');
        console.log('Taipan, present prices per unit here are');
        console.log(`   Opium: ${this.state?.prices.opium}          Silk: ${this.state?.prices.silk}`);
        console.log(`   Arms: ${this.state?.prices.arms}           General: ${this.state?.prices.general}`);

        while (true) {
            if (this.state?.location === Location.HONG_KONG) {
                const netWorth = (this.state.cash + this.state.bank);
                if (netWorth >= 1000000) {
                    // Hong Kong with >= 1M: Buy, Sell, Visit bank, Transfer cargo, Wheedle Wu, Quit trading, or Retire
                    console.log('Shall I Buy, Sell, Visit bank, Transfer');
                    console.log('cargo, Wheedle Wu, Quit trading, or Retire? ');
                    const choice = (await this.question('')).toUpperCase();
                    switch (choice) {
                        case 'B': return GameAction.BUY;
                        case 'S': return GameAction.SELL;
                        case 'V': return GameAction.BANK;
                        case 'T': return GameAction.WAREHOUSE;
                        case 'W': return GameAction.VISIT_WU;
                        case 'Q': return GameAction.TRAVEL;
                        case 'R': return GameAction.RETIRE;
                    }
                } else {
                    // Hong Kong with < 1M: Buy, Sell, Visit bank, Transfer cargo, Wheedle Wu, or Quit trading
                    console.log('Shall I Buy, Sell, Visit bank, Transfer');
                    console.log('cargo, Wheedle Wu, or Quit trading? ');
                    const choice = (await this.question('')).toUpperCase();
                    switch (choice) {
                        case 'B': return GameAction.BUY;
                        case 'S': return GameAction.SELL;
                        case 'V': return GameAction.BANK;
                        case 'T': return GameAction.WAREHOUSE;
                        case 'W': return GameAction.VISIT_WU;
                        case 'Q': return GameAction.TRAVEL;
                    }
                }
            } else {
                // Other ports: Buy, Sell, or Quit trading only
                console.log('Shall I Buy, Sell, or Quit trading? ');
                const choice = (await this.question('')).toUpperCase();
                switch (choice) {
                    case 'B': return GameAction.BUY;
                    case 'S': return GameAction.SELL;
                    case 'Q': return GameAction.TRAVEL;
                }
            }
        }
    }

    async getTravelDestination(): Promise<Location> {
        console.log('\nDestinations:');
        // Filter out AT_SEA and show only valid ports
        Object.values(Location)
            .filter(loc => loc !== Location.AT_SEA)
            .forEach((loc, index) => {
                console.log(`${index + 1}. ${loc}`);
            });

        const choice = parseInt(await this.question('Choose destination (1-7): '));
        // Adjust index since we filtered out AT_SEA
        const validPorts = Object.values(Location).filter(loc => loc !== Location.AT_SEA);
        return validPorts[choice - 1];
    }

    async confirmQuit(): Promise<boolean> {
        return this.getYesNo('Are you sure you want to quit?');
    }

    async confirmRetire(): Promise<boolean> {
        return this.getYesNo('Are you sure you want to retire?');
    }

    async question(prompt: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(prompt, (answer) => {
                resolve(answer);
            });
        });
    }

    async getNumber(prompt: string): Promise<number> {
        const answer = await this.question(prompt);
        if (answer.toLowerCase() === 'a') {
            return -1; // Special case for 'all' like in original game
        }
        const num = parseInt(answer, 10);
        return isNaN(num) ? 0 : num;
    }

    async getYesNo(prompt: string): Promise<boolean> {
        const answer = await this.question(`${prompt} (y/n): `);
        return answer.toLowerCase().startsWith('y');
    }

    private async waitForKey(): Promise<void> {
        await this.question('Press Enter to continue...');
    }

    async getCashOrGunsChoice(): Promise<InitialGameConditions> {
        console.clear();
        console.log("\n");
        console.log("Do you want to start . . .\n");
        console.log("  1) With cash (and a debt)\n");
        console.log("\n                >> or <<\n");
        console.log("  2) With five guns and no cash");
        console.log("                (But no debt!)\n");
        
        while (true) {
            const choice = await this.question("          ?");
            if (choice === '1') return CASH_START_CONDITIONS;
            if (choice === '2') return GUNS_START_CONDITIONS;
            console.log("Please enter 1 or 2");
        }
    }

    async handleEvent(state: GameState, event: GameEvent): Promise<EventResult> {
        return this.displayEventPrompt(event);
    }
    
    async displayEventOutcome(event: GameEvent, result: EventResult): Promise<void> {
        return this.displayEventResult(event, result);
    }

    async getBattleChoice(): Promise<string> {
        console.log('\nTaipan, what shall we do?');
        console.log('(F)ight, (R)un, or (T)hrow cargo? ');
        
        while (true) {
            const choice = (await this.question('')).toUpperCase();
            if (['F', 'R', 'T'].includes(choice)) {
                return choice;
            }
        }
    }
} 