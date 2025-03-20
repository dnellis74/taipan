import { GameState, Location, CargoType } from '../types';
import { UIService } from './UIService';

export class TradingService {
    constructor(private ui: UIService) {}

    // Base prices for each cargo type at each port, matching original game's base_price array
    private readonly baseMultipliers = {
        [CargoType.OPIUM]: 1000,
        [CargoType.SILK]: 100,
        [CargoType.ARMS]: 10,
        [CargoType.GENERAL_CARGO]: 1
    };

    private readonly portModifiers: Record<Location, Record<CargoType, number>> = {
        [Location.AT_SEA]: {
            [CargoType.OPIUM]: 0,
            [CargoType.SILK]: 0,
            [CargoType.ARMS]: 0,
            [CargoType.GENERAL_CARGO]: 0
        },
        [Location.HONG_KONG]: {
            [CargoType.OPIUM]: 11,
            [CargoType.SILK]: 11,
            [CargoType.ARMS]: 12,
            [CargoType.GENERAL_CARGO]: 10
        },
        [Location.SHANGHAI]: {
            [CargoType.OPIUM]: 16,
            [CargoType.SILK]: 14,
            [CargoType.ARMS]: 16,
            [CargoType.GENERAL_CARGO]: 11
        },
        [Location.NAGASAKI]: {
            [CargoType.OPIUM]: 15,
            [CargoType.SILK]: 15,
            [CargoType.ARMS]: 10,
            [CargoType.GENERAL_CARGO]: 12
        },
        [Location.SAIGON]: {
            [CargoType.OPIUM]: 14,
            [CargoType.SILK]: 16,
            [CargoType.ARMS]: 11,
            [CargoType.GENERAL_CARGO]: 13
        },
        [Location.MANILA]: {
            [CargoType.OPIUM]: 12,
            [CargoType.SILK]: 10,
            [CargoType.ARMS]: 13,
            [CargoType.GENERAL_CARGO]: 14
        },
        [Location.SINGAPORE]: {
            [CargoType.OPIUM]: 10,
            [CargoType.SILK]: 13,
            [CargoType.ARMS]: 14,
            [CargoType.GENERAL_CARGO]: 15
        },
        [Location.BATAVIA]: {
            [CargoType.OPIUM]: 13,
            [CargoType.SILK]: 12,
            [CargoType.ARMS]: 15,
            [CargoType.GENERAL_CARGO]: 16
        }
    };

    getCargoPrice(location: Location, cargoType: CargoType): number {
        // Match original game's price calculation:
        // price = (port_modifier / 2) * (random 1-3) * base_multiplier
        const portModifier = this.portModifiers[location][cargoType];
        const randomMultiplier = Math.floor(Math.random() * 3) + 1;
        const baseMultiplier = this.baseMultipliers[cargoType];
        
        return Math.floor((portModifier / 2) * randomMultiplier * baseMultiplier);
    }

    getCargoAmount(state: GameState, cargoType: CargoType): number {
        switch(cargoType) {
            case CargoType.OPIUM: return state.inventory.opium;
            case CargoType.SILK: return state.inventory.silk;
            case CargoType.ARMS: return state.inventory.arms;
            case CargoType.GENERAL_CARGO: return state.inventory.general;
            default: return 0;
        }
    }

    canBuy(state: GameState, cargoType: CargoType, amount: number): boolean {
        // Get price from state instead of generating new one
        const price = this.getCargoStateProp(cargoType);
        const totalCost = state.prices[price] * amount;
        
        // Check if player has enough money and cargo space
        return state.cash >= totalCost && state.cargoSpace >= amount;
    }

    canSell(state: GameState, cargoType: CargoType, amount: number): boolean {
        return this.getCargoAmount(state, cargoType) >= amount;
    }

