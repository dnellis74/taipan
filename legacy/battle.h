#ifndef BATTLE_H
#define BATTLE_H

#include "game_state.h"

// Battle result codes
typedef enum {
    BATTLE_NOT_FINISHED,
    BATTLE_WON,
    BATTLE_INTERRUPTED,
    BATTLE_FLED,
    BATTLE_LOST
} BattleResult;

// Enemy ship types
typedef enum {
    SHIP_GENERIC,
    SHIP_LI_YUEN
} ShipType;

// Battle state structure
typedef struct {
    int enemy_ships;          // Number of enemy ships
    int enemy_health;         // Current health of enemy ships
    int player_damage;        // Damage taken by player
    ShipType enemy_type;      // Type of enemy ships
    int turn_count;          // Number of turns in battle
    bool can_flee;           // Whether player can attempt to flee
} BattleState;

// Initialize a new battle
void battle_init(BattleState* battle, ShipType type, int num_ships);

// Process one turn of battle
BattleResult battle_process_turn(GameState* game_state, BattleState* battle);

// Calculate damage dealt to player
int calculate_player_damage(const GameState* state, const BattleState* battle);

// Calculate damage dealt to enemies
int calculate_enemy_damage(const GameState* state, const BattleState* battle);

// Attempt to flee from battle
BattleResult attempt_flee(const GameState* state, BattleState* battle);

// Main battle loop
BattleResult do_sea_battle(GameState* state, ShipType enemy_type, int num_ships);

// Update game state after battle
void battle_aftermath(GameState* state, BattleResult result, const BattleState* battle);

#endif // BATTLE_H 