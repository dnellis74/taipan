#include "banking.h"
#include <stdlib.h>
#include <string.h>

// Banking system constants
#define BASE_INTEREST_RATE 0.05f          // 5% base interest on deposits
#define BASE_DEBT_INTEREST_RATE 0.10f     // 10% base interest on debt
#define MAX_DEBT_RATIO 2.0f               // Maximum debt-to-cash ratio
#define WU_WARNING_THRESHOLD 10000        // Debt amount that triggers Wu's warning
#define WU_BAILOUT_CHANCE 20             // Percentage chance of Wu offering bailout
#define WU_BAILOUT_RATIO 0.75f           // Percentage of debt Wu will clear
#define MONTHLY_INTEREST_PERIODS 1        // Number of interest calculations per month

// Helper function to check if an amount is valid
static bool is_valid_amount(uint32_t amount) {
    return amount > 0 && amount <= UINT32_MAX / 2;  // Prevent overflow
}

BankResult bank_deposit(GameState* state, uint32_t amount) {
    if (!is_valid_amount(amount)) {
        return BANK_INVALID_AMOUNT;
    }
    
    if (state->cash < amount) {
        return BANK_INSUFFICIENT_FUNDS;
    }
    
    state->cash -= amount;
    state->bank += amount;
    
    return BANK_SUCCESS;
}

BankResult bank_withdraw(GameState* state, uint32_t amount) {
    if (!is_valid_amount(amount)) {
        return BANK_INVALID_AMOUNT;
    }
    
    if (state->bank < amount) {
        return BANK_INSUFFICIENT_FUNDS;
    }
    
    state->bank -= amount;
    state->cash += amount;
    
    return BANK_SUCCESS;
}

BankResult bank_borrow(GameState* state, uint32_t amount) {
    if (!is_valid_amount(amount)) {
        return BANK_INVALID_AMOUNT;
    }
    
    uint32_t max_loan = get_max_loan(state);
    if (amount > max_loan) {
        return BANK_DEBT_TOO_HIGH;
    }
    
    state->debt += amount;
    state->cash += amount;
    
    return BANK_SUCCESS;
}

BankResult bank_repay(GameState* state, uint32_t amount) {
    if (!is_valid_amount(amount)) {
        return BANK_INVALID_AMOUNT;
    }
    
    if (amount > state->cash) {
        return BANK_INSUFFICIENT_FUNDS;
    }
    
    if (amount > state->debt) {
        amount = state->debt;  // Only repay what we owe
    }
    
    state->cash -= amount;
    state->debt -= amount;
    
    return BANK_SUCCESS;
}

void bank_apply_interest(GameState* state) {
    float rate = get_interest_rate(state);
    float monthly_rate = rate / 12.0f;
    
    for (int i = 0; i < MONTHLY_INTEREST_PERIODS; i++) {
        state->bank += (uint32_t)(state->bank * monthly_rate);
    }
}

void bank_apply_debt_interest(GameState* state) {
    float rate = get_debt_interest_rate(state);
    float monthly_rate = rate / 12.0f;
    
    for (int i = 0; i < MONTHLY_INTEREST_PERIODS; i++) {
        state->debt += (uint32_t)(state->debt * monthly_rate);
    }
}

WuResult check_wu_intervention(const GameState* state) {
    // Only check in Hong Kong
    if (state->current_port != HONG_KONG) {
        return WU_NONE;
    }
    
    // First warning when debt is high enough
    if (state->debt >= WU_WARNING_THRESHOLD && !state->wu_warning) {
        return WU_WARNING;
    }
    
    // Chance for bailout if debt is very high
    if (state->debt >= WU_WARNING_THRESHOLD * 2 && !state->wu_bailout) {
        if (rand() % 100 < WU_BAILOUT_CHANCE) {
            return WU_BAILOUT;
        }
        return WU_ANGRY;
    }
    
    // If debt continues to grow after warning
    if (state->wu_warning && state->debt >= WU_WARNING_THRESHOLD * 3) {
        return WU_RETALIATION;
    }
    
    return WU_NONE;
}

BankResult wu_bailout(GameState* state) {
    if (state->wu_bailout || state->debt == 0) {
        return BANK_ERROR;
    }
    
    uint32_t bailout_amount = (uint32_t)(state->debt * WU_BAILOUT_RATIO);
    state->debt -= bailout_amount;
    state->wu_bailout = 1;
    
    return BANK_SUCCESS;
}

uint32_t get_max_loan(const GameState* state) {
    uint32_t total_assets = state->cash + state->bank;
    return (uint32_t)(total_assets * MAX_DEBT_RATIO) - state->debt;
}

float get_interest_rate(const GameState* state) {
    // Interest rate increases with bank balance
    float rate = BASE_INTEREST_RATE;
    if (state->bank > 100000) {
        rate += 0.01f;
    }
    if (state->bank > 1000000) {
        rate += 0.01f;
    }
    return rate;
}

float get_debt_interest_rate(const GameState* state) {
    // Interest rate increases with debt amount
    float rate = BASE_DEBT_INTEREST_RATE;
    if (state->debt > WU_WARNING_THRESHOLD) {
        rate += 0.05f;
    }
    if (state->debt > WU_WARNING_THRESHOLD * 2) {
        rate += 0.05f;
    }
    return rate;
} 