#ifndef GAME_H
#define GAME_H

#include "game_state.h"
#include "events.h"
#include "battle.h"
#include "banking.h"
#include "ui.h"

// Game action types
typedef enum {
    ACTION_NONE,
    ACTION_BUY,
    ACTION_SELL,
    ACTION_BANK,
    ACTION_WAREHOUSE,
    ACTION_TRAVEL,
    ACTION_QUIT,
    ACTION_RETIRE
} GameAction;

// Game initialization options
typedef struct {
    bool debug_mode;
    bool quick_start;
    const char* save_file;
} GameOptions;

// Initialize the game
bool game_init(GameOptions* options);

// Clean up game resources
void game_cleanup(void);

// Main game loop
void game_run(void);

// Process player turn at port
GameAction handle_port_actions(GameState* state);

// Process sailing between ports
bool handle_sea_travel(GameState* state, Location destination);

// Process end of month activities
void handle_month_end(GameState* state);

// Save current game state
bool game_save(const char* filename);

// Load saved game state
bool game_load(const char* filename);

// Check if game is over
bool is_game_over(const GameState* state);

// Calculate final score
uint32_t calculate_score(const GameState* state);

#endif // GAME_H 