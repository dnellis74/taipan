import { GameState } from '../types';

export interface BankingService {
    applyInterest(state: GameState): void;
    applyDebtInterest(state: GameState): void;
} 