    buy(state: GameState, cargoType: CargoType, amount: number): void {
        if (!this.canBuy(state, cargoType, amount)) {
            return;
        }

        // Get price from state instead of generating new one
        const price = this.getCargoStateProp(cargoType);
        const totalCost = state.prices[price] * amount;

        // Update state
        state.cash -= totalCost;
        state.cargoSpace -= amount;
        
        switch(cargoType) {
            case CargoType.OPIUM: state.inventory.opium += amount; break;
            case CargoType.SILK: state.inventory.silk += amount; break;
            case CargoType.ARMS: state.inventory.arms += amount; break;
            case CargoType.GENERAL_CARGO: state.inventory.general += amount; break;
        }
    }

    sell(state: GameState, cargoType: CargoType, amount: number): void {
        if (!this.canSell(state, cargoType, amount)) {
            return;
        }

        const price = this.getCargoPrice(state.location, cargoType);
        const totalValue = price * amount;

        // Update state
        state.cash += totalValue;
        state.cargoSpace += amount;
        
        switch(cargoType) {
            case CargoType.OPIUM: state.inventory.opium -= amount; break;
            case CargoType.SILK: state.inventory.silk -= amount; break;
            case CargoType.ARMS: state.inventory.arms -= amount; break;
            case CargoType.GENERAL_CARGO: state.inventory.general -= amount; break;
        }
    }

    getAvailableSpace(state: GameState): number {
        const totalCargo = state.inventory.general + 
                          state.inventory.arms + 
                          state.inventory.silk + 
                          state.inventory.opium;
        return state.capacity - totalCargo;
    }

    // Helper to convert CargoType to state property name
    private getCargoStateProp(cargo: CargoType): keyof GameState['prices'] {
        switch(cargo) {
            case CargoType.OPIUM: return 'opium';
            case CargoType.SILK: return 'silk';
            case CargoType.ARMS: return 'arms';
            case CargoType.GENERAL_CARGO: return 'general';
        }
    }

    async updatePrices(state: GameState, isNewPort: boolean): Promise<void> {
        if (isNewPort) {
            // Set initial prices for the new port using base prices and port modifiers
            Object.values(CargoType).filter(cargo => typeof cargo === 'number').forEach(cargo => {
                const cargoType = cargo as CargoType;
                const price = this.getCargoPrice(state.location, cargoType);
                const stateProp = this.getCargoStateProp(cargoType);
                state.prices[stateProp] = price;
            });
        } else {
            // Random chance for price changes (1/9 chance like original)
            if (Math.random() < 0.11) {
                // Pick a random cargo type
                const cargoTypes = [CargoType.OPIUM, CargoType.SILK, CargoType.ARMS, CargoType.GENERAL_CARGO];
                const randomCargo = cargoTypes[Math.floor(Math.random() * cargoTypes.length)];
                
                // 50% chance of increase vs decrease
                const isIncrease = Math.random() < 0.5;
                
                // Get current price
                const currentPrice = this.getCargoPrice(state.location, randomCargo);
                
                // Update the price in state based on cargo type
                const stateProp = this.getCargoStateProp(randomCargo);
                
                if (isIncrease) {
                    // Increase by 5x to 10x (rand()%5 + 5 in original)
                    const multiplier = Math.floor(Math.random() * 5) + 5;
                    const newPrice = currentPrice * multiplier;
                    state.prices[stateProp] = newPrice;
                    
                    await this.ui.displayCompradorReport(
                        `Taipan!! The price of ${CargoType[randomCargo].toLowerCase()}\nhas risen to ${newPrice}!!`,
                        3000
                    );
                } else {
                    // Drop to 1/5th of current price
                    const newPrice = Math.floor(currentPrice / 5);
                    state.prices[stateProp] = newPrice;
                    
                    await this.ui.displayCompradorReport(
                        `Taipan!! The price of ${CargoType[randomCargo].toLowerCase()}\nhas dropped to ${newPrice}!!`,
                        3000
                    );
                }
            }
        }
    }
} 