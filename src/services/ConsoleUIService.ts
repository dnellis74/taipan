import { UIService } from './UIService';
import { GameState, GameEvent, EventResult, GameAction, Location, CargoType, EventType } from '../types';
import * as readline from 'readline';

export class ConsoleUIService implements UIService {
    private rl: readline.Interface;

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
        console.clear();
        console.log(`=== ${state.firmName} ===`);
        console.log(`Location: ${state.location}`);
        console.log(`Date: ${state.month}/1/${state.year}`);
        console.log(`Cash: $${state.cash}`);
        console.log(`Bank: $${state.bank}`);
        console.log(`Debt: $${state.debt}`);
        console.log(`Ship Capacity: ${state.capacity}`);
        console.log(`Guns: ${state.guns}`);
        console.log(`Damage: ${state.damage}%`);
        console.log('\nCargo:');
        Object.entries(state.inventory).forEach(([cargo, amount]) => {
            console.log(`${cargo}: ${amount}`);
        });
        console.log('');
    }

    async displayEventPrompt(event: GameEvent): Promise<EventResult> {
        console.log('\n=== Event ===');
        switch (event.type) {
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
                if (event.type === EventType.LI_YUEN_EXTORTION) {
                    console.log('Li Yuen is pleased with your donation.');
                } else {
                    console.log('Offer accepted.');
                }
                break;
            case EventResult.DECLINED:
                if (event.type === EventType.LI_YUEN_EXTORTION) {
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
        console.log('\nActions:');
        console.log('1. Buy');
        console.log('2. Sell');
        console.log('3. Bank');
        console.log('4. Warehouse');
        console.log('5. Travel');
        console.log('6. Quit');
        console.log('7. Retire');

        const choice = parseInt(await this.question('Choose action (1-7): '));
        return choice;
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
        return new Promise(resolve => {
            this.rl.question(prompt, answer => {
                resolve(answer);
            });
        });
    }

    private async getYesNo(prompt: string): Promise<boolean> {
        const answer = await this.question(`${prompt} (y/n): `);
        return answer.toLowerCase().startsWith('y');
    }

    private async waitForKey(): Promise<void> {
        await this.question('Press Enter to continue...');
    }

    async getCashOrGunsChoice(): Promise<'cash' | 'guns'> {
        console.clear();
        console.log("\n");
        console.log("Do you want to start . . .\n");
        console.log("  1) With cash (and a debt)\n");
        console.log("\n                >> or <<\n");
        console.log("  2) With five guns and no cash");
        console.log("                (But no debt!)\n");
        
        while (true) {
            const choice = await this.question("          ?");
            if (choice === '1') return 'cash';
            if (choice === '2') return 'guns';
            console.log("Please enter 1 or 2");
        }
    }

    async handleEvent(state: GameState, event: GameEvent): Promise<EventResult> {
        return this.displayEventPrompt(event);
    }
    
    async displayEventOutcome(event: GameEvent, result: EventResult): Promise<void> {
        return this.displayEventResult(event, result);
    }
} 