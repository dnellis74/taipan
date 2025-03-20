#include "events.h"
#include <stdlib.h>
#include <string.h>

// Event probability constants (in percent)
#define SHIP_OFFER_CHANCE 15
#define GUN_OFFER_CHANCE 15
#define OPIUM_SEIZED_CHANCE 10
#define STORM_DAMAGE_CHANCE 20
#define PIRATES_CHANCE 25
#define WAREHOUSE_RAID_CHANCE 5

// Event configuration constants
#define MIN_SHIP_PRICE 5000
#define MAX_SHIP_PRICE 50000
#define MIN_CAPACITY_INCREASE 20
#define MAX_CAPACITY_INCREASE 100

#define MIN_GUN_PRICE 1000
#define MAX_GUN_PRICE 10000
#define MIN_GUNS_OFFERED 5
#define MAX_GUNS_OFFERED 50

#define STORM_DAMAGE_MIN 10
#define STORM_DAMAGE_MAX 40

#define OPIUM_SEIZURE_PERCENT 100  // Seize all opium
#define WAREHOUSE_RAID_PERCENT 50   // Seize half of warehouse goods

// Helper function to generate random number in range
static int random_range(int min, int max) {
    return min + (rand() % (max - min + 1));
}

bool can_event_occur(const GameState* state, EventType type) {
    switch (type) {
        case EVENT_SHIP_OFFER:
            return state->cash >= MIN_SHIP_PRICE;
            
        case EVENT_GUN_OFFER:
            return state->cash >= MIN_GUN_PRICE && state->guns < 1000;
            
        case EVENT_OPIUM_SEIZED:
            return state->hold[OPIUM] > 0 && state->current_port != HONG_KONG;
            
        case EVENT_WAREHOUSE_RAID:
            return state->current_port == HONG_KONG && 
                   (state->warehouse[OPIUM] > 0 || state->warehouse[ARMS] > 0);
            
        case EVENT_MCHENRY:
            return state->current_port == HONG_KONG && state->damage > 0;
            
        case EVENT_LI_YUEN:
            return state->current_port == HONG_KONG && !state->li_yuen_status;
            
        default:
            return true;
    }
}

Event check_random_events(GameState* state) {
    Event event = {EVENT_NONE, {0}, false};
    
    // Roll for each possible event
    int roll = rand() % 100;
    
    if (roll < SHIP_OFFER_CHANCE && can_event_occur(state, EVENT_SHIP_OFFER)) {
        event = generate_ship_offer(state);
    } else if (roll < GUN_OFFER_CHANCE && can_event_occur(state, EVENT_GUN_OFFER)) {
        event = generate_gun_offer(state);
    } else if (roll < OPIUM_SEIZED_CHANCE && can_event_occur(state, EVENT_OPIUM_SEIZED)) {
        event.type = EVENT_OPIUM_SEIZED;
        event.requires_action = false;
    } else if (roll < STORM_DAMAGE_CHANCE) {
        event.type = EVENT_STORM_DAMAGE;
        event.data.damage_amount = random_range(STORM_DAMAGE_MIN, STORM_DAMAGE_MAX);
        event.requires_action = false;
    } else if (roll < PIRATES_CHANCE) {
        event.type = EVENT_PIRATES;
        event.requires_action = true;
    } else if (roll < WAREHOUSE_RAID_CHANCE && can_event_occur(state, EVENT_WAREHOUSE_RAID)) {
        event.type = EVENT_WAREHOUSE_RAID;
        event.requires_action = false;
    }
    
    return event;
}

void process_monthly_events(GameState* state) {
    // Check for Li Yuen in Hong Kong
    if (can_event_occur(state, EVENT_LI_YUEN)) {
        handle_li_yuen_event(state);
    }
    
    // Check for McHenry's repair offer
    if (can_event_occur(state, EVENT_MCHENRY)) {
        handle_mchenry_offer(state);
    }
}

