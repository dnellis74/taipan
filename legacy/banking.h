#ifndef BANKING_H
#define BANKING_H

#include "game_state.h"

// Banking transaction result codes
typedef enum {
    BANK_SUCCESS,
    BANK_INSUFFICIENT_FUNDS,
    BANK_INVALID_AMOUNT,
    BANK_DEBT_TOO_HIGH,
    BANK_ERROR
} BankResult;

// Wu interaction results
typedef enum {
    WU_NONE,           // No interaction needed
    WU_WARNING,        // First warning about debt
    WU_BAILOUT,        // Wu offers bailout
    WU_ANGRY,          // Wu is angry about unpaid debt
    WU_RETALIATION     // Wu sends his men
} WuResult;

// Banking operation types
typedef enum {
    OPERATION_DEPOSIT,
    OPERATION_WITHDRAW,
    OPERATION_BORROW,
    OPERATION_REPAY
} BankOperation;

// Deposit money into bank account
BankResult bank_deposit(GameState* state, uint32_t amount);

// Withdraw money from bank account
BankResult bank_withdraw(GameState* state, uint32_t amount);

// Borrow money (take a loan)
BankResult bank_borrow(GameState* state, uint32_t amount);

// Repay loan
BankResult bank_repay(GameState* state, uint32_t amount);

// Calculate interest on bank deposits
void bank_apply_interest(GameState* state);

// Calculate compound interest on debt
void bank_apply_debt_interest(GameState* state);

// Check if Elder Brother Wu needs to intervene
WuResult check_wu_intervention(const GameState* state);

// Handle Elder Brother Wu's bailout offer
BankResult wu_bailout(GameState* state);

// Get maximum amount player can borrow
uint32_t get_max_loan(const GameState* state);

// Get current interest rate (as a percentage)
float get_interest_rate(const GameState* state);

// Get current debt interest rate (as a percentage)
float get_debt_interest_rate(const GameState* state);

#endif // BANKING_H 