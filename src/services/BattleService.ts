import { GameState, BattleResult, BattleOrder, PirateType } from '../types';
import { ConsoleUIService } from './ConsoleUIService';

export class BattleService {
    constructor(private ui: ConsoleUIService) {}

    async doSeaBattle(state: GameState, numShips: number, pirateType: PirateType = PirateType.GENERIC): Promise<BattleResult> {
        // Calculate booty like C code
        const time = ((state.year - 1860) * 12) + state.month;
        state.booty = Math.floor((time / 4 * 1000 * numShips) + Math.random() * 1000 + 250);

        let currentShips = numShips;
        const startingShips = numShips;
        let shipsSunk = 0;
        let shipsFled = 0;

        while (currentShips > 0) {
            // Check ship status
            const status = Math.floor(100 - ((state.damage / state.capacity) * 100));
            if (status <= 0) {
                await this.ui.displayCompradorReport(
                    `Battle summary:\n` +
                    `Ships sunk: ${shipsSunk}\n` +
                    `Ships fled: ${shipsFled}\n` +
                    `Ships remaining: ${currentShips}\n` +
                    `Ship status: LOST - Too much damage!`
                );
                return BattleResult.LOST;  // Ship lost!
            }

            // Get player's order
            const order = await this.getBattleOrder();

            if (order === BattleOrder.FIGHT && state.guns > 0) {
                // Handle fighting
                let shipsDestroyedThisRound = 0;

                // Fire each gun
                for (let i = 0; i < state.guns; i++) {
                    // Calculate damage to enemy ship (like C code's random damage)
                    const damage = Math.floor(Math.random() * 30) + 10;
                    
                    // Each hit has a chance to sink a ship
                    if (Math.random() < damage / 100) {
                        currentShips--;
                        shipsDestroyedThisRound++;
                        shipsSunk++;
                        
                        if (currentShips === 0) break;
                    }
                }

                // Report ships destroyed this round
                if (shipsDestroyedThisRound > 0) {
                    await this.ui.displayCompradorReport(
                        `Sunk ${shipsDestroyedThisRound} of the buggers, Taipan!\n` +
                        `${currentShips} enemy ships remaining.`
                    );
                } else {
                    await this.ui.displayCompradorReport(
                        `Hit 'em, but didn't sink 'em, Taipan!\n` +
                        `${currentShips} enemy ships remaining.`
                    );
                }

                // Chance for some ships to run away (like C code)
                if (startingShips > 0 && Math.random() * startingShips > (currentShips * 0.6 / pirateType) && currentShips > 2) {
                    const divisor = Math.max(1, Math.floor(currentShips / 3 / pirateType));
                    const fleeing = Math.max(1, Math.floor(Math.random() * divisor));
                    currentShips -= fleeing;
                    shipsFled += fleeing;
                    await this.ui.displayCompradorReport(
                        `${fleeing} ships ran away, Taipan!\n` +
                        `${currentShips} enemy ships remaining.`
                    );
                }

                // If all ships destroyed, battle won
                if (currentShips === 0) {
                    await this.ui.displayCompradorReport(
                        `Battle summary:\n` +
                        `Ships sunk: ${shipsSunk}\n` +
                        `Ships fled: ${shipsFled}\n` +
                        `Total defeated: ${startingShips}`
                    );
                    return BattleResult.WON;
                }
            } else if (order === BattleOrder.RUN) {
                // Handle running - escape chance based on guns and enemy ships
                const escapeChance = (state.guns * 10 + 30) / (currentShips * 20);
                if (Math.random() < escapeChance) {
                    await this.ui.displayCompradorReport(
                        `Battle summary:\n` +
                        `Ships sunk: ${shipsSunk}\n` +
                        `Ships fled: ${shipsFled}\n` +
                        `Ships remaining: ${currentShips}`
                    );
                    return BattleResult.FLED;
                }
                
                // Chance to escape from some ships
                if (currentShips > 2 && Math.random() < 0.2) {
                    const escaped = Math.floor(Math.random() * (currentShips / 2)) + 1;
                    currentShips -= escaped;
                    shipsFled += escaped;
                    await this.ui.displayCompradorReport(
                        `We escaped from ${escaped} of 'em!\n` +
                        `${currentShips} enemy ships remaining.`
                    );
                } else {
                    await this.ui.displayCompradorReport("Couldn't lose 'em.");
                }
            } else if (order === BattleOrder.THROW_CARGO) {
                // Handle throwing cargo (increases escape chance)
                const cargoToThrow = Math.min(
                    10,
                    state.inventory.general + 
                    state.inventory.arms + 
                    state.inventory.silk + 
                    state.inventory.opium
                );

                if (cargoToThrow > 0) {
                    // Remove some cargo (prioritize cheaper goods)
                    let remaining = cargoToThrow;
                    if (state.inventory.general > 0) {
                        const amount = Math.min(remaining, state.inventory.general);
                        state.inventory.general -= amount;
                        remaining -= amount;
                    }
                    if (remaining > 0 && state.inventory.arms > 0) {
                        const amount = Math.min(remaining, state.inventory.arms);
                        state.inventory.arms -= amount;
                        remaining -= amount;
                    }
                    if (remaining > 0 && state.inventory.silk > 0) {
                        const amount = Math.min(remaining, state.inventory.silk);
                        state.inventory.silk -= amount;
                        remaining -= amount;
                    }
                    if (remaining > 0 && state.inventory.opium > 0) {
                        const amount = Math.min(remaining, state.inventory.opium);
                        state.inventory.opium -= amount;
                    }

                    // Higher chance to escape after throwing cargo
                    const escapeChance = (state.guns * 10 + 50) / (currentShips * 20);
                    if (Math.random() < escapeChance) {
                        await this.ui.displayCompradorReport(
                            `Battle summary:\n` +
                            `Ships sunk: ${shipsSunk}\n` +
                            `Ships fled: ${shipsFled}\n` +
                            `Ships remaining: ${currentShips}`
                        );
                        return BattleResult.FLED;
                    }
                }
            }

            // Enemy attack phase
            await this.handleEnemyAttack(state, currentShips, pirateType);

            // Check for Li Yuen's intervention (5% chance like C code)
            if (pirateType === PirateType.GENERIC && Math.random() < 0.05) {
                await this.ui.displayCompradorReport(
                    `Battle summary:\n` +
                    `Ships sunk: ${shipsSunk}\n` +
                    `Ships fled: ${shipsFled}\n` +
                    `Ships remaining: ${currentShips}\n` +
                    `Battle interrupted by Li Yuen's fleet!`
                );
                return BattleResult.INTERRUPTED;
            }
        }

        await this.ui.displayCompradorReport(
            `Battle summary:\n` +
            `Ships sunk: ${shipsSunk}\n` +
            `Ships fled: ${shipsFled}\n` +
            `Total defeated: ${startingShips}`
        );
        return BattleResult.WON;
    }

