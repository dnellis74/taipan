import { GameState, Location, CargoType } from '../types';

export interface TradingService {
    getCargoPrice(location: Location, cargo: CargoType): number;
    canBuy(state: GameState, cargo: CargoType, amount: number): boolean;
    canSell(state: GameState, cargo: CargoType, amount: number): boolean;
    buy(state: GameState, cargo: CargoType, amount: number): void;
    sell(state: GameState, cargo: CargoType, amount: number): void;
    getAvailableSpace(state: GameState): number;
    getCargoAmount(state: GameState, cargo: CargoType): number;
}

export class SimpleTradingService implements TradingService {
    // Base prices for each cargo type at each location
    private readonly basePrices: { [key: string]: number } = {
        // Hong Kong prices
        [`${Location.HONG_KONG}-${CargoType.OPIUM}`]: 1000,
        [`${Location.HONG_KONG}-${CargoType.SILK}`]: 100,
        [`${Location.HONG_KONG}-${CargoType.ARMS}`]: 500,
        [`${Location.HONG_KONG}-${CargoType.GENERAL_CARGO}`]: 50,
        
        // Shanghai prices (higher opium prices)
        [`${Location.SHANGHAI}-${CargoType.OPIUM}`]: 2000,
        [`${Location.SHANGHAI}-${CargoType.SILK}`]: 80,
        [`${Location.SHANGHAI}-${CargoType.ARMS}`]: 600,
        [`${Location.SHANGHAI}-${CargoType.GENERAL_CARGO}`]: 40,
        
        // Other ports have similar patterns with variations
        [`${Location.NAGASAKI}-${CargoType.OPIUM}`]: 1800,
        [`${Location.NAGASAKI}-${CargoType.SILK}`]: 120,
        [`${Location.NAGASAKI}-${CargoType.ARMS}`]: 400,
        [`${Location.NAGASAKI}-${CargoType.GENERAL_CARGO}`]: 60,
        
        [`${Location.SAIGON}-${CargoType.OPIUM}`]: 1500,
        [`${Location.SAIGON}-${CargoType.SILK}`]: 90,
        [`${Location.SAIGON}-${CargoType.ARMS}`]: 550,
        [`${Location.SAIGON}-${CargoType.GENERAL_CARGO}`]: 45,
        
        [`${Location.MANILA}-${CargoType.OPIUM}`]: 1600,
        [`${Location.MANILA}-${CargoType.SILK}`]: 110,
        [`${Location.MANILA}-${CargoType.ARMS}`]: 480,
        [`${Location.MANILA}-${CargoType.GENERAL_CARGO}`]: 55,
        
        [`${Location.SINGAPORE}-${CargoType.OPIUM}`]: 1400,
        [`${Location.SINGAPORE}-${CargoType.SILK}`]: 95,
        [`${Location.SINGAPORE}-${CargoType.ARMS}`]: 520,
        [`${Location.SINGAPORE}-${CargoType.GENERAL_CARGO}`]: 48,
        
        [`${Location.BATAVIA}-${CargoType.OPIUM}`]: 1700,
        [`${Location.BATAVIA}-${CargoType.SILK}`]: 105,
        [`${Location.BATAVIA}-${CargoType.ARMS}`]: 490,
        [`${Location.BATAVIA}-${CargoType.GENERAL_CARGO}`]: 52
    };

    getCargoPrice(location: Location, cargo: CargoType): number {
        const basePrice = this.basePrices[`${location}-${cargo}`] || 0;
        
        // Add some random price fluctuation (±20%)
        const fluctuation = 0.8 + (Math.random() * 0.4);
        return Math.floor(basePrice * fluctuation);
    }

    canBuy(state: GameState, cargo: CargoType, amount: number): boolean {
        if (amount <= 0) return false;
        
        // Check available space
        if (amount > this.getAvailableSpace(state)) return false;
        
        // Check if player can afford it
        const totalCost = this.getCargoPrice(state.currentPort, cargo) * amount;
        return state.cash >= totalCost;
    }

    canSell(state: GameState, cargo: CargoType, amount: number): boolean {
        if (amount <= 0) return false;
        return this.getCargoAmount(state, cargo) >= amount;
    }

    buy(state: GameState, cargo: CargoType, amount: number): void {
        if (!this.canBuy(state, cargo, amount)) {
            throw new Error("Cannot buy this amount of cargo");
        }

        const totalCost = this.getCargoPrice(state.currentPort, cargo) * amount;
        state.cash -= totalCost;
        state.hold[cargo] += amount;
    }

    sell(state: GameState, cargo: CargoType, amount: number): void {
        if (!this.canSell(state, cargo, amount)) {
            throw new Error("Cannot sell this amount of cargo");
        }

        const totalPrice = this.getCargoPrice(state.currentPort, cargo) * amount;
        state.cash += totalPrice;
        state.hold[cargo] -= amount;
    }

    getAvailableSpace(state: GameState): number {
        const totalCargo = state.hold.reduce((sum, amount) => sum + amount, 0);
        return state.capacity - totalCargo;
    }

    getCargoAmount(state: GameState, cargo: CargoType): number {
        return state.hold[cargo];
    }
} 