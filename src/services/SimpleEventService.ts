import { EventService } from './EventService';
import { GameState, GameEvent, EventResult, EventType } from '../types';

export class SimpleEventService implements EventService {
    async checkRandomEvents(state: GameState): Promise<GameEvent> {
        // Random events with 10% chance each
        if (Math.random() < 0.1) {
            // Ship offer
            return {
                type: EventType.SHIP_OFFER,
                description: "A merchant offers to sell you a larger ship.",
                requiresUserInput: true,
                data: {
                    ship: {
                        price: 5000,
                        newCapacity: state.capacity + 20
                    }
                }
            };
        }
        
        if (Math.random() < 0.1) {
            // Gun offer
            return {
                type: EventType.GUN_OFFER,
                description: "A weapons dealer offers to sell you guns.",
                requiresUserInput: true,
                data: {
                    gun: {
                        price: 1000,
                        numGuns: 2
                    }
                }
            };
        }
        
        if (Math.random() < 0.1) {
            // Pirates
            return {
                type: EventType.PIRATES,
                description: "Pirates spotted!",
                requiresUserInput: true,
                data: {}
            };
        }
        
        return {
            type: EventType.NONE,
            description: "",
            requiresUserInput: false,
            data: {}
        };
    }

    async processMonthlyEvents(state: GameState): Promise<void> {
        // Apply monthly interest
        if (state.bank > 0) {
            state.bank = Math.floor(state.bank * 1.01);  // 1% monthly interest
        }
    }

    async handleAutomaticEvent(state: GameState, event: GameEvent): Promise<EventResult> {
        // Most events require user input, but some could be automatic
        return EventResult.NONE;
    }

    async applyEventResult(state: GameState, event: GameEvent, result: EventResult): Promise<void> {
        switch (event.type) {
            case EventType.SHIP_OFFER:
                if (result === EventResult.ACCEPTED && event.data.ship) {
                    state.cash -= event.data.ship.price;
                    state.capacity = event.data.ship.newCapacity;
                }
                break;
                
            case EventType.GUN_OFFER:
                if (result === EventResult.ACCEPTED && event.data.gun) {
                    state.cash -= event.data.gun.price;
                    state.guns += event.data.gun.numGuns;
                }
                break;
        }
    }

    async updatePrices(state: GameState): Promise<void> {
        // Set initial prices
        state.prices = {
            general: Math.floor(Math.random() * 50) + 50,  // 50-100
            arms: Math.floor(Math.random() * 100) + 100,   // 100-200
            silk: Math.floor(Math.random() * 150) + 150,   // 150-300
            opium: Math.floor(Math.random() * 200) + 200   // 200-400
        };
    }
} 