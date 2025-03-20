#ifndef EVENTS_H
#define EVENTS_H

#include "game_state.h"

// Event types
typedef enum {
    EVENT_NONE,
    EVENT_SHIP_OFFER,         // Offer to buy a bigger ship
    EVENT_GUN_OFFER,         // Offer to buy more guns
    EVENT_OPIUM_SEIZED,      // Officials seize opium cargo
    EVENT_STORM_DAMAGE,      // Ship takes damage from storm
    EVENT_PIRATES,           // Pirate attack
    EVENT_LI_YUEN,          // Li Yuen demands protection money
    EVENT_PRICE_CHANGE,      // Sudden change in commodity prices
    EVENT_MCHENRY,          // McHenry offers ship repairs
    EVENT_WAREHOUSE_RAID     // Officials raid warehouse
} EventType;

// Event result codes
typedef enum {
    EVENT_RESULT_NONE,
    EVENT_RESULT_ACCEPTED,   // Player accepted event offer
    EVENT_RESULT_DECLINED,   // Player declined event offer
    EVENT_RESULT_FLED,      // Player fled from event
    EVENT_RESULT_DAMAGED,    // Event caused damage
    EVENT_RESULT_LOSS       // Event caused loss of goods/money
} EventResult;

// Ship offer details
typedef struct {
    uint32_t price;
    int new_capacity;
} ShipOffer;

// Gun offer details
typedef struct {
    uint32_t price;
    int num_guns;
} GunOffer;

// Event data union
typedef union {
    ShipOffer ship;
    GunOffer gun;
    uint32_t money_loss;
    int damage_amount;
} EventData;

// Event structure
typedef struct {
    EventType type;
    EventData data;
    bool requires_action;    // Whether the event needs player response
} Event;

// Check for and generate random events
Event check_random_events(GameState* state);

// Process monthly events (called at start of each month)
void process_monthly_events(GameState* state);

// Handle Li Yuen's protection money event
EventResult handle_li_yuen_event(GameState* state);

// Generate ship purchase offer
Event generate_ship_offer(const GameState* state);

// Generate gun purchase offer
Event generate_gun_offer(const GameState* state);

// Handle opium seizure event
EventResult handle_opium_seizure(GameState* state);

// Handle storm damage event
EventResult handle_storm_damage(GameState* state);

// Handle warehouse raid event
EventResult handle_warehouse_raid(GameState* state);

// Handle McHenry's repair offer
EventResult handle_mchenry_offer(GameState* state);

// Apply the result of an event to the game state
void apply_event_result(GameState* state, const Event* event, EventResult result);

// Check if an event can occur in the current game state
bool can_event_occur(const GameState* state, EventType type);

#endif // EVENTS_H 