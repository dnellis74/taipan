import { GameState, Location } from '../types';

export interface TravelService {
    calculateDistance(from: Location, to: Location): number;
    calculateTravelCost(from: Location, to: Location): number;
    canTravelTo(state: GameState, destination: Location): boolean;
    travel(state: GameState, destination: Location): void;
}

export class SimpleTravelService implements TravelService {
    private static readonly BASE_COST = 100;  // Base cost per unit of distance
    
    // Distance matrix between ports (simplified)
    private readonly distances: { [key: string]: number } = {
        [`${Location.HONG_KONG}-${Location.SHANGHAI}`]: 2,
        [`${Location.HONG_KONG}-${Location.NAGASAKI}`]: 3,
        [`${Location.HONG_KONG}-${Location.SAIGON}`]: 2,
        [`${Location.HONG_KONG}-${Location.MANILA}`]: 2,
        [`${Location.HONG_KONG}-${Location.SINGAPORE}`]: 3,
        [`${Location.HONG_KONG}-${Location.BATAVIA}`]: 4,
        [`${Location.SHANGHAI}-${Location.NAGASAKI}`]: 1,
        [`${Location.SHANGHAI}-${Location.SAIGON}`]: 4,
        [`${Location.SHANGHAI}-${Location.MANILA}`]: 3,
        [`${Location.SHANGHAI}-${Location.SINGAPORE}`]: 5,
        [`${Location.SHANGHAI}-${Location.BATAVIA}`]: 6,
        [`${Location.NAGASAKI}-${Location.SAIGON}`]: 5,
        [`${Location.NAGASAKI}-${Location.MANILA}`]: 4,
        [`${Location.NAGASAKI}-${Location.SINGAPORE}`]: 6,
        [`${Location.NAGASAKI}-${Location.BATAVIA}`]: 7,
        [`${Location.SAIGON}-${Location.MANILA}`]: 2,
        [`${Location.SAIGON}-${Location.SINGAPORE}`]: 1,
        [`${Location.SAIGON}-${Location.BATAVIA}`]: 2,
        [`${Location.MANILA}-${Location.SINGAPORE}`]: 3,
        [`${Location.MANILA}-${Location.BATAVIA}`]: 4,
        [`${Location.SINGAPORE}-${Location.BATAVIA}`]: 1
    };

    calculateDistance(from: Location, to: Location): number {
        if (from === to) return 0;
        
        // Get distance from matrix, try both directions
        const distance = this.distances[`${from}-${to}`] || this.distances[`${to}-${from}`];
        return distance || 999;  // Return large number if no route found
    }

    calculateTravelCost(from: Location, to: Location): number {
        const distance = this.calculateDistance(from, to);
        return distance * SimpleTravelService.BASE_COST;
    }

    canTravelTo(state: GameState, destination: Location): boolean {
        // Can't travel to current location
        if (state.currentPort === destination) return false;

        // Can't travel with too much damage
        if (state.damage >= 90) return false;

        // Check if player can afford the journey
        const cost = this.calculateTravelCost(state.currentPort, destination);
        return state.cash >= cost;
    }

    travel(state: GameState, destination: Location): void {
        const cost = this.calculateTravelCost(state.currentPort, destination);
        state.cash -= cost;
        state.currentPort = destination;
    }
} 