Event generate_ship_offer(const GameState* state) {
    Event event;
    event.type = EVENT_SHIP_OFFER;
    event.requires_action = true;
    
    // Generate ship offer details
    event.data.ship.price = random_range(MIN_SHIP_PRICE, MAX_SHIP_PRICE);
    event.data.ship.new_capacity = state->capacity + 
        random_range(MIN_CAPACITY_INCREASE, MAX_CAPACITY_INCREASE);
    
    return event;
}

Event generate_gun_offer(const GameState* state) {
    Event event;
    event.type = EVENT_GUN_OFFER;
    event.requires_action = true;
    
    // Generate gun offer details
    event.data.gun.num_guns = random_range(MIN_GUNS_OFFERED, MAX_GUNS_OFFERED);
    event.data.gun.price = event.data.gun.num_guns * 
        random_range(MIN_GUN_PRICE/MAX_GUNS_OFFERED, MAX_GUN_PRICE/MAX_GUNS_OFFERED);
    
    return event;
}

EventResult handle_opium_seizure(GameState* state) {
    if (!can_event_occur(state, EVENT_OPIUM_SEIZED)) {
        return EVENT_RESULT_NONE;
    }
    
    // Calculate fine based on amount of opium
    uint32_t fine = state->hold[OPIUM] * 100;  // 100 per unit of opium
    
    // Seize all opium
    state->hold[OPIUM] = 0;
    
    // Apply fine if player can afford it
    if (state->cash >= fine) {
        state->cash -= fine;
    } else {
        state->cash = 0;
    }
    
    return EVENT_RESULT_LOSS;
}

EventResult handle_storm_damage(GameState* state) {
    int damage = random_range(STORM_DAMAGE_MIN, STORM_DAMAGE_MAX);
    state->damage += damage;
    
    // Cap damage at 100
    if (state->damage > 100) {
        state->damage = 100;
    }
    
    return EVENT_RESULT_DAMAGED;
}

EventResult handle_warehouse_raid(GameState* state) {
    if (!can_event_occur(state, EVENT_WAREHOUSE_RAID)) {
        return EVENT_RESULT_NONE;
    }
    
    // Seize half of illegal goods in warehouse
    state->warehouse[OPIUM] /= 2;
    state->warehouse[ARMS] /= 2;
    
    return EVENT_RESULT_LOSS;
}

EventResult handle_mchenry_offer(GameState* state) {
    if (!can_event_occur(state, EVENT_MCHENRY)) {
        return EVENT_RESULT_NONE;
    }
    
    // McHenry charges based on damage
    uint32_t repair_cost = (uint32_t)(state->damage * 100);
    
    if (state->cash >= repair_cost) {
        state->cash -= repair_cost;
        state->damage = 0;
        return EVENT_RESULT_ACCEPTED;
    }
    
    return EVENT_RESULT_DECLINED;
}

EventResult handle_li_yuen_event(GameState* state) {
    if (!can_event_occur(state, EVENT_LI_YUEN)) {
        return EVENT_RESULT_NONE;
    }
    
    // Li Yuen demands 10% of cash
    uint32_t protection = state->cash / 10;
    
    if (state->cash >= protection) {
        state->cash -= protection;
        state->li_yuen_status = 1;  // Protected for this month
        return EVENT_RESULT_ACCEPTED;
    }
    
    return EVENT_RESULT_DECLINED;
}

void apply_event_result(GameState* state, const Event* event, EventResult result) {
    switch (event->type) {
        case EVENT_SHIP_OFFER:
            if (result == EVENT_RESULT_ACCEPTED) {
                state->cash -= event->data.ship.price;
                state->capacity = event->data.ship.new_capacity;
            }
            break;
            
        case EVENT_GUN_OFFER:
            if (result == EVENT_RESULT_ACCEPTED) {
                state->cash -= event->data.gun.price;
                state->guns += event->data.gun.num_guns;
            }
            break;
            
        case EVENT_PIRATES:
            if (result == EVENT_RESULT_FLED) {
                state->damage += random_range(5, 15);  // Take some damage while fleeing
            }
            break;
            
        default:
            break;
    }
} 