import { GameState, GameEvent, EventResult } from '../types';
import { Location, EventType } from '../types';

export interface EventService {
    checkRandomEvents(state: GameState): Promise<GameEvent>;
    processMonthlyEvents(state: GameState): Promise<void>;
    handleAutomaticEvent(state: GameState, event: GameEvent): Promise<EventResult>;
    applyEventResult(state: GameState, event: GameEvent, result: EventResult): Promise<void>;
    /**
     * Updates the prices of all goods in the game state
     */
    updatePrices(state: GameState): Promise<void>;
}

export class SimpleEventService implements EventService {
    async checkRandomEvents(state: GameState): Promise<GameEvent> {
        // Only check for pirates if at sea
        if (state.location === Location.AT_SEA) {
            // Random hostile ships (based on capacity and guns like original)
            const numShips = Math.floor(Math.random() * ((state.capacity / 10) + state.guns)) + 1;
            return {
                type: EventType.PIRATES,
                description: `${numShips} hostile ships approaching, Taipan!`,
                requiresUserInput: true,
                data: {
                    numShips: numShips
                }
            };
        }

        // Check for Li Yuen extortion in Hong Kong when player has cash
        if (state.location === Location.HONG_KONG && state.cash > 0 && !state.liYuenStatus) {
            const time = ((state.year - 1860) * 12) + state.month;
            let amount = 0;
            
            if (time > 12) {
                // After first year, increase base extortion amount
                const baseAmount = 1000 * time;
                amount = Math.floor(Math.random() * (2 * baseAmount) + baseAmount);
            } else {
                // First year calculation
                amount = Math.floor((state.cash / 1.8) * Math.random());
            }

            return {
                type: EventType.LI_YUEN_EXTORTION,
                description: `Li Yuen asks ${amount} in donation to the temple of Tin Hau, the Sea Goddess.`,
                requiresUserInput: true,
                data: {
                    extortionAmount: amount
                }
            };
        }

        // Check for ship/gun offers (25% chance like original)
        if (Math.random() < 0.25) {
            const time = ((state.year - 1860) * 12) + state.month;
            
            // 50% chance of ship vs gun offer
            if (Math.random() < 0.5) {
                // Ship offer - only if player has enough cash (like original)
                const amount = Math.floor(Math.random() * (1000 * (time + 5) / 6) * (state.capacity / 50) + 1000);
                if (state.cash >= amount) {
                    return {
                        type: EventType.SHIP_OFFER,
                        description: `Do you wish to trade in your ${state.damage > 0 ? 'damaged' : 'fine'}\nship for one with 50 more capacity by\npaying an additional ${amount}, Taipan?`,
                        requiresUserInput: true,
                        data: {
                            ship: {
                                price: amount,
                                newCapacity: state.capacity + 50
                            }
                        }
                    };
                }
            } else if (state.guns < 1000) {
                // Gun offer
                const amount = Math.floor(Math.random() * (1000 * (time + 5) / 6) + 500);
                if (state.cash >= amount && state.cargoSpace >= 10) {
                    return {
                        type: EventType.GUN_OFFER,
                        description: `Do you wish to buy a ship's gun\nfor ${amount}, Taipan?`,
                        requiresUserInput: true,
                        data: {
                            gun: {
                                price: amount,
                                numGuns: 1
                            }
                        }
                    };
                }
            }
        }

        // Check for mugging when player has lots of cash (5% chance)
        if (state.cash > 25000 && Math.random() < 0.05) {
            // Calculate amount stolen: random portion of cash divided by 1.4
            const stolenAmount = Math.floor((state.cash / 1.4) * Math.random());
            
            return {
                type: EventType.MUGGED,
                description: `Bad Joss!!\nYou've been beaten up and robbed of ${stolenAmount} in cash, Taipan!!`,
                requiresUserInput: false,
                data: {
                    moneyLoss: stolenAmount
                }
            };
        }

        return {
            type: EventType.NONE,
            description: '',
            requiresUserInput: false,
            data: {}
        };
    }

    async processMonthlyEvents(state: GameState): Promise<void> {
        // Apply monthly interest
        if (state.bank > 0) {
            state.bank = Math.floor(state.bank * 1.01); // 1% monthly interest
        }
        if (state.debt > 0) {
            state.debt = Math.floor(state.debt * 1.02); // 2% monthly interest
        }
    }

    async handleAutomaticEvent(state: GameState, event: GameEvent): Promise<EventResult> {
        // Handle events that don't require user input
        if (event.type === EventType.MUGGED) {
            return EventResult.LOSS;
        }
        return EventResult.NONE;
    }

    async applyEventResult(state: GameState, event: GameEvent, result: EventResult): Promise<void> {
        if (event.type === EventType.LI_YUEN_EXTORTION && result === EventResult.ACCEPTED) {
            const amount = event.data.extortionAmount || 0;
            if (amount <= state.cash) {
                state.cash -= amount;
                state.liYuenStatus = true;
            } else {
                // If player can't pay, they lose all cash and Li Yuen remains unhappy
                state.cash = 0;
            }
        } else if (event.type === EventType.MUGGED) {
            // Apply the mugging loss
            const amount = event.data.moneyLoss || 0;
            state.cash -= amount;
        } else if (event.type === EventType.SHIP_OFFER && result === EventResult.ACCEPTED) {
            // Handle ship purchase
            const offer = event.data.ship;
            // Only proceed if we have enough cash (like original C code)
            if (offer && state.cash >= offer.price) {
                state.cash -= offer.price;
                state.capacity = offer.newCapacity;
                state.damage = 0;  // Reset damage when getting new ship
                
                // 50% chance of gun offer after ship purchase (like original)
                if (Math.random() < 0.5 && state.guns < 1000) {
                    const time = ((state.year - 1860) * 12) + state.month;
                    const gunAmount = Math.floor(Math.random() * (1000 * (time + 5) / 6) + 500);
                    if (state.cash >= gunAmount && state.cargoSpace >= 10) {
                        // Return a gun offer event
                        throw {
                            type: EventType.GUN_OFFER,
                            description: `Do you wish to buy a ship's gun\nfor ${gunAmount}, Taipan?`,
                            requiresUserInput: true,
                            data: {
                                gun: {
                                    price: gunAmount,
                                    numGuns: 1
                                }
                            }
                        };
                    }
                }
            }
        } else if (event.type === EventType.GUN_OFFER && result === EventResult.ACCEPTED) {
            // Handle gun purchase
            const offer = event.data.gun;
            // Strict check to ensure we have enough cash and space
            if (offer && state.cash >= offer.price && state.cargoSpace >= 10) {
                // Only proceed if we won't go negative
                if (state.cash - offer.price >= 0) {
                    state.cash -= offer.price;
                    state.cargoSpace -= 10;  // Each gun takes 10 cargo space
                    state.guns += offer.numGuns;
                }
            }
        }
    }

    async updatePrices(state: GameState): Promise<void> {
        // Update prices with some random variation
        const variation = () => 0.8 + Math.random() * 0.4; // 80% to 120% of base price
        
        state.prices = {
            general: Math.floor(100 * variation()),  // Base price 100
            arms: Math.floor(200 * variation()),     // Base price 200
            silk: Math.floor(300 * variation()),     // Base price 300
            opium: Math.floor(400 * variation())     // Base price 400
        };
    }
} 