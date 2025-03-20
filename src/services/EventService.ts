import { GameState, GameEvent, EventResult } from '../types';
import { Location, EventType } from '../types';

export class EventService {
    async checkRandomEvents(state: GameState): Promise<GameEvent> {
        // Check for Wu warning in Hong Kong when debt is high
        if (state.location === Location.HONG_KONG && state.debt >= 10000 && !state.wuWarning) {
            const braves = Math.floor(Math.random() * 50) + 50; // 50-100 braves
            return {
                type: EventType.WU_WARNING,
                description: `Elder Brother Wu has sent ${braves} braves to escort you to the Wu mansion, Taipan.`,
                requiresUserInput: false,
                data: {
                    wuBraves: braves
                }
            };
        }

        // Check for Wu bailout when player is broke
        if (state.location === Location.HONG_KONG && 
            state.cash === 0 && 
            state.bank === 0 && 
            state.guns === 0 &&
            Object.values(state.inventory).every(amount => amount === 0)) {
            
            const loanAmount = Math.floor(Math.random() * 1000) + 500; // 500-1500
            const repayAmount = Math.floor(Math.random() * 2000 * (state.wuBailout + 1)) + 1500;
            
            return {
                type: EventType.WU_BUSINESS,
                description: `Elder Brother is aware of your plight, Taipan. He is willing to loan you an additional ${loanAmount} if you will pay back ${repayAmount}.`,
                requiresUserInput: true,
                data: {
                    wuLoanAmount: loanAmount,
                    wuRepayAmount: repayAmount
                }
            };
        }

        // Check for McHenry in Hong Kong when ship is damaged
        if (state.location === Location.HONG_KONG && state.damage > 0) {
            const time = ((state.year - 1860) * 12) + state.month;
            const baseRepairCost = Math.floor(((60 * (time + 3) / 4) * Math.random() + 25 * (time + 3) / 4) * state.capacity / 50);
            const totalRepairCost = baseRepairCost * state.damage + 1;
            const damagePercent = Math.floor((state.damage / state.capacity) * 100);
            
            return {
                type: EventType.MCHENRY,
                description: `McHenry from the Hong Kong Shipyards has arrived! He says, "I see ye've a wee bit of damage to yer ship. Will ye be wanting repairs? 'Tis a pity to be ${damagePercent}% damaged. We can fix yer whole ship for ${totalRepairCost}, or make partial repairs if you wish."`,
                requiresUserInput: true,
                data: {
                    baseRepairCost,
                    totalRepairCost,
                    damagePercent
                }
            };
        }

        // Only check for pirates if at sea
        if (state.location === Location.AT_SEA) {
            // Calculate hostile ships like C code: (capacity/50 + guns/4 + 3) * random(0.5 to 1.5)
            const baseShips = Math.floor(state.capacity/50 + state.guns/4 + 3);
            const randomMultiplier = 0.5 + Math.random();
            const numShips = Math.max(1, Math.floor(baseShips * randomMultiplier));
            
            return {
                type: EventType.PIRATES,
                description: `${numShips} hostile ships approaching, Taipan!`,
                requiresUserInput: true,
                data: {
                    numShips: numShips
                }
            };
        }

        // Check for Li Yuen extortion in Hong Kong when player has cash
        if (state.location === Location.HONG_KONG && state.cash > 0 && !state.liYuenStatus) {
            const time = ((state.year - 1860) * 12) + state.month;
            let amount = 0;
            
            if (time > 12) {
                // After first year, increase base extortion amount
                const baseAmount = 1000 * time;
                amount = Math.floor(Math.random() * (2 * baseAmount) + baseAmount);
            } else {
                // First year calculation
                amount = Math.floor((state.cash / 1.8) * Math.random());
            }

            return {
                type: EventType.LI_YUEN_EXTORTION,
                description: `Li Yuen asks ${amount} in donation to the temple of Tin Hau, the Sea Goddess.`,
                requiresUserInput: true,
                data: {
                    extortionAmount: amount
                }
            };
        }

        // Check for ship/gun offers (25% chance like original)
        if (Math.random() < 0.25) {
            const time = ((state.year - 1860) * 12) + state.month;
            
            // 50% chance of ship vs gun offer
            if (Math.random() < 0.5) {
                // Ship offer - only if player has enough cash (like original)
                const amount = Math.floor(Math.random() * (1000 * (time + 5) / 6) * (state.capacity / 50) + 1000);
                if (state.cash >= amount) {
                    return {
                        type: EventType.SHIP_OFFER,
                        description: `Do you wish to trade in your ${state.damage > 0 ? 'damaged' : 'fine'}\nship for one with 50 more capacity by\npaying an additional ${amount}, Taipan?`,
                        requiresUserInput: true,
                        data: {
                            ship: {
                                price: amount,
                                newCapacity: state.capacity + 50
                            }
                        }
                    };
                }
            } else if (state.guns < 1000) {
                // Gun offer
                const amount = Math.floor(Math.random() * (1000 * (time + 5) / 6) + 500);
                if (state.cash >= amount && state.cargoSpace >= 10) {
                    return {
                        type: EventType.GUN_OFFER,
                        description: `Do you wish to buy a ship's gun\nfor ${amount}, Taipan?`,
                        requiresUserInput: true,
                        data: {
                            gun: {
                                price: amount,
                                numGuns: 1
                            }
                        }
                    };
                }
            }
        }

        // Check for mugging when player has lots of cash (5% chance)
        if (state.cash > 25000 && Math.random() < 0.05) {
            // Calculate amount stolen: random portion of cash divided by 1.4
            const stolenAmount = Math.floor((state.cash / 1.4) * Math.random());
            
            return {
                type: EventType.MUGGED,
                description: `Bad Joss!!\nYou've been beaten up and robbed of ${stolenAmount} in cash, Taipan!!`,
                requiresUserInput: false,
                data: {
                    moneyLoss: stolenAmount
                }
            };
        }

        return {
            type: EventType.NONE,
            description: '',
            requiresUserInput: false,
            data: {}
        };
    }

