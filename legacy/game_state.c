#include "game_state.h"
#include <string.h>

// Base prices for different cargo types at different locations
static const int base_price[CARGO_TYPES_COUNT][8] = {
    {1000, 11, 16, 15, 14, 12, 10, 13}, // Opium
    {100,  11, 14, 15, 16, 10, 13, 12}, // Silk
    {10,   12, 16, 10, 11, 13, 14, 15}, // Arms
    {1,    10, 11, 12, 13, 14, 15, 16}  // General Cargo
};

void init_game_state(GameState* state) {
    memset(state, 0, sizeof(GameState));
    
    // Set initial values
    state->cash = 0;
    state->bank = 0;
    state->debt = 0;
    state->capacity = 60;
    state->month = 1;
    state->year = 1860;
    state->current_port = HONG_KONG;
    state->enemy_health = 20.0f;
    state->enemy_damage = 0.5f;
    
    // Initialize arrays
    memset(state->hold, 0, sizeof(state->hold));
    memset(state->warehouse, 0, sizeof(state->warehouse));
}

int save_game_state(const GameState* state, const char* filename) {
    FILE* file = fopen(filename, "wb");
    if (!file) {
        return -1;
    }
    
    size_t written = fwrite(state, sizeof(GameState), 1, file);
    fclose(file);
    
    return written == 1 ? 0 : -1;
}

int load_game_state(GameState* state, const char* filename) {
    FILE* file = fopen(filename, "rb");
    if (!file) {
        return -1;
    }
    
    size_t read = fread(state, sizeof(GameState), 1, file);
    fclose(file);
    
    return read == 1 ? 0 : -1;
}

void update_game_state(GameState* state) {
    // Increment month and handle year rollover
    state->month++;
    if (state->month > 12) {
        state->month = 1;
        state->year++;
    }
    
    // Update enemy difficulty over time
    state->enemy_health += 0.5f;
    state->enemy_damage += 0.01f;
} 