document.addEventListener('DOMContentLoaded', () => {
    try {
        // --- Configuration ---
        const CONFIG = {
            symbol: 'BTCUSDT',
            binanceWs: 'wss://stream.binance.com:9443/ws',
            binanceApi: 'https://api.binance.com/api/v3',
        };

        // --- State ---
        let currentPrice = 0;
        let lastCandle = null;
        let ws = null;

        // --- Persistence ---
        function loadState() {
            const saved = localStorage.getItem('nexus_trade_state');
            if (saved) return JSON.parse(saved);
            return {
                usdt: 10000.00,
                btc: 0.00,
                trades: [],
                initialBalance: 10000.00
            };
        }

        function saveState() {
            localStorage.setItem('nexus_trade_state', JSON.stringify(WALLET));
        }

        const WALLET = loadState();

        // --- Chart Initialization ---
        const chartContainer = document.getElementById('tv-chart');
        const chart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth,
            height: chartContainer.clientHeight,
            layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#848e9c' },
            grid: { vertLines: { color: 'rgba(255, 255, 255, 0.05)' }, horzLines: { color: 'rgba(255, 255, 255, 0.05)' } },
            crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
            rightPriceScale: { borderColor: 'rgba(197, 203, 206, 0.1)' },
            timeScale: { borderColor: 'rgba(197, 203, 206, 0.1)', timeVisible: true },
        });

        const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
            upColor: '#0ecb81', downColor: '#f6465d',
            borderDownColor: '#f6465d', borderUpColor: '#0ecb81',
            wickDownColor: '#f6465d', wickUpColor: '#0ecb81',
        });


        window.addEventListener('resize', () => {
            chart.resize(chartContainer.clientWidth, chartContainer.clientHeight);
        });

        // --- Live Data Connection ---
        async function fetchHistoricalData() {
            try {
                const res = await fetch(`${CONFIG.binanceApi}/klines?symbol=${CONFIG.symbol}&interval=15m&limit=100`);
                const data = await res.json();
                const candles = data.map(d => ({
                    time: d[0] / 1000,
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                }));

                candleSeries.setData(candles);
                lastCandle = candles[candles.length - 1];
                currentPrice = lastCandle.close;
                updateDOMPrice(currentPrice);

                // Once history is loaded, start stream
                startWebSocket();
                fetchOrderBook(); // Initial snapshot
            } catch (e) {
                showToast("Failed to fetch market data", "error");
            }
        }

        function startWebSocket() {
            // Subscribe to 1m kline for updates and trade for realtime price
            ws = new WebSocket(`${CONFIG.binanceWs}/${CONFIG.symbol.toLowerCase()}@kline_15m`);

            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.e === 'kline') {
                    const k = msg.k;
                    const candle = {
                        time: k.t / 1000,
                        open: parseFloat(k.o),
                        high: parseFloat(k.h),
                        low: parseFloat(k.l),
                        close: parseFloat(k.c),
                    };

                    candleSeries.update(candle);
                    currentPrice = candle.close;
                    updateDOMPrice(currentPrice);
                    updateWalletUI(); // Live PnL updates
                }
            };
        }

        async function fetchOrderBook() {
            try {
                const res = await fetch(`${CONFIG.binanceApi}/depth?symbol=${CONFIG.symbol}&limit=10`);
                const data = await res.json();
                renderOrderBook(data);
            } catch (e) { console.error(e); }
        }

        // Refresh Order Book every 5s
        setInterval(fetchOrderBook, 5000);

        function updateDOMPrice(price) {
            const priceEl = document.getElementById('current-price');
            const prev = parseFloat(priceEl.innerText.replace(',', ''));
            priceEl.innerText = price.toLocaleString('en-US', { minimumFractionDigits: 2 });
            priceEl.className = `value ${price >= prev ? 'up' : 'down'}-text`;
            document.title = `${price.toLocaleString()} | BTC/USDT | NexusTrade`;

            // Auto update input if market order
            if (document.querySelector('.tab-btn[data-tab="market"].active')) {
                const input = document.querySelector('input[type="number"]');
                if (input) input.value = price.toFixed(2);
            }
        }

        function renderOrderBook(data) {
            const asksContainer = document.getElementById('asks-list');
            const bidsContainer = document.getElementById('bids-list');
            asksContainer.innerHTML = '';
            bidsContainer.innerHTML = '';

            // Asks (Reverse so lowest ask is at bottom)
            data.asks.slice(0, 8).reverse().forEach(ask => {
                asksContainer.appendChild(createBookRow(parseFloat(ask[0]), parseFloat(ask[1]), 'ask'));
            });

            // Bids
            data.bids.slice(0, 8).forEach(bid => {
                bidsContainer.appendChild(createBookRow(parseFloat(bid[0]), parseFloat(bid[1]), 'bid'));
            });

            // Spread
            const spread = parseFloat(data.asks[0][0]) - parseFloat(data.bids[0][0]);
            document.getElementById('current-price-spread').innerText = currentPrice.toFixed(2);
            document.querySelector('.spread-value').innerText = spread.toFixed(2);
        }

        function createBookRow(price, amount, type) {
            const div = document.createElement('div');
            div.className = `book-row ${type}-row`;
            // Fake depth visual based on amount relative to some arbitrary max for visual effect
            const depth = Math.min((amount / 5) * 100, 100);
            div.innerHTML = `
                <span class="price-text ${type === 'ask' ? 'down' : 'up'}">${price.toFixed(2)}</span>
                <span class="amount-text">${amount.toFixed(4)}</span>
                <span class="total-text">${(price * amount).toFixed(2)}</span>
                <div class="depth-visual" style="width: ${depth}%"></div>
            `;
            return div;
        }

        // --- Wallet Logic ---
        function updateWalletUI() {
            document.getElementById('usdt-balance').innerText = WALLET.usdt.toLocaleString('en-US', { minimumFractionDigits: 2 });
            document.getElementById('btc-balance').innerText = WALLET.btc.toFixed(5);

            // PnL
            // We use a simple PnL: Total Equity Now vs Initial Equity
            // Note: In a real app complexity is higher (average entry price etc). 
            // Here: Equity = USDT + (BTC * CurrentPrice)
            const currentEquity = WALLET.usdt + (WALLET.btc * currentPrice);
            const pnl = currentEquity - WALLET.initialBalance;
            const pnlPercent = (pnl / WALLET.initialBalance) * 100;

            const pnlEl = document.getElementById('pnl-value');
            if (pnlEl) {
                pnlEl.innerText = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDT`;
                pnlEl.className = pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
                document.getElementById('pnl-percent').innerText = `${pnlPercent.toFixed(2)}%`;
                document.getElementById('pnl-container').style.display = 'block';
            }
        }

        function executeTrade() {
            const side = document.querySelector('.side-btn.buy.active') ? 'buy' : 'sell';
            const price = currentPrice; // Market Order simulation
            const amountInput = document.querySelectorAll('input[type="number"]')[1];
            const amount = parseFloat(amountInput.value);

            if (!amount || amount <= 0) {
                showToast('Invalid Amount', 'error');
                return;
            }

            const cost = price * amount;

            if (side === 'buy') {
                if (cost > WALLET.usdt) return showToast('Insufficient USDT', 'error');
                WALLET.usdt -= cost;
                WALLET.btc += amount;
                showToast(`Bought ${amount} BTC @ ${price.toFixed(2)}`, 'success');
            } else {
                if (amount > WALLET.btc) return showToast('Insufficient BTC', 'error');
                WALLET.btc -= amount;
                WALLET.usdt += cost;
                showToast(`Sold ${amount} BTC @ ${price.toFixed(2)}`, 'success');
            }

            // Add to history
            const tbody = document.getElementById('trade-history');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date().toLocaleTimeString()}</td>
                <td class="${side === 'buy' ? 'price-up' : 'price-down'}">${price.toFixed(2)}</td>
                <td>${amount.toFixed(5)}</td>
            `;
            tbody.prepend(row);

            saveState();
            updateWalletUI();
        }

        // --- Event Listeners ---
        document.querySelector('.btn-execute').addEventListener('click', executeTrade);

        // Buy/Sell Toggles
        document.querySelectorAll('.side-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.side-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const exec = document.querySelector('.btn-execute');
                exec.className = `btn-execute ${btn.classList.contains('buy') ? 'buy' : 'sell'}-bg`;
                exec.innerText = `${btn.classList.contains('buy') ? 'Buy' : 'Sell'} BTC`;
            });
        });

        // Sliders
        document.querySelectorAll('.percentages span').forEach(p => {
            p.addEventListener('click', (e) => {
                if (currentPrice === 0) return;
                const pct = parseInt(e.target.innerText) / 100;
                const side = document.querySelector('.side-btn.buy.active') ? 'buy' : 'sell';
                const amountInput = document.querySelectorAll('input[type="number"]')[1];
                const sliderFill = document.querySelector('.slider-fill');

                let amount = 0;
                if (side === 'buy') amount = (WALLET.usdt * pct) / currentPrice;
                else amount = WALLET.btc * pct;

                amountInput.value = amount.toFixed(5);
                sliderFill.style.width = `${pct * 100}%`;
                document.querySelector('.slider-thumb').style.left = `${pct * 100}%`;
            });
        });

        function showToast(msg, type) {
            const c = document.getElementById('toast-container');
            const t = document.createElement('div');
            t.className = `toast ${type}`;
            t.innerText = msg;
            c.appendChild(t);
            setTimeout(() => t.remove(), 4000);
        }

        // --- Init ---
        fetchHistoricalData();
        updateWalletUI();

        // Restore History
        if (WALLET.trades) {
            // Restore trades to table (simplified)
        }

    } catch (e) {
        alert("Critical Error: " + e.message);
    }
});