    async processMonthlyEvents(state: GameState): Promise<void> {
        // Advance month
        state.month++;
        
        // Handle year transition
        if (state.month === 13) {
            state.month = 1;
            state.year++;
            
            // Increase enemy difficulty each year (like original)
            state.enemyHealth += 10;
            state.enemyDamage += 0.5;
        }

        // Apply monthly interest (10% on debt, 0.5% on bank like original)
        if (state.bank > 0) {
            state.bank = Math.floor(state.bank * 1.005); // 0.5% monthly interest
        }
        if (state.debt > 0) {
            state.debt = Math.floor(state.debt * 1.1); // 10% monthly interest
        }
    }

    async handleAutomaticEvent(state: GameState, event: GameEvent): Promise<EventResult> {
        // Handle events that don't require user input
        if (event.type === EventType.MUGGED) {
            return EventResult.LOSS;
        }
        return EventResult.NONE;
    }

    async applyEventResult(state: GameState, event: GameEvent, result: EventResult): Promise<void> {
        if (event.type === EventType.WU_WARNING) {
            state.wuWarning = true;
        } else if (event.type === EventType.WU_BUSINESS && result === EventResult.ACCEPTED) {
            if (event.data.wuLoanAmount && event.data.wuRepayAmount) {
                // Handle bailout loan
                state.cash += event.data.wuLoanAmount;
                state.debt += event.data.wuRepayAmount;
                state.wuBailout++;
            } else if (event.data.wuPaymentAmount) {
                // Handle debt repayment
                const payment = Math.min(event.data.wuPaymentAmount, state.debt);
                if (payment <= state.cash) {
                    state.cash -= payment;
                    state.debt -= payment;
                }
            }
        } else if (event.type === EventType.MCHENRY && result === EventResult.ACCEPTED) {
            const amount = event.data.repairAmount || 0;
            const baseRepairCost = event.data.baseRepairCost || 0;
            
            if (amount <= state.cash) {
                state.cash -= amount;
                // Calculate how much damage is repaired based on amount spent
                const repairAmount = Math.floor((amount / baseRepairCost) + 0.5);
                state.damage = Math.max(0, state.damage - repairAmount);
            } else {
                // If player can't pay, no repairs are made
                state.cash = 0;
            }
        } else if (event.type === EventType.LI_YUEN_EXTORTION && result === EventResult.ACCEPTED) {
            const amount = event.data.extortionAmount || 0;
            if (amount <= state.cash) {
                state.cash -= amount;
                state.liYuenStatus = true;
            } else {
                // If player can't pay, they lose all cash and Li Yuen remains unhappy
                state.cash = 0;
            }
        } else if (event.type === EventType.MUGGED) {
            // Apply the mugging loss
            const amount = event.data.moneyLoss || 0;
            state.cash -= amount;
        } else if (event.type === EventType.SHIP_OFFER && result === EventResult.ACCEPTED) {
            // Handle ship purchase
            const offer = event.data.ship;
            // Only proceed if we have enough cash (like original C code)
            if (offer && state.cash >= offer.price) {
                state.cash -= offer.price;
                state.capacity = offer.newCapacity;
                state.damage = 0;  // Reset damage when getting new ship
                
                // 50% chance of gun offer after ship purchase (like original)
                if (Math.random() < 0.5 && state.guns < 1000) {
                    const time = ((state.year - 1860) * 12) + state.month;
                    const gunAmount = Math.floor(Math.random() * (1000 * (time + 5) / 6) + 500);
                    if (state.cash >= gunAmount && state.cargoSpace >= 10) {
                        // Return a gun offer event
                        throw {
                            type: EventType.GUN_OFFER,
                            description: `Do you wish to buy a ship's gun\nfor ${gunAmount}, Taipan?`,
                            requiresUserInput: true,
                            data: {
                                gun: {
                                    price: gunAmount,
                                    numGuns: 1
                                }
                            }
                        };
                    }
                }
            }
        } else if (event.type === EventType.GUN_OFFER && result === EventResult.ACCEPTED) {
            // Handle gun purchase
            const offer = event.data.gun;
            // Strict check to ensure we have enough cash and space
            if (offer && state.cash >= offer.price && state.cargoSpace >= 10) {
                // Only proceed if we won't go negative
                if (state.cash - offer.price >= 0) {
                    state.cash -= offer.price;
                    state.cargoSpace -= 10;  // Each gun takes 10 cargo space
                    state.guns += offer.numGuns;
                }
            }
        }
    }
} 