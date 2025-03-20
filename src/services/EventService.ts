import { GameState, GameEvent, EventResult } from '../types';

export interface EventService {
    checkRandomEvents(state: GameState): GameEvent;
    processMonthlyEvents(state: GameState): Promise<void>;
    handleAutomaticEvent(state: GameState, event: GameEvent): Promise<EventResult>;
    applyEventResult(state: GameState, event: GameEvent, result: EventResult): void;
} 