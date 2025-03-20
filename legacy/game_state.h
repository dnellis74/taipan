#ifndef GAME_STATE_H
#define GAME_STATE_H

#include <stdint.h>

// Game locations
typedef enum {
    AT_SEA,
    HONG_KONG,
    SHANGHAI,
    NAGASAKI,
    SAIGON,
    MANILA,
    SINGAPORE,
    BATAVIA
} Location;

// Cargo types
typedef enum {
    OPIUM,
    SILK,
    ARMS,
    GENERAL_CARGO,
    CARGO_TYPES_COUNT
} CargoType;

// Game state structure
typedef struct {
    char firm_name[23];
    uint32_t cash;
    uint32_t bank;
    uint32_t debt;
    uint32_t booty;
    int hold[CARGO_TYPES_COUNT];
    int warehouse[CARGO_TYPES_COUNT];
    int capacity;
    int guns;
    int damage;
    int month;
    int year;
    int li_yuen_status;
    Location current_port;
    int wu_warning;
    int wu_bailout;
    float enemy_health;
    float enemy_damage;
} GameState;

// Initialize new game state
void init_game_state(GameState* state);

// Save game state
int save_game_state(const GameState* state, const char* filename);

// Load game state
int load_game_state(GameState* state, const char* filename);

// Update game state
void update_game_state(GameState* state);

#endif // GAME_STATE_H 