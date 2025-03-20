import { GameState, GameEvent, EventResult, GameAction, Location } from '../types';

export interface UIService {
    init(): Promise<void>;
    cleanup(): void;
    
    // Display functions
    displaySplashScreen(): Promise<void>;
    displayPortStats(state: GameState): Promise<void>;
    displayEventPrompt(event: GameEvent): Promise<EventResult>;
    displayEventResult(event: GameEvent, result: EventResult): Promise<void>;
    displayRetirementMessage(score: number): Promise<void>;
    displayGameOver(score: number): Promise<void>;
    displayCompradorReport(message: string, waitTime?: number): Promise<void>;
    
    // Input functions
    getFirmName(): Promise<string>;
    getPortMenuChoice(): Promise<GameAction>;
    getTravelDestination(): Promise<Location>;
    confirmQuit(): Promise<boolean>;
    confirmRetire(): Promise<boolean>;
    question(prompt: string): Promise<string>;
    getCashOrGunsChoice(): Promise<'cash' | 'guns'>;
    
    // Event handling
    handleEvent(state: GameState, event: GameEvent): Promise<EventResult>;
    displayEventOutcome(event: GameEvent, result: EventResult): Promise<void>;
} 