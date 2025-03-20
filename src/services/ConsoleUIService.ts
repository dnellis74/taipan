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
        console.log(`Location: ${Location[state.currentPort]}`);
        console.log(`Date: ${state.month}/1/${state.year}`);
        console.log(`Cash: $${state.cash}`);
        console.log(`Bank: $${state.bank}`);
        console.log(`Debt: $${state.debt}`);
        console.log(`Ship Capacity: ${state.capacity}`);
        console.log(`Guns: ${state.guns}`);
        console.log(`Damage: ${state.damage}%`);
        console.log('\nCargo:');
        Object.keys(CargoType).filter(k => isNaN(Number(k))).forEach((cargo, index) => {
            console.log(`${cargo}: ${state.hold[index]}`);
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
                console.log('Offer accepted.');
                break;
            case EventResult.DECLINED:
                console.log('Offer declined.');
                break;
            case EventResult.FLED:
                console.log('You fled from the encounter.');
                break;
            case EventResult.DAMAGED:
                console.log(`Your ship took ${event.data.damageAmount}% damage!`);
                break;
            case EventResult.LOSS:
                console.log('You suffered losses!');
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
        Object.keys(Location).filter(k => isNaN(Number(k))).forEach((loc, index) => {
            console.log(`${index}. ${loc}`);
        });

        const choice = parseInt(await this.question('Choose destination: '));
        return choice;
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
} 