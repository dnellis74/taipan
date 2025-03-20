import { GameState, Location } from '../types';

export interface TravelService {
    calculateDistance(from: Location, to: Location): number;
    calculateTravelCost(from: Location, to: Location): number;
    canTravelTo(state: GameState, destination: Location): boolean;
    travel(state: GameState, destination: Location): void;
}

export class SimpleTravelService implements TravelService {
    // Distance matrix between ports (for pirate encounter calculations)
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
        return distance || 1;  // Default to 1 if no route found
    }

    calculateTravelCost(from: Location, to: Location): number {
        const distance = this.calculateDistance(from, to);
        return distance * 100;  // Assuming a default cost of 100 per unit of distance
    }

    canTravelTo(state: GameState, destination: Location): boolean {
        // Can't travel to current location
        if (state.location === destination) return false;

        // Can't travel with critical damage
        if (state.damage >= 90) return false;

        return true;
    }

    travel(state: GameState, destination: Location): void {
        // First set location to AT_SEA to allow for pirate encounters
        state.location = Location.AT_SEA;
        
        // The actual destination will be set after sea events are handled
        state.nextDestination = destination;
    }
} 