    private async handleEnemyAttack(state: GameState, numShips: number, pirateType: PirateType): Promise<void> {
        // Calculate damage like C code - use fixed scale of 100 for damage percentage
        const maxShips = Math.min(15, numShips);
        
        // Chance to lose a gun if heavily damaged (reduced probability)
        if (state.guns > 0 && 
            ((state.damage >= 50 && Math.random() < 0.2) || 
             (state.damage >= 75 && Math.random() < 0.4))) {
            state.guns--;
            state.cargoSpace += 10;  // Each gun takes 10 cargo space
            await this.ui.displayCompradorReport("The buggers hit a gun, Taipan!!");
        }

        // Apply damage based on number of ships and enemy damage multiplier
        // Scale damage to be between 1-5 per ship, multiplied by type
        const baseDamage = Math.floor(
            (Math.random() * 4 + 1) * maxShips * pirateType * state.enemyDamage
        );
        
        // Add the damage
        state.damage = Math.min(100, state.damage + baseDamage);
        
        // Report damage level
        let damageReport = "We've been hit";
        if (state.damage >= 75) {
            damageReport += " badly";
        } else if (state.damage >= 50) {
            damageReport += " hard";
        }
        damageReport += ", Taipan!!";
        
        await this.ui.displayCompradorReport(damageReport);
    }

    private async getBattleOrder(): Promise<BattleOrder> {
        const choice = await this.ui.getBattleChoice();
        switch (choice.toUpperCase()) {
            case 'F': return BattleOrder.FIGHT;
            case 'R': return BattleOrder.RUN;
            case 'T': return BattleOrder.THROW_CARGO;
            default: return BattleOrder.NONE;
        }
    }
} 