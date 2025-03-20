#include "battle.h"
#include "ui.h"
#include <stdlib.h>
#include <time.h>

// Constants for battle mechanics
#define BASE_ENEMY_HEALTH 20
#define BASE_ENEMY_DAMAGE 0.5f
#define GUNS_DAMAGE_MULTIPLIER 0.1f
#define FLEE_CHANCE_PERCENT 40
#define DAMAGE_RANDOMNESS 0.2f

void battle_init(BattleState* battle, ShipType type, int num_ships) {
    battle->enemy_ships = num_ships;
    battle->enemy_type = type;
    battle->enemy_health = num_ships * BASE_ENEMY_HEALTH;
    battle->player_damage = 0;
    battle->turn_count = 0;
    battle->can_flee = true;
}

int calculate_player_damage(const GameState* state, const BattleState* battle) {
    float base_damage = state->enemy_damage * battle->enemy_ships;
    float random_factor = 1.0f + ((float)(rand() % 100) / 100.0f - 0.5f) * DAMAGE_RANDOMNESS;
    
    // Li Yuen's ships deal more damage
    if (battle->enemy_type == SHIP_LI_YUEN) {
        base_damage *= 1.5f;
    }
    
    return (int)(base_damage * random_factor);
}

int calculate_enemy_damage(const GameState* state, const BattleState* battle) {
    float gun_power = state->guns * GUNS_DAMAGE_MULTIPLIER;
    float random_factor = 1.0f + ((float)(rand() % 100) / 100.0f - 0.5f) * DAMAGE_RANDOMNESS;
    
    return (int)(gun_power * random_factor);
}

BattleResult attempt_flee(const GameState* state, BattleState* battle) {
    if (!battle->can_flee) {
        return BATTLE_NOT_FINISHED;
    }
    
    // Chance to flee decreases with more enemy ships
    int flee_chance = FLEE_CHANCE_PERCENT - (battle->enemy_ships * 2);
    if (flee_chance < 10) flee_chance = 10;
    
    if (rand() % 100 < flee_chance) {
        return BATTLE_FLED;
    }
    
    battle->can_flee = false;  // Can only attempt to flee once
    return BATTLE_NOT_FINISHED;
}

BattleResult battle_process_turn(GameState* state, BattleState* battle) {
    battle->turn_count++;
    
    // Player takes damage
    int damage_taken = calculate_player_damage(state, battle);
    battle->player_damage += damage_taken;
    
    // Check if player's ship is destroyed
    if (battle->player_damage >= 100) {
        return BATTLE_LOST;
    }
    
    // Enemy takes damage
    int damage_dealt = calculate_enemy_damage(state, battle);
    battle->enemy_health -= damage_dealt;
    
    // Calculate how many ships were destroyed
    int ships_destroyed = (BASE_ENEMY_HEALTH * battle->enemy_ships - battle->enemy_health) / BASE_ENEMY_HEALTH;
    if (ships_destroyed > battle->enemy_ships) {
        ships_destroyed = battle->enemy_ships;
    }
    battle->enemy_ships -= ships_destroyed;
    
    // Check if all enemy ships are destroyed
    if (battle->enemy_ships <= 0) {
        return BATTLE_WON;
    }
    
    return BATTLE_NOT_FINISHED;
}

BattleResult do_sea_battle(GameState* state, ShipType enemy_type, int num_ships) {
    BattleState battle;
    battle_init(&battle, enemy_type, num_ships);
    
    // Initialize battle display
    display_battle_screen();
    
    while (1) {
        // Display current battle state
        display_battle_stats(battle.enemy_ships, battle.turn_count);
        
        // Get player input
        int cmd = get_single_char();
        
        BattleResult result;
        
        switch (cmd) {
            case 'f':
            case 'F':
                result = attempt_flee(state, &battle);
                if (result != BATTLE_NOT_FINISHED) {
                    battle_aftermath(state, result, &battle);
                    return result;
                }
                break;
                
            case 'q':
            case 'Q':
                battle_aftermath(state, BATTLE_INTERRUPTED, &battle);
                return BATTLE_INTERRUPTED;
                
            case ' ':  // Fight
                result = battle_process_turn(state, &battle);
                if (result != BATTLE_NOT_FINISHED) {
                    battle_aftermath(state, result, &battle);
                    return result;
                }
                break;
        }
        
        // Update battle display
        draw_ship(10, 5);  // Example coordinates
    }
}

void battle_aftermath(GameState* state, BattleResult result, const BattleState* battle) {
    // Update game state based on battle result
    switch (result) {
        case BATTLE_WON:
            // Calculate and award booty
            state->booty += battle->enemy_ships * 1000;
            state->cash += state->booty;
            break;
            
        case BATTLE_LOST:
            // Player loses all cargo and most money
            memset(state->hold, 0, sizeof(state->hold));
            state->cash /= 2;  // Lose half of cash
            break;
            
        case BATTLE_FLED:
            // Take some damage but keep cargo
            state->damage += battle->player_damage / 2;
            break;
            
        default:
            break;
    }
    
    // Always take some damage from the battle
    state->damage += battle->player_damage / 4;
    
    // Ensure damage doesn't exceed 100%
    if (state->damage > 100) {
        state->damage = 100;
    }
} 