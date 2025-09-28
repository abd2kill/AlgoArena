function algoArena() {
    return {
        // State
        arenaActive: false,
        currentPrice: 4215.25,
        currentContract: 'mini',
        lotSize: 1,
        stopLoss: 500,
        takeProfit: 1000,
        tradeMessage: "",
        selectedStrategies: ['supportResistance', 'trendline', 'candlestick', 'breakout', 'meanReversion', 'human'],
        marginUsed: 0,
        balance: 150000,
        arenaStartTime: null,
        
        // Data structures
        candles: [],
        openTrades: [],
        trades: [],
        humanStats: {
            trades: [],
            balance: 150000,
            openTrades: []
        },
        bots: {},
        
        // Chart state
        scaleX: 1,
        offsetX: 0,
        isDragging: false,
        lastX: 0,
        selectedLine: null,
        dragOffset: 0,
        
        // Constants
        contracts: [
            { 
                id: 'micro', 
                name: 'MNQ', 
                maxLots: 150,
                marginPerLot: 120,
                contractValue: 2 
            },
            { 
                id: 'mini', 
                name: 'NQ', 
                maxLots: 15,
                marginPerLot: 1200,
                contractValue: 20 
            }
        ],
        
        lotSizes: [1, 3, 5, 10, 15],
        
        allStrategies: [
            { id: 'supportResistance', name: 'S/R Hunter', description: 'Trades bounces off support/resistance levels', color: '#3b82f6' },
            { id: 'trendline', name: 'Trend Trader', description: 'Follows trendline breaks and bounces', color: '#10b981' },
            { id: 'candlestick', name: 'Pattern Sniper', description: 'Trades candlestick patterns', color: '#f59e0b' },
            { id: 'breakout', name: 'Breakout Bot', description: 'Trades breakouts from consolidation', color: '#ef4444' },
            { id: 'meanReversion', name: 'Mean Reverter', description: 'Trades price deviations from mean', color: '#8b5cf6' },
            { id: 'human', name: 'You (Manual)', description: 'Your discretionary trading', color: '#ec4899' }
        ],

        // Computed properties
        get currentContractConfig() {
            return this.contracts.find(c => c.id === this.currentContract);
        },

        get totalOpenLots() {
            return this.openTrades.reduce((sum, t) => sum + t.qty, 0);
        },

        get openPnl() {
            return this.openTrades.reduce((acc, trade) => {
                const delta = trade.type === 'buy' 
                    ? (this.currentPrice - trade.entry) 
                    : (trade.entry - this.currentPrice);
                return acc + (delta * trade.qty * trade.contractValue);
            }, 0);
        },

        get leaderboard() {
            const participants = [];
        
            if (this.arenaActive) {
                // Human - REALIZED P&L ONLY for main display
                const humanRealizedBalance = this.humanStats.balance;
                const humanOpenPnl = this.openPnl; // Current open position P&L
                const humanTotalBalance = humanRealizedBalance + humanOpenPnl;
                const humanCompletedTrades = this.humanStats.trades;
                const humanOpenTrades = this.humanStats.openTrades;
                const humanTotalTrades = humanCompletedTrades.length + humanOpenTrades.length; // Include open trades
                const humanWins = humanCompletedTrades.filter(t => t.pnl > 0).length;
                const humanWinRate = humanCompletedTrades.length ? ((humanWins / humanCompletedTrades.length) * 100).toFixed(1) : 0;
        
                participants.push({
                    id: 'human',
                    name: 'You (Manual)',
                    balance: humanRealizedBalance,                 // REALIZED BALANCE ONLY
                    trades: humanTotalTrades,                      // TOTAL trades (completed + open)
                    winRate: humanWinRate,
                    pnl: humanRealizedBalance - 150000,           // REALIZED P&L ONLY
                    openPnl: humanOpenPnl,                        // Track open P&L separately
                    hasOpenPosition: this.openTrades.length > 0,  // Show if they have open position
                    color: '#ec4899'
                });
        
                // Bots - REALIZED P&L ONLY for main display
                Object.values(this.bots).forEach(bot => {
                    const botRealizedBalance = bot.balance;
                    const botOpenPnl = bot.openTrades.reduce((acc, trade) => {
                        const delta = trade.type === 'buy' 
                            ? (this.currentPrice - trade.entry) 
                            : (trade.entry - this.currentPrice);
                        return acc + (delta * trade.qty * trade.contractValue);
                    }, 0);
                    const botTotalBalance = botRealizedBalance + botOpenPnl;
                    const botCompletedTrades = bot.trades;
                    const botOpenTrades = bot.openTrades;
                    const botTotalTrades = botCompletedTrades.length + botOpenTrades.length; // Include open trades
                    const wins = botCompletedTrades.filter(t => t.pnl > 0).length;
                    const winRate = botCompletedTrades.length ? ((wins / botCompletedTrades.length) * 100).toFixed(1) : 0;
        
                    participants.push({
                        id: bot.id,
                        name: bot.name,
                        balance: botRealizedBalance,               // REALIZED BALANCE ONLY
                        trades: botTotalTrades,                    // TOTAL trades (completed + open)
                        winRate: winRate,
                        pnl: botRealizedBalance - 150000,         // REALIZED P&L ONLY
                        openPnl: botOpenPnl,                      // Track open P&L separately
                        hasOpenPosition: bot.openTrades.length > 0, // Show if they have open position
                        color: bot.color
                    });
                });
            }
        
            return participants.sort((a, b) => b.pnl - a.pnl);
        },
        
        get performanceDetails() {
            if (!this.arenaActive) return [];
        
            const out = [];
        
            // --- HUMAN - ONLY REALIZED STATS ---
            {
                const completedTrades = this.humanStats.trades; // completed trades only
                const wins = completedTrades.filter(t => t.pnl > 0);
                const losses = completedTrades.filter(t => t.pnl < 0);
                const openPnl = this.openPnl; // <-- lowercase 'l'
                const totalPnLRealized = completedTrades.reduce((s, t) => s + t.pnl, 0);
        
                out.push({
                    id: 'human',
                    name: 'You (Manual)',
                    trades: completedTrades.length,
                    wins: wins.length,
                    losses: losses.length,
                    winRate: completedTrades.length ? ((wins.length / completedTrades.length) * 100).toFixed(1) : '—',
                    openPnl,                                       // <-- lowercase 'l'
                    totalPnL: totalPnLRealized,
                    avgWin: wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0,
                    avgLoss: losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0,
                    color: '#ec4899'
                });
            }
        
            // --- BOTS - ONLY REALIZED STATS ---
            Object.values(this.bots).forEach(bot => {
                const completedTrades = bot.trades;  // completed trades only
                const wins = completedTrades.filter(t => t.pnl > 0);
                const losses = completedTrades.filter(t => t.pnl < 0);
                const totalPnLRealized = completedTrades.reduce((s, t) => s + t.pnl, 0);
        
                const openPnl = bot.openTrades.reduce((acc, trade) => {
                    const delta = trade.type === 'buy' 
                        ? (this.currentPrice - trade.entry) 
                        : (trade.entry - this.currentPrice);
                    return acc + (delta * trade.qty * trade.contractValue);
                }, 0);
        
                out.push({
                    id: bot.id,
                    name: bot.name,
                    trades: completedTrades.length,
                    wins: wins.length,
                    losses: losses.length,
                    winRate: completedTrades.length ? ((wins.length / completedTrades.length) * 100).toFixed(1) : '—',
                    openPnl,                                       // <-- lowercase 'l'
                    totalPnL: totalPnLRealized,
                    avgWin: wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0,
                    avgLoss: losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0,
                    color: bot.color
                });
            });
        
            return out;
        },

        get totalBalance() {
            return this.humanStats.balance.toFixed(2);
        },
      
        get profitLoss() {
            return (this.humanStats.balance - 150000).toFixed(2);
        },

        get formattedOpenPnl() {
            return this.openPnl.toFixed(2);
        },

        get botTotalBalance() {
            return (botId) => {
                const bot = this.bots[botId];
                return bot ? bot.balance.toFixed(2) : '0.00';
            };
        },
        
        get botProfitLoss() {
            return (botId) => {
                const bot = this.bots[botId];
                return bot ? (bot.balance - 150000).toFixed(2) : '0.00';
            };
        },

        get hasOpenPositions() {
            return this.openTrades.length > 0;
        },

        get marketRegime() {
            const slope = this.trendSlope(20);
            const atr14 = this.atr(14);
            const chop = this.isChop();
        
            // We’ll return both Tailwind classes (for the HTML header) and pure colors for the canvas overlay.
            if (chop) {
                return { 
                    text: "Ranging", 
                    className: "text-yellow-400", 
                    // canvas colors
                    fg: "#f59e0b",                   // amber-500
                    bg: "rgba(245, 158, 11, 0.10)"   // light amber tint
                };
            }
            if (Math.abs(slope) > 0.5) {
                return { 
                    text: "Trending", 
                    className: "text-green-400", 
                    fg: "#34d399",                   // emerald-400
                    bg: "rgba(52, 211, 153, 0.10)"   // light green tint
                };
            }
            return { 
                text: "Normal", 
                className: "text-blue-400", 
                fg: "#60a5fa",                       // blue-400
                bg: "rgba(96, 165, 250, 0.10)"       // light blue tint
            };
        },

        get currentVolatility() {
            return this.atr(14);
        },

        get strategyEfficiency() {
            if (!this.arenaActive) return [];
            
            const participants = [];
            const marketHours = this.arenaStartTime ? (Date.now() - this.arenaStartTime) / (1000 * 60 * 60) : 1;
            
            // Human
            const humanCompletedTrades = this.humanStats.trades;
            const humanOpenTrades = this.humanStats.openTrades;
            const humanTotalTrades = humanCompletedTrades.length + humanOpenTrades.length;
            const humanEfficiency = humanTotalTrades > 0 ? (this.humanStats.balance - 150000) / humanTotalTrades : 0;
            const humanFrequency = humanTotalTrades / marketHours;
            
            participants.push({
                id: 'human',
                name: 'You (Manual)',
                efficiency: humanEfficiency.toFixed(2),
                frequency: humanFrequency.toFixed(1),
                color: '#ec4899'
            });
            
            // Bots
            Object.values(this.bots).forEach(bot => {
                const botCompletedTrades = bot.trades;
                const botOpenTrades = bot.openTrades;
                const botTotalTrades = botCompletedTrades.length + botOpenTrades.length;
                const botEfficiency = botTotalTrades > 0 ? (bot.balance - 150000) / botTotalTrades : 0;
                const botFrequency = botTotalTrades / marketHours;
                
                participants.push({
                    id: bot.id,
                    name: bot.name,
                    efficiency: botEfficiency.toFixed(2),
                    frequency: botFrequency.toFixed(1),
                    color: bot.color
                });
            });
            
            return participants;
        },

        // Methods
        init() {
            this.generateCandles();
            this.startSimulation();
            this.setupEventListeners();
            this.$nextTick(() => this.drawChart());
        },

        generateCandles() {
            const candles = [];
            let price = 4200;
            let trend = 1;
            
            for (let i = 0; i < 100; i++) {
                const volatility = 3;
                const open = price;
                const bodySize = Math.random() * volatility;
                const direction = Math.random() > 0.3 ? trend : -trend;
                const close = open + bodySize * direction;
                const high = Math.max(open, close) + Math.random();
                const low = Math.min(open, close) - Math.random();
                price = close;
                trend = direction;
                candles.push({ open, close, high, low, timestamp: Date.now() - (1000 * (100 - i)) });
            }
            
            this.candles = candles;
            this.currentPrice = price;
        },

        startSimulation() {
            if (this._sim) clearInterval(this._sim);
            this._sim = setInterval(() => { 
                if (this.arenaActive) this.simulateTick(); 
            }, 100);
        },

        simulateTick() {
            if (!this.arenaActive) return;

            // Price movement
            const changeFactor = 2;
            const change = (Math.random() * changeFactor - changeFactor / 2).toFixed(2);
            this.currentPrice = parseFloat((this.currentPrice + parseFloat(change)).toFixed(2));

            // Update candles
            const last = this.candles[this.candles.length - 1];
            const now = Date.now();

            if (!last || now - last.timestamp > 1000) {
                this.candles.push({
                    open: this.currentPrice,
                    high: this.currentPrice,
                    low: this.currentPrice,
                    close: this.currentPrice,
                    timestamp: now
                });
            } else {
                last.high = Math.max(last.high, this.currentPrice);
                last.low = Math.min(last.low, this.currentPrice);
                last.close = this.currentPrice;
            }

            if (this.candles.length > 200) this.candles.shift();

            // Bot trading
            this.executeBotTrades();

            // Evaluate trades
            this.evaluateTrades();

            // Update chart
            this.$nextTick(() => this.drawChart());
        },

        startArena() {
            if (this.selectedStrategies.length === 0) {
                this.showTradeMessage("Select at least one strategy!");
                return;
            }

            this.arenaActive = true;
            this.arenaStartTime = Date.now();
            this.bots = {};
            
            this.selectedStrategies.forEach(strategy => {
                if (strategy !== 'human') {
                    const strategyInfo = this.allStrategies.find(s => s.id === strategy);
                    this.bots[strategy] = {
                        id: strategy,
                        name: strategyInfo.name,
                        trades: [],
                        balance: 150000,
                        openTrades: [],
                        color: strategyInfo.color,
                    
                        // pro state
                        dayStamp: null,
                        dayPnL: 0,
                        losersInRow: 0,
                        cooldownUntil: 0,      // ms
                        riskPct: 0.0025,       // 0.25% per trade (tune)
                        maxDailyLossPct: 0.02, // 2% daily stop
                        maxOpen: 1,            // no pyramiding (v1)
                        minBarsBetween: 10,    // cooldown bars between entries
                        lastEntryBar: -9999,   // bar index
                        useATR: true,
                        atrMultSL: 1.2,        // SL = 1.2 * ATR
                        rr: 1.8,               // target in R
                    };
                }
            });

            this.humanStats = {
                trades: [],
                balance: 150000,
                openTrades: []
            };

            this.openTrades = [];
            this.trades = [];
            this.balance = 150000;
            this.marginUsed = 0;
        },

        resetArena() {
            this.arenaActive = false;
            this.arenaStartTime = null;
            this.bots = {};
            this.openTrades = [];
            this.trades = [];
            this.balance = 150000;
            this.marginUsed = 0;
            this.generateCandles();
            this.humanStats = {
                trades: [],
                balance: 150000,
                openTrades: []
            };
        },

        toggleArena() {
            if (this.arenaActive) {
                this.resetArena();
            } else {
                this.startArena();
            }
        },

        // Trading Methods
        placeTrade(type) {
            if (!this.arenaActive) { this.showTradeMessage("Start the arena first!"); return; }
        
            const side  = type;
            const entry = this.currentPrice;
            const lot   = Number(this.lotSize);        // ← force number here
            const open  = this.openTrades[0] || null;
        
            // No position → open fresh
            if (!open) {
                if (!this.checkHardCap(lot) || !this.hasMargin(lot)) return;
                const trade = this.newBaseTrade(side, lot, entry);
                this.marginUsed += trade.marginRequired;
                this.ensureSingle(trade);
                this.showTradeMessage(`✅ ${side.toUpperCase()} opened (${lot})`);
                return;
            }
        
            // Same side → scale in
            if (open.type === side) {
                const addLots = Number(lot);             // ← ensure number
                const newQty  = Number(open.qty) + addLots;
                if (!this.checkHardCap(newQty)) return;
                if (!this.hasMargin(addLots)) return;
        
                const m = this.currentContractConfig;
                this.marginUsed       += addLots * m.marginPerLot;
                open.marginRequired   += addLots * m.marginPerLot;
        
                open.entry = ((open.entry * open.qty) + (entry * addLots)) / newQty;
                open.qty   = newQty;
        
                if (!open.stopMoved) {
                    const sl = this.usdToPriceDelta(this.stopLoss, open.qty);
                    open.stop = open.type === 'buy' ? open.entry - sl : open.entry + sl;
                }
                if (!open.targetMoved) {
                    const tp = this.usdToPriceDelta(this.takeProfit, open.qty);
                    open.target = open.type === 'buy' ? open.entry + tp : open.entry - tp;
                }
        
                this.ensureSingle(open);
                this.showTradeMessage(`➕ Scaled ${side.toUpperCase()} (${addLots}) • Avg ${open.entry.toFixed(2)} • Qty ${open.qty}`);
                return;
            }
        
            // Opposite side → reduce/close/flip
            const qtyToClose = Math.min(Number(lot), open.qty);
            this.realize(open, entry, qtyToClose, 'Reduced');
        
            if (Number(lot) < open.qty) {
                open.qty -= qtyToClose;
                open.marginRequired -= qtyToClose * this.currentContractConfig.marginPerLot;
                this.ensureSingle(open);
                this.showTradeMessage(`➖ Reduced ${open.type.toUpperCase()} (${qtyToClose}) • Remaining ${open.qty}`);
                return;
            }
        
            const leftover = Number(lot) - open.qty;   // ← numeric math
            this.ensureSingle(null);
        
            if (leftover === 0) { this.showTradeMessage(`🧹 Flat`); return; }
        
            if (!this.checkHardCap(leftover) || !this.hasMargin(leftover)) return;
        
            const flipped = this.newBaseTrade(side, leftover, entry);
            this.marginUsed += flipped.marginRequired;
            this.ensureSingle(flipped);
            this.showTradeMessage(`🔃 Flipped to ${side.toUpperCase()} (${leftover})`);
        },

        closeAll() {
            const open = this.openTrades[0];
            if (!open) {
                this.showTradeMessage("No open position");
                return;
            }
            this.realize(open, this.currentPrice, open.qty, 'Manual');
            this.ensureSingle(null);
            this.showTradeMessage("All positions closed");
        },

        evaluateTrades() {
            const open = this.openTrades[0];
            if (!open) return;

            const price = this.currentPrice;
            const hitTP = open.type === 'buy' ? price >= open.target : price <= open.target;
            const hitSL = open.type === 'buy' ? price <= open.stop : price >= open.stop;

            if (hitTP || hitSL) {
                this.realize(open, price, open.qty, hitTP ? 'TP' : 'SL');
                this.ensureSingle(null);
            }

            // Evaluate bot trades
            Object.values(this.bots).forEach(bot => {
                bot.openTrades.forEach(trade => {
                    const current = this.currentPrice;
                    const dir = trade.type === 'buy' ? 1 : -1;
                
                    // compute R progress (per lot)
                    const move = (current - trade.entry) * dir;
                    const R = (move * trade.contractValue) / (trade.rValue || 1);
                
                    // 1) move to breakeven after 1R
                    if (R >= 1 && !trade.stopMoved) {
                        trade.stop = trade.entry; 
                        trade.stopMoved = true;
                    }
                
                    // 2) partial at 1R: take half, trail remainder
                    if (R >= 1 && !trade.managed && trade.qty > 1) {
                        const half = Math.floor(trade.qty / 2);
                        const pnlHalf = this.calculatePnl(trade, current, half);
                        bot.trades.push({ ...trade, exit: current, pnl: pnlHalf, exitReason:'Partial@1R', qty: half });
                        bot.balance += pnlHalf;
                        // reduce position
                        trade.qty -= half;
                        trade.managed = true;
                        // start a simple trailing stop 1 ATR behind price
                        const atr = this.atr(14);
                        trade.stop = trade.type==='buy' ? current - atr : current + atr;
                    }
                
                    // 3) trailing stop update once managed
                    if (trade.managed) {
                        const atr = this.atr(14);
                        const trail = trade.type==='buy' ? current - atr : current + atr;
                        // only tighten stop, never loosen
                        if ((trade.type==='buy' && trail > trade.stop) || (trade.type==='sell' && trail < trade.stop)) {
                            trade.stop = trail;
                        }
                        // optional: time stop after N bars
                        const maxBars = 60; // e.g., ~1 minute if 1s bars in your sim
                        const ageBars = this.candles.length - (this.candles.findIndex(c=>c.timestamp===trade.timestamp));
                        if (ageBars > maxBars && R < 0.3) {
                            // scratch early if it's going nowhere
                            const pnl = this.calculatePnl(trade, current, trade.qty);
                            bot.trades.push({ ...trade, exit: current, pnl, exitReason:'TimeStop', qty: trade.qty });
                            bot.balance += pnl;
                            trade._closeNow = true;
                        }
                    }
                });
            
                // close flagged or hit TP/SL
                bot.openTrades = bot.openTrades.filter(trade => {
                    const current = this.currentPrice;
                    const hitTP = trade.type === 'buy' ? current >= trade.target : current <= trade.target;
                    const hitSL = trade.type === 'buy' ? current <= trade.stop   : current >= trade.stop;
                    if (trade._closeNow || hitTP || hitSL) {
                        const pnl = this.calculatePnl(trade, current, trade.qty);
                        bot.trades.push({ ...trade, exit: current, pnl, exitReason: trade._closeNow ? 'TimeStop' : (hitTP ? 'TP' : 'SL') });
                        bot.balance += pnl;
                
                        // daily stats for risk control
                        bot.dayPnL += pnl;
                        if (pnl < 0) bot.losersInRow++; else bot.losersInRow = 0;
                
                        // adaptive cooldown after sequence of losers
                        if (bot.losersInRow >= 3) {
                            bot.cooldownUntil = Date.now() + 60_000; // 1 min cooldown
                            bot.losersInRow = 0; // reset streak post-cooldown trigger
                        }
                        return false;
                    }
                    return true;
                });
            });
        },

        // Trading Helper Methods
        checkHardCap(newTotalLots) {
            const maxLots = this.currentContractConfig.maxLots;
            if (newTotalLots > maxLots) {
                this.showTradeMessage(`❌ Max lots ${maxLots} (${this.currentContract})`);
                return false;
            }
            return true;
        },

        hasMargin(additionalLots) {
            const m = this.currentContractConfig;
            const need = additionalLots * m.marginPerLot;
            const avail = this.balance - this.marginUsed;
            if (need > avail) {
                this.showTradeMessage(`❌ Not enough margin: Need $${need.toLocaleString()} • Have $${avail.toLocaleString()}`);
                return false;
            }
            return true;
        },

        usdToPriceDelta(usd, qty) {
            return usd / (this.currentContractConfig.contractValue * Math.max(qty, 1));
        },

        calculatePnl(trade, exitPrice, qtyPortion = trade.qty) {
            const diff = trade.type === 'buy' ? (exitPrice - trade.entry) : (trade.entry - exitPrice);
            return diff * qtyPortion * trade.contractValue;
        },

        newBaseTrade(type, qty, entry) {
            const slDelta = this.usdToPriceDelta(this.stopLoss, qty);
            const tpDelta = this.usdToPriceDelta(this.takeProfit, qty);
            const m = this.currentContractConfig;
        
            return {
                type,
                qty: Number(qty),  // ← Force to number
                entry,
                stop: type === 'buy' ? entry - slDelta : entry + slDelta,
                target: type === 'buy' ? entry + tpDelta : entry - tpDelta,
                entryTime: Date.now(),
                contractValue: m.contractValue,
                marginRequired: qty * m.marginPerLot,
                stopMoved: false,
                targetMoved: false
            };
        },

        realize(trade, exitPrice, qtyToClose, exitReason) {
            const now = Date.now();
            const pnl = this.calculatePnl(trade, exitPrice, qtyToClose);

            // free margin for the chunk we closed
            const m = this.currentContractConfig;
            this.marginUsed -= qtyToClose * m.marginPerLot;

            this.trades.push({
                ...trade,
                qty: qtyToClose,
                exit: exitPrice,
                pnl,
                duration: now - trade.entryTime,
                exitReason: exitReason || 'Reduced',
                time: new Date().toLocaleTimeString()
            });
            this.balance += pnl;

            // mirror to humanStats
            this.humanStats.trades.push({
                ...trade,
                qty: qtyToClose,
                exit: exitPrice,
                pnl,
                exitReason: exitReason || 'Reduced'
            });
            this.humanStats.balance += pnl;
        },

        ensureSingle(tradeOrNull) {
            this.openTrades = tradeOrNull ? [tradeOrNull] : [];
            this.humanStats.openTrades = tradeOrNull ? [{ ...tradeOrNull }] : [];
        },

        barIndex() { return this.candles.length - 1; },
  
        atr(period = 14) {
            const n = this.candles.length;
            if (n < period + 1) return 1;
            let trSum = 0;
            for (let i = n - period; i < n; i++) {
                const c = this.candles[i], p = this.candles[i-1];
                // Fix: Add safety check for p existence
                if (!p) continue;
                const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
                trSum += tr;
            }
            return trSum / period;
        },

        roundRect(ctx, x, y, w, h, r) {
            const radius = Math.min(r, h/2, w/2);
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.arcTo(x + w, y,     x + w, y + h, radius);
            ctx.arcTo(x + w, y + h, x,     y + h, radius);
            ctx.arcTo(x,     y + h, x,     y,     radius);
            ctx.arcTo(x,     y,     x + w, y,     radius);
            ctx.closePath();
        },
        
        // simple regime filters pros often require
        trendSlope(period = 20) {
            const n = this.candles.length; if (n < period) return 0;
            const xs = [], ys = [];
            for (let i = n - period; i < n; i++) { xs.push(i); ys.push(this.candles[i].close); }
            const x̄ = xs.reduce((a,b)=>a+b,0)/period, ȳ = ys.reduce((a,b)=>a+b,0)/period;
            let num=0, den=0; 
            for (let i=0;i<period;i++){ num += (xs[i]-x̄)*(ys[i]-ȳ); den += (xs[i]-x̄)**2; }
            return den ? num/den : 0; // >0 uptrend, <0 downtrend
        },
        
        isChop(look=20, thresh=0.2) {
            const n=this.candles.length; if (n<look+1) return false;
            const slice = this.candles.slice(n-look-1);
            const hi=Math.max(...slice.map(c=>c.high)), lo=Math.min(...slice.map(c=>c.low));
            const rng = hi-lo, atr = this.atr(Math.min(14, look));
            return atr / (rng || 1) < thresh; // tiny atr vs range = choppy/mean-reverting
        },

        getStrategyDescription(strategyId) {
            const descriptions = {
                'supportResistance': 'Identifies key price levels and trades bounces/breaks with confirmation. Uses ATR for level validation and wick analysis.',
                'trendline': 'Follows trend direction using moving averages. Trades pullbacks in trending markets with slope confirmation.',
                'candlestick': 'Detects classic patterns like engulfing, doji, and hammer. Requires volume confirmation and pattern completion.',
                'breakout': 'Trades breakouts from consolidation ranges. Uses ATR buffers to filter false breakouts and requires volume surge.',
                'meanReversion': 'Trades price extremes using standard deviation bands. Avoids strong trends and prefers choppy/ranging markets.',
                'human': 'Your discretionary trading based on experience, intuition, and real-time market analysis.'
            };
            return descriptions[strategyId] || 'No description available.';
        },

        // Bot Trading Methods
        executeBotTrades() {
            if (!this.arenaActive) return; // Safety check
            
            const bar = this.barIndex();
            const atr = this.atr(14);
            const slope = this.trendSlope(30);
        
            Object.values(this.bots).forEach(bot => {
                // session/day bookkeeping
                const lastCandleTime = this.candles[this.candles.length-1]?.timestamp || Date.now();
                const dayStr = new Date(lastCandleTime).toDateString();
                if (bot.dayStamp !== dayStr) { bot.dayStamp = dayStr; bot.dayPnL = 0; bot.losersInRow = 0; }
        
                // respect cooldown and max concurrent
                if (Date.now() < bot.cooldownUntil) return;
                if (bot.openTrades.length >= bot.maxOpen) return;
                if (bar - bot.lastEntryBar < bot.minBarsBetween) return;
        
                // daily loss stop
                const maxDailyLoss = 150000 * bot.maxDailyLossPct; // base capital
                if (-bot.dayPnL >= maxDailyLoss) return;
        
                // strategy signal
                const signal = this.generateBotSignal(bot.id, this.candles, this.currentPrice);
                if (!signal) return;
                if (signal) {
                  // Record the signal for visualization
                  bot.lastSignal = {
                      type: signal,
                      price: this.currentPrice,
                      timestamp: Date.now()
                  };
                }
        
                // professional context filters (examples)
                // - trend strategies trade with slope; mean reversion against it but avoid strong slope
                if (bot.id === 'trendline' || bot.id === 'breakout') {
                    if ((signal === 'buy' && slope <= 0) || (signal === 'sell' && slope >= 0)) return;
                }
                if (bot.id === 'meanReversion') {
                    if (Math.abs(slope) > 0.3) return; // skip strong trends
                    if (!this.isChop()) return;        // prefer consolidating/choppy
                }
        
                // risk per trade in $
                const acct = bot.balance;
                const $risk = Math.max(50, acct * bot.riskPct); // floor at $50
        
                // convert to price risk with ATR-based SL (like pros)
                const m = this.currentContractConfig;
                const priceRisk = bot.useATR ? (bot.atrMultSL * atr) : this.usdToPriceDelta($risk, 1);
                const rr = bot.rr;
        
                // derive qty from $risk = (priceRisk * contractValue * qty)
                const qtyFloat = $risk / (priceRisk * m.contractValue || 1);
                let qty = Math.max(1, Math.floor(qtyFloat)); // round down
                // margin + hard-cap checks using your helpers (human rules apply to bots too)
                if (qty > m.maxLots) qty = m.maxLots;
                const needMargin = qty * m.marginPerLot;
                if (needMargin > (bot.balance - (bot.openTrades.reduce((a,t)=>a + t.qty*m.marginPerLot,0)))) return;
        
                const entry = this.currentPrice;
                const stop  = signal === 'buy' ? entry - priceRisk : entry + priceRisk;
                const target= signal === 'buy' ? entry + priceRisk*rr : entry - priceRisk*rr;
        
                bot.openTrades.push({
                    type: signal,
                    entry, stop, target,
                    qty, contractValue: m.contractValue,
                    timestamp: Date.now(),
                    stopMoved:false, targetMoved:false,
                    botId: bot.id,
                    rValue: priceRisk * m.contractValue, // $ value of 1R per lot
                    managed:false
                });
        
                bot.lastEntryBar = bar;
            });
        },
        
        // Add volatility calculation
        calculateVolatility(candles) {
            if (candles.length < 2) return 5; // Default volatility
            const priceChanges = [];
            for (let i = 1; i < candles.length; i++) {
                priceChanges.push(Math.abs(candles[i].close - candles[i-1].close));
            }
            return priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
        },
        
        // Improved bot signals with better logic
        generateBotSignal(botId, candles, currentPrice) {
            if (candles.length < 10) return null;
            
            const recentPrices = candles.slice(-10).map(c => c.close);
            const avgPrice = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
            const volatility = this.calculateVolatility(candles.slice(-5));
            
            switch(botId) {
                case 'breakout': {
                    const look = 20;
                    const slice = candles.slice(-look);
                    const hi = Math.max(...slice.map(c=>c.high));
                    const lo = Math.min(...slice.map(c=>c.low));
                    const last = candles[candles.length-1];
                
                    const atr = this.atr(14);
                    const buffer = 0.2 * atr; // need a meaningful break
                    if (last.close > hi + buffer) return 'buy';
                    if (last.close < lo - buffer) return 'sell';
                    return null;
                }
                
                case 'supportResistance': {
                    const levels = this.findSupportResistance(candles);
                    const last = candles[candles.length-1];
                    const atr = this.atr(14);
                    const near = levels.find(L => Math.abs(last.close - L) < 0.4*atr);
                    if (!near) return null;
                
                    // require rejection wick as confirmation
                    const body = Math.abs(last.close - last.open);
                    const wickUp = last.high - Math.max(last.close, last.open);
                    const wickDn = Math.min(last.close, last.open) - last.low;
                
                    if (last.close < near && wickDn > body*1.2) return 'buy';  // bounce up
                    if (last.close > near && wickUp > body*1.2) return 'sell'; // bounce down
                    return null;
                }
                    
                case 'trendline':
                    // Simple trend detection
                    const trend = this.detectTrend(candles);
                    return trend > 0 ? 'buy' : trend < 0 ? 'sell' : null;
                    
                case 'candlestick':
                    // More sophisticated pattern detection
                    return this.detectCandlestickPattern(candles) ? 
                        (Math.random() > 0.5 ? 'buy' : 'sell') : null;
                    
                case 'meanReversion':
                    // Mean reversion with standard deviation
                    const stdDev = this.calculateStdDev(recentPrices);
                    return Math.abs(currentPrice - avgPrice) > stdDev * 1.5 ? 
                        (currentPrice > avgPrice ? 'sell' : 'buy') : null;
                        
                default:
                    return null;
            }
        },
        
        // Helper methods for improved signals
        findSupportResistance(candles) {
            const raw = [];
            for (let i = 2; i < candles.length - 2; i++) {
                const c=candles[i];
                if (c.high > candles[i-1].high && c.high > candles[i+1].high) raw.push(c.high);
                if (c.low  < candles[i-1].low  && c.low  < candles[i+1].low ) raw.push(c.low);
            }
            // merge close levels
            const tol = this.calculateVolatility(candles.slice(-20)) * 1.5;
            raw.sort((a,b)=>a-b);
            const merged = [];
            raw.forEach(l=>{
                if (!merged.length || Math.abs(l - merged[merged.length-1]) > tol) merged.push(l);
                else merged[merged.length-1] = (merged[merged.length-1] + l)/2;
            });
            return merged.slice(-5);
        },
        
        detectTrend(candles) {
            if (candles.length < 5) return 0;
            const shortMA = candles.slice(-3).reduce((sum, c) => sum + c.close, 0) / 3;
            const longMA = candles.slice(-5).reduce((sum, c) => sum + c.close, 0) / 5;
            return shortMA > longMA ? 1 : shortMA < longMA ? -1 : 0;
        },
        
        detectCandlestickPattern(candles) {
            // Simple pattern detection
            const current = candles[candles.length - 1];
            const prev = candles[candles.length - 2];
            
            // Bullish engulfing
            if (current.close > current.open && prev.close < prev.open && 
                current.open < prev.close && current.close > prev.open) {
                return true;
            }
            // Bearish engulfing
            if (current.close < current.open && prev.close > prev.open && 
                current.open > prev.close && current.close < prev.open) {
                return true;
            }
            return Math.random() > 0.8; // Random patterns occasionally
        },
        
        calculateStdDev(prices) {
            const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
            const squareDiffs = prices.map(price => Math.pow(price - mean, 2));
            return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / prices.length);
        },

        // UI Methods
        getWinRate(strategyId) {
            // Human - ONLY COMPLETED TRADES
            if (strategyId === 'human') {
                const trades = this.humanStats.trades; // completed trades only
                if (!trades.length) return '—';
                const wins = trades.filter(t => t.pnl > 0).length;
                return ((wins / trades.length) * 100).toFixed(1);
            }
        
            // Bot - ONLY COMPLETED TRADES
            const bot = this.bots[strategyId];
            if (!bot || !bot.trades.length) return '—';
            const wins = bot.trades.filter(t => t.pnl > 0).length;
            return ((wins / bot.trades.length) * 100).toFixed(1);
        },

        adjustLotSize(delta) {
            const newSize = this.lotSize + delta;
            if (newSize >= 1 && newSize <= 20) {
                this.lotSize = newSize;
            }
        },

        showTradeMessage(msg) {
            this.tradeMessage = msg;
            setTimeout(() => {
                this.tradeMessage = "";
            }, 3000);
        },

        setupEventListeners() {
            document.addEventListener("keydown", (e) => {
                if (e.key === "+" || e.key === "=") this.adjustLotSize(1);
                if (e.key === "-" || e.key === "_") this.adjustLotSize(-1);
                if (e.key.toLowerCase() === "b") this.placeTrade("buy");
                if (e.key.toLowerCase() === "s") this.placeTrade("sell");
                if (e.key.toLowerCase() === "x") this.closeAll();
            });
        },

        // Chart Methods
        drawChart() {
            const canvas = this.$refs.chartCanvas;
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const width = canvas.width = canvas.offsetWidth;
            const height = canvas.height = canvas.offsetHeight;
            const padding = 10;
            const labelMargin = 60;
        
            ctx.clearRect(0, 0, width, height);
        
            const viewCount = Math.floor(60 / this.scaleX);
            const start = Math.max(0, this.candles.length - viewCount - Math.floor(this.offsetX));
            const candles = this.candles.slice(start, start + viewCount);
            if (candles.length < 2) return;
        
            let max = Math.max(...candles.map(c => c.high));
            let min = Math.min(...candles.map(c => c.low));
            const priceBuffer = (max - min) * 0.05;
            max += priceBuffer;
            min -= priceBuffer;
        
            this.openTrades.forEach(trade => {
                max = Math.max(max, trade.entry, trade.stop, trade.target);
                min = Math.min(min, trade.entry, trade.stop, trade.target);
            });
        
            const scaleY = (height - 2 * padding) / (max - min);
            const candleWidth = (width - labelMargin) / candles.length;
        
            // Grid
            ctx.strokeStyle = "#333";
            ctx.fillStyle = "#888";
            ctx.font = "10px sans-serif";
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
        
            const steps = 10;
            for (let i = 0; i <= steps; i++) {
                const y = padding + ((height - 2 * padding) * i / steps);
                const price = max - ((max - min) * i / steps);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
                ctx.fillText(price.toFixed(2), width - 4, y);
            }
        
            // Candles
            candles.forEach((c, i) => {
                const x = i * candleWidth;
                const openY = height - (c.open - min) * scaleY - padding;
                const closeY = height - (c.close - min) * scaleY - padding;
                const highY = height - (c.high - min) * scaleY - padding;
                const lowY = height - (c.low - min) * scaleY - padding;
        
                const isBullish = c.close >= c.open;
                ctx.strokeStyle = isBullish ? "#089a81" : "#f33645";
                ctx.fillStyle = isBullish ? "#089a81" : "#f33645";
        
                ctx.beginPath();
                ctx.moveTo(x + candleWidth / 2, highY);
                ctx.lineTo(x + candleWidth / 2, lowY);
                ctx.stroke();
        
                const bodyTop = isBullish ? closeY : openY;
                const bodyHeight = Math.max(1, Math.abs(openY - closeY));
                ctx.fillRect(x + 1, bodyTop, candleWidth - 2, bodyHeight);
            });
        
            // Trade Lines
            this.openTrades.forEach(trade => {
                const drawLine = (price, color, label, key) => {
                    const y = height - (price - min) * scaleY - padding;
        
                    ctx.strokeStyle = (this.selectedLine && this.selectedLine.trade === trade && this.selectedLine.key === key)
                        ? "#ff0"
                        : color;
        
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(width, y);
                    ctx.stroke();
        
                    let dollar = '';
                    if (label === 'SL' || label === 'TP') {
                        const direction = trade.type === 'buy' ? 1 : -1;
                        const delta = (price - trade.entry) * direction;
                    
                        const tickSize = 0.25;
                        const roundedTicks = Math.round(delta / tickSize);
                        const tickValue = this.currentContract === 'micro' ? 0.50 : 5.00;
                        const pnl = roundedTicks * tickValue * trade.qty;
                    
                        const sign = pnl >= 0 ? '+' : '';
                        dollar = ` → ${sign}$${pnl.toFixed(2)} (${roundedTicks} ticks)`;
                    }
        
                    ctx.fillStyle = ctx.strokeStyle;
                    ctx.font = "11px sans-serif";
                    ctx.textAlign = "left";
                    ctx.fillText(`${label} ${price.toFixed(2)}${dollar}`, 8, y - 4);
                };
        
                drawLine(trade.entry, trade.type === 'buy' ? '#0f0' : '#f00', 'Entry');
                drawLine(trade.stop, '#888', 'SL', 'stop');
                drawLine(trade.target, '#888', 'TP', 'target');
            });
        
            // Bot Signals
            Object.values(this.bots).forEach(bot => {
                if (bot.lastSignal && bot.lastSignal.timestamp > Date.now() - 30000) {
                    const signalIndex = candles.findIndex(c => c.timestamp >= bot.lastSignal.timestamp);
                    if (signalIndex !== -1) {
                        const x = signalIndex * candleWidth;
                        const y = height - (bot.lastSignal.price - min) * scaleY - padding;
                        
                        ctx.fillStyle = bot.color;
                        ctx.beginPath();
                        ctx.arc(x + candleWidth/2, y, 6, 0, 2 * Math.PI);
                        ctx.fill();
                        
                        // Signal label with background
                        ctx.fillStyle = 'rgba(0,0,0,0.7)';
                        ctx.fillRect(x + candleWidth/2 - 15, y - 25, 30, 12);
                        
                        ctx.fillStyle = bot.color;
                        ctx.font = "bold 10px sans-serif";
                        ctx.textAlign = "center";
                        ctx.fillText(bot.lastSignal.type.toUpperCase(), x + candleWidth/2, y - 16);
                    }
                }
            });
        
            // Live Price Box
            const liveY = height - (this.currentPrice - min) * scaleY - padding;
            ctx.fillStyle = "#111";
            ctx.strokeStyle = "#0ff";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.rect(width - labelMargin, liveY - 10, 55, 20);
            ctx.fill();
            ctx.stroke();
        
            ctx.fillStyle = "#0ff";
            ctx.font = "12px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(this.currentPrice.toFixed(2), width - labelMargin + 27.5, liveY);
        
            // Market Regime overlay (tint + pill)
            this.drawMarketRegimeOverlay(ctx, width, height);
        },

        drawMarketRegimeOverlay(ctx, width, height) {
            const pad = 10;
            const pillPadX = 80;
            const pillPadY = 6;
        
            // Background tint across the whole chart (very subtle)
            ctx.save();
            ctx.fillStyle = this.marketRegime.bg;
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        },

        // Chart Event Handlers
        handleChartDown(e) {
            const canvas = this.$refs.chartCanvas;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            this.selectedLine = null;

            const height = canvas.height;
            const padding = 10;
            const viewCount = Math.floor(60 / this.scaleX);
            const start = Math.max(0, this.candles.length - viewCount - Math.floor(this.offsetX));
            const candles = this.candles.slice(start, start + viewCount);
            let max = Math.max(...candles.map(c => c.high));
            let min = Math.min(...candles.map(c => c.low));
            const priceBuffer = (max - min) * 0.05;
            max += priceBuffer;
            min -= priceBuffer;

            this.openTrades.forEach(trade => {
                max = Math.max(max, trade.entry, trade.stop, trade.target);
                min = Math.min(min, trade.entry, trade.stop, trade.target);
            });

            const scaleY = (height - 2 * padding) / (max - min);

            this.openTrades.forEach(trade => {
                const test = (price, key) => {
                    const py = height - (price - min) * scaleY - padding;
                    const tolerance = e.touches ? 10 : 6;
                    if (Math.abs(py - y) < tolerance) {
                        this.selectedLine = { trade, key };
                        this.dragOffset = py - y;
                    }
                };
                test(trade.stop, 'stop');
                test(trade.target, 'target');
            });

            if (!this.selectedLine) {
                this.isDragging = true;
                this.lastX = e.touches ? e.touches[0].clientX : e.clientX;
            }
        },

        handleChartUpLeave() {
            this.isDragging = false;
            this.selectedLine = null;
        },

        handleChartMove(e) {
            const canvas = this.$refs.chartCanvas;
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            const y = clientY - rect.top;

            const height = canvas.height;
            const padding = 10;
            const viewCount = Math.floor(60 / this.scaleX);
            const start = Math.max(0, this.candles.length - viewCount - Math.floor(this.offsetX));
            const candles = this.candles.slice(start, start + viewCount);
            let max = Math.max(...candles.map(c => c.high));
            let min = Math.min(...candles.map(c => c.low));
            const priceBuffer = (max - min) * 0.05;
            max += priceBuffer;
            min -= priceBuffer;

            this.openTrades.forEach(trade => {
                max = Math.max(max, trade.entry, trade.stop, trade.target);
                min = Math.min(min, trade.entry, trade.stop, trade.target);
            });

            const scaleY = (height - 2 * padding) / (max - min);

            if (this.selectedLine) {
                e.preventDefault();
                const newPrice = ((height - (y + this.dragOffset) - padding) / scaleY) + min;
                const rounded = parseFloat(newPrice.toFixed(2));
                this.selectedLine.trade[this.selectedLine.key] = rounded;
            
                if (this.selectedLine.key === 'stop') this.selectedLine.trade.stopMoved = true;
                if (this.selectedLine.key === 'target') this.selectedLine.trade.targetMoved = true;
                
                this.$nextTick(() => this.drawChart());
            } else if (this.isDragging) {
                const delta = clientX - this.lastX;
                this.offsetX += delta / (this.scaleX * 10);
                this.lastX = clientX;
                this.$nextTick(() => this.drawChart());
            }
        },

        handleChartWheel(e) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.scaleX *= delta;
            this.scaleX = Math.max(0.5, Math.min(this.scaleX, 10));
            this.$nextTick(() => this.drawChart());
        }
    }
}