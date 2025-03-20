// Game locations
export enum Location {
    AT_SEA = 'At sea',
    HONG_KONG = 'Hong Kong',
    SHANGHAI = 'Shanghai',
    NAGASAKI = 'Nagasaki',
    SAIGON = 'Saigon',
    MANILA = 'Manila',
    SINGAPORE = 'Singapore',
    BATAVIA = 'Batavia'
}

// Cargo types
export enum CargoType {
    OPIUM,
    SILK,
    ARMS,
    GENERAL_CARGO
}

// Game state interface
export interface GameState {
    firmName: string;
    cash: number;
    bank: number;
    debt: number;
    booty: number;
    hold: number;  // Total cargo hold capacity
    cargoSpace: number;  // Current available cargo space
    warehouse: number[];
    capacity: number;
    guns: number;
    damage: number;
    location: Location;
    nextDestination: Location | null;  // Destination port during sea travel
    month: number;
    year: number;
    liYuenStatus: boolean;
    wuWarning: boolean;
    wuBailout: boolean;
    enemyHealth: number;
    enemyDamage: number;
    prices: {
        general: number;
        arms: number;
        silk: number;
        opium: number;
    };
    inventory: {
        general: number;
        arms: number;
        silk: number;
        opium: number;
    };
}

// Game actions
export enum GameAction {
    NONE = 0,
    BUY = 1,
    SELL = 2,
    BANK = 3,
    WAREHOUSE = 4,
    TRAVEL = 5,
    QUIT = 6,
    RETIRE = 7
}

// Game options
export interface GameOptions {
    debugMode?: boolean;
    quickStart?: boolean;
    saveFile?: string;
}

// Event types
export enum EventType {
    NONE = 'NONE',
    PIRATES = 'PIRATES',
    LI_YUEN = 'LI_YUEN',
    LI_YUEN_EXTORTION = 'LI_YUEN_EXTORTION',
    OPIUM_SEIZED = 'OPIUM_SEIZED',
    WAREHOUSE_RAID = 'WAREHOUSE_RAID',
    SHIP_OFFER = 'SHIP_OFFER',
    GUN_OFFER = 'GUN_OFFER',
    STORM_DAMAGE = 'STORM_DAMAGE',
    PRICE_CHANGE = 'PRICE_CHANGE',
    MCHENRY = 'MCHENRY',
    MUGGED = 'MUGGED'
}

// Event result codes
export enum EventResult {
    NONE,
    ACCEPTED,
    DECLINED,
    FLED,
    DAMAGED,
    LOSS
}

// Ship offer details
export interface ShipOffer {
    price: number;
    newCapacity: number;
}

// Gun offer details
export interface GunOffer {
    price: number;
    numGuns: number;
}

// Event data type
export type EventData = {
    ship?: ShipOffer;
    gun?: GunOffer;
    moneyLoss?: number;
    damageAmount?: number;
    numShips?: number;  // Number of pirate ships in an encounter
    extortionAmount?: number; // Amount Li Yuen demands as donation
}

// Event interface
export interface GameEvent {
    type: EventType;
    description: string;
    requiresUserInput: boolean;
    data: EventData;
} 