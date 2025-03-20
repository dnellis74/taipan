#ifndef UI_H
#define UI_H

#include "game_state.h"
#include <curses.h>

// Initialize the UI system
void ui_init(void);

// Clean up the UI system
void ui_cleanup(void);

// Display functions
void display_splash_intro(void);
void display_port_stats(const GameState* state);
void display_battle_screen(void);
void display_message(const char* message);
void display_prompt(const char* prompt);

// Input functions
int get_single_char(void);
long get_number(int maxlen);
void get_string(char* buffer, int maxlen);

// Utility functions
void format_money(uint32_t amount, char* buffer);
void clear_message_area(void);
void wait_for_key(void);

// Battle UI functions
void draw_ship(int x, int y);
void clear_ship(int x, int y);
void draw_explosion(int x, int y);
void draw_sinking_ship(int x, int y);
void display_battle_stats(int ships, int orders);

#endif // UI_H 