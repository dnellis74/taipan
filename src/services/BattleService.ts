import { GameState } from '../types';

export interface BattleService {
    doSeaBattle(state: GameState, numShips: number): Promise<boolean>;
} 