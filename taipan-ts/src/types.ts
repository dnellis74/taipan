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
    wuBailout: number;  // Number of times Wu has bailed out the player
    enemyHealth: number;
    enemyDamage: number;
    battleProbability: number;  // bp in C code - affects chance of pirate encounters
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
    NONE = '',
    BUY = 'B',
    SELL = 'S',
    BANK = 'V',  // V for Visit bank like original
    WAREHOUSE = 'T',  // T for Transfer cargo like original
    TRAVEL = 'Q',  // Q for Quit port (travel) like original
    VISIT_WU = 'W',  // W for Wheedle Wu like original
    QUIT = 'X',  // X for eXit game (different from Q which was for travel)
    RETIRE = 'R'
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
    MUGGED = 'MUGGED',
    WU_WARNING = 'WU_WARNING',
    WU_BUSINESS = 'WU_BUSINESS'
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
    baseRepairCost?: number; // Base cost for ship repairs from McHenry
    totalRepairCost?: number; // Total cost to repair all damage
    damagePercent?: number; // Current ship damage as percentage
    repairAmount?: number; // Amount player wants to spend on repairs
    wuBraves?: number; // Number of braves Wu sends
    wuLoanAmount?: number; // Amount Wu is willing to loan
    wuRepayAmount?: number; // Amount to be repaid to Wu
    wuPaymentAmount?: number; // Amount player wants to repay
}

// Event interface
export interface GameEvent {
    type: EventType;
    description: string;
    requiresUserInput: boolean;
    data: EventData;
}

export enum ShipCondition {
    CRITICAL = 'Critical',
    POOR = '  Poor',
    FAIR = '  Fair',
    GOOD = '  Good',
    PRIME = ' Prime',
    PERFECT = 'Perfect'
}

export enum Month {
    JAN = 'Jan',
    FEB = 'Feb',
    MAR = 'Mar',
    APR = 'Apr',
    MAY = 'May',
    JUN = 'Jun',
    JUL = 'Jul',
    AUG = 'Aug',
    SEP = 'Sep',
    OCT = 'Oct',
    NOV = 'Nov',
    DEC = 'Dec'
}

// Initial game conditions based on player choice
export interface InitialGameConditions {
    cash: number;
    debt: number;
    hold: number;
    guns: number;
    liYuenStatus: boolean;  // This is 'li' in the C code
    battleProbability: number;  // This is 'bp' in the C code
}

export const CASH_START_CONDITIONS: InitialGameConditions = {
    cash: 400,
    debt: 5000,
    hold: 60,
    guns: 0,
    liYuenStatus: false,  // li = 0
    battleProbability: 10  // bp = 10
};

export const GUNS_START_CONDITIONS: InitialGameConditions = {
    cash: 0,
    debt: 0,
    hold: 10,
    guns: 5,
    liYuenStatus: true,  // li = 1
    battleProbability: 7  // bp = 7
};

export enum BattleResult {
    NOT_FINISHED = 0,
    WON = 1,
    FLED = 2,
    LOST = 3,
    INTERRUPTED = 4
}

export enum BattleOrder {
    NONE = 0,
    FIGHT = 1,
    RUN = 2,
    THROW_CARGO = 3
}

export enum PirateType {
    GENERIC = 1,
    LI_YUEN = 2
} 