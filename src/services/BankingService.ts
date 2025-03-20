import { GameState } from '../types';

export class BankingService {
    private static readonly INTEREST_RATE = 0.05;  // 5% monthly interest
    private static readonly DEBT_INTEREST_RATE = 0.1;  // 10% monthly interest on debt

    applyInterest(state: GameState): void {
        const interest = Math.floor(state.bank * BankingService.INTEREST_RATE);
        state.bank += interest;
    }

    applyDebtInterest(state: GameState): void {
        const interest = Math.floor(state.debt * BankingService.DEBT_INTEREST_RATE);
        state.debt += interest;
    }
} 