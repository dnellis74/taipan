#ifndef TRADING_H
#define TRADING_H

#include "game_state.h"

// Trading result codes
typedef enum {
    TRADE_SUCCESS,
    TRADE_INSUFFICIENT_FUNDS,
    TRADE_INSUFFICIENT_CARGO,
    TRADE_INSUFFICIENT_SPACE,
    TRADE_INVALID_AMOUNT,
    TRADE_ERROR
} TradeResult;

// Get current price for a cargo type at current location
uint32_t get_cargo_price(const GameState* state, CargoType cargo);

// Update prices based on current location and events
void update_prices(GameState* state);

// Buy cargo
TradeResult buy_cargo(GameState* state, CargoType cargo, int amount);

// Sell cargo
TradeResult sell_cargo(GameState* state, CargoType cargo, int amount);

// Transfer cargo between hold and warehouse
TradeResult transfer_to_warehouse(GameState* state, CargoType cargo, int amount);
TradeResult transfer_from_warehouse(GameState* state, CargoType cargo, int amount);

// Check if ship is overloaded
bool is_ship_overloaded(const GameState* state);

// Get total cargo weight
int get_total_cargo(const GameState* state);

// Display current prices
void display_prices(const GameState* state);

#endif // TRADING_H 