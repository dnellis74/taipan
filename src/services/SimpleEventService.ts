import { EventService } from './EventService';
import { GameState, GameEvent, EventResult, EventType } from '../types';

export class SimpleEventService implements EventService {
    checkRandomEvents(state: GameState): GameEvent {
        const roll = Math.random() * 100;
        
        if (roll < 5) {  // 5% chance of ship offer
            return {
                type: EventType.SHIP_OFFER,
                data: {
                    ship: {
                        price: state.capacity * 1000,
                        newCapacity: state.capacity + 20
                    }
                },
                requiresAction: true
            };
        }
        
        if (roll < 10) {  // 5% chance of gun offer
            return {
                type: EventType.GUN_OFFER,
                data: {
                    gun: {
                        price: 1000,
                        numGuns: 2
                    }
                },
                requiresAction: true
            };
        }
        
        if (roll < 15) {  // 5% chance of pirates
            return {
                type: EventType.PIRATES,
                data: {},
                requiresAction: true
            };
        }
        
        return { type: EventType.NONE, data: {}, requiresAction: false };
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

    applyEventResult(state: GameState, event: GameEvent, result: EventResult): void {
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
} 