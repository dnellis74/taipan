// Game locations
export enum Location {
    AT_SEA,
    HONG_KONG,
    SHANGHAI,
    NAGASAKI,
    SAIGON,
    MANILA,
    SINGAPORE,
    BATAVIA
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
    hold: number[];
    warehouse: number[];
    capacity: number;
    guns: number;
    damage: number;
    month: number;
    year: number;
    liYuenStatus: boolean;
    currentPort: Location;
    wuWarning: boolean;
    wuBailout: boolean;
    enemyHealth: number;
    enemyDamage: number;
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
    debugMode: boolean;
    quickStart: boolean;
    saveFile?: string;
}

// Event types
export enum EventType {
    NONE,
    SHIP_OFFER,
    GUN_OFFER,
    OPIUM_SEIZED,
    STORM_DAMAGE,
    PIRATES,
    LI_YUEN,
    PRICE_CHANGE,
    MCHENRY,
    WAREHOUSE_RAID
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
}

// Event interface
export interface GameEvent {
    type: EventType;
    data: EventData;
    requiresAction: boolean;
} 