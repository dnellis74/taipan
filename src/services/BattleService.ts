import { GameState } from '../types';

export class BattleService {
    async doSeaBattle(state: GameState, numShips: number): Promise<boolean> {
        // Simple battle logic - more guns = better chance of winning
        const winChance = (state.guns * 10) / (numShips * state.enemyHealth);
        const damage = Math.floor(Math.random() * 20 * numShips * state.enemyDamage);
        
        state.damage += damage;
        
        return Math.random() < winChance;
    }
} 