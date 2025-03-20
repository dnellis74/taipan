#include "game.h"
#include <stdlib.h>
#include <time.h>

// Game constants
#define STARTING_CASH 1000
#define STARTING_CAPACITY 60
#define MIN_RETIRE_SCORE 1000000
#define MAX_GAME_MONTHS 600  // 50 years

// Global game state
static GameState g_state;
static bool g_game_initialized = false;

bool game_init(GameOptions* options) {
    if (g_game_initialized) {
        return false;
    }
    
    // Initialize random number generator
    srand((unsigned int)time(NULL));
    
    // Initialize UI
    ui_init();
    
    if (options->save_file && game_load(options->save_file)) {
        return true;
    }
    
    // Initialize new game state
    init_game_state(&g_state);
    
    if (options->debug_mode) {
        g_state.cash = 100000;
        g_state.bank = 1000000;
    } else if (options->quick_start) {
        g_state.cash = STARTING_CASH * 10;
    } else {
        g_state.cash = STARTING_CASH;
    }
    
    g_state.capacity = STARTING_CAPACITY;
    
    // Show intro and get player's firm name
    if (!options->quick_start) {
        display_splash_intro();
        get_string(g_state.firm_name, sizeof(g_state.firm_name));
    } else {
        strcpy(g_state.firm_name, "Quick Start Trading Co.");
    }
    
    g_game_initialized = true;
    return true;
}

void game_cleanup(void) {
    if (!g_game_initialized) {
        return;
    }
    
    ui_cleanup();
    g_game_initialized = false;
}

void game_run(void) {
    if (!g_game_initialized) {
        return;
    }
    
    while (!is_game_over(&g_state)) {
        // Display current port status
        display_port_stats(&g_state);
        
        // Handle monthly events if in Hong Kong
        if (g_state.current_port == HONG_KONG) {
            process_monthly_events(&g_state);
        }
        
        // Check for random events
        Event event = check_random_events(&g_state);
        if (event.type != EVENT_NONE) {
            EventResult result;
            
            if (event.requires_action) {
                // Display event and get player response
                result = display_event_prompt(&event);
            } else {
                // Automatically handle event
                switch (event.type) {
                    case EVENT_OPIUM_SEIZED:
                        result = handle_opium_seizure(&g_state);
                        break;
                    case EVENT_STORM_DAMAGE:
                        result = handle_storm_damage(&g_state);
                        break;
                    case EVENT_WAREHOUSE_RAID:
                        result = handle_warehouse_raid(&g_state);
                        break;
                    default:
                        result = EVENT_RESULT_NONE;
                        break;
                }
            }
            
            // Apply event results
            apply_event_result(&g_state, &event, result);
            
            // Display event outcome
            display_event_result(&event, result);
        }
        
        // Handle player actions at port
        GameAction action = handle_port_actions(&g_state);
        
        if (action == ACTION_QUIT) {
            break;
        }
        
        if (action == ACTION_RETIRE && g_state.cash + g_state.bank >= MIN_RETIRE_SCORE) {
            display_retirement_message(calculate_score(&g_state));
            break;
        }
        
        // End of month processing
        if (g_state.current_port == HONG_KONG) {
            handle_month_end(&g_state);
        }
    }
    
    // Game over
    if (is_game_over(&g_state)) {
        display_game_over(calculate_score(&g_state));
    }
}

GameAction handle_port_actions(GameState* state) {
    while (1) {
        int choice = get_port_menu_choice();
        
        switch (choice) {
            case 1:  // Buy
                return ACTION_BUY;
                
            case 2:  // Sell
                return ACTION_SELL;
                
            case 3:  // Visit Bank
                return ACTION_BANK;
                
            case 4:  // Warehouse
                if (state->current_port == HONG_KONG) {
                    return ACTION_WAREHOUSE;
                }
                break;
                
            case 5:  // Travel
                Location dest = get_travel_destination();
                if (handle_sea_travel(state, dest)) {
                    return ACTION_TRAVEL;
                }
                break;
                
            case 6:  // Quit
                if (confirm_quit()) {
                    return ACTION_QUIT;
                }
                break;
                
            case 7:  // Retire
                if (state->cash + state->bank >= MIN_RETIRE_SCORE && confirm_retire()) {
                    return ACTION_RETIRE;
                }
                break;
        }
    }
}

bool handle_sea_travel(GameState* state, Location destination) {
    if (destination == state->current_port) {
        return false;
    }
    
    // Check for pirates based on distance and cargo value
    int pirate_chance = 20 + (get_total_cargo(state) / 1000);
    if (rand() % 100 < pirate_chance) {
        int num_ships = random_range(1, 5);
        BattleResult result = do_sea_battle(state, SHIP_GENERIC, num_ships);
        
        if (result == BATTLE_LOST) {
            return false;
        }
    }
    
    // Made it to destination
    state->current_port = destination;
    return true;
}

void handle_month_end(GameState* state) {
    // Apply bank interest
    bank_apply_interest(state);
    
    // Apply debt interest
    bank_apply_debt_interest(state);
    
    // Reset monthly status
    state->li_yuen_status = 0;
    
    // Increment month
    state->month++;
    if (state->month > 12) {
        state->month = 1;
        state->year++;
    }
    
    // Update enemy difficulty
    update_game_state(state);
}

bool game_save(const char* filename) {
    return save_game_state(&g_state, filename) == 0;
}

bool game_load(const char* filename) {
    return load_game_state(&g_state, filename) == 0;
}

bool is_game_over(const GameState* state) {
    // Game over conditions:
    // 1. Player is broke and in debt
    // 2. Ship is completely damaged
    // 3. Maximum game time reached
    
    if (state->cash == 0 && state->bank == 0 && state->debt > 0) {
        return true;
    }
    
    if (state->damage >= 100) {
        return true;
    }
    
    int total_months = (state->year - 1860) * 12 + state->month;
    if (total_months >= MAX_GAME_MONTHS) {
        return true;
    }
    
    return false;
}

uint32_t calculate_score(const GameState* state) {
    uint32_t score = state->cash + state->bank;
    
    // Subtract debt
    if (state->debt > score) {
        return 0;
    }
    score -= state->debt;
    
    // Add bonus for guns and ship capacity
    score += state->guns * 100;
    score += (state->capacity - STARTING_CAPACITY) * 1000;
    
    // Add bonus for warehouse goods
    for (int i = 0; i < CARGO_TYPES_COUNT; i++) {
        score += state->warehouse[i] * 500;
    }
    
    return score;
} 