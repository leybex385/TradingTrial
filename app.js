document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const CONFIG = {
        initialPrice: 48234.50,
        volatility: 0.002, // 0.2% variance
        updateInterval: 1000,
    };

    // --- State ---
    let currentPrice = CONFIG.initialPrice;
    let currentCandle = null;
    let candleSeries = null;
    let volumeSeries = null;

    // --- Chart Initialization ---
    const chartContainer = document.getElementById('tv-chart');
    const chart = LightweightCharts.createChart(chartContainer, {
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
        layout: {
            background: { type: 'solid', color: 'transparent' },
            textColor: '#848e9c',
        },
        grid: {
            vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
            horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal,
        },
        rightPriceScale: {
            borderColor: 'rgba(197, 203, 206, 0.1)',
        },
        timeScale: {
            borderColor: 'rgba(197, 203, 206, 0.1)',
            timeVisible: true,
        },
    });

    candleSeries = chart.addCandlestickSeries({
        upColor: '#0ecb81',
        downColor: '#f6465d',
        borderDownColor: '#f6465d',
        borderUpColor: '#0ecb81',
        wickDownColor: '#f6465d',
        wickUpColor: '#0ecb81',
    });

    volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '', // set as an overlay by setting a blank priceScaleId
    });

    volumeSeries.priceScale().applyOptions({
        scaleMargins: {
            top: 0.7, // highest point of the series will be 70% away from the top
            bottom: 0,
        },
    });

    // Handle Resize
    window.addEventListener('resize', () => {
        chart.resize(chartContainer.clientWidth, chartContainer.clientHeight);
    });

    // --- Data Generation ---
    function generateInitialData() {
        const data = [];
        const volume = [];
        let time = Math.floor(Date.now() / 1000) - (24 * 60 * 60); // 24h ago
        let price = CONFIG.initialPrice;

        for (let i = 0; i < 1440; i++) { // 1440 minutes in a day
            const move = (Math.random() - 0.5) * CONFIG.volatility * price;
            const open = price;
            const close = price + move;
            const high = Math.max(open, close) + Math.random() * Math.abs(move);
            const low = Math.min(open, close) - Math.random() * Math.abs(move);

            // Only push 15m candles
            if (i % 15 === 0) {
                data.push({ time, open, high, low, close });
                volume.push({
                    time,
                    value: Math.random() * 100,
                    color: close >= open ? 'rgba(14, 203, 129, 0.3)' : 'rgba(246, 70, 93, 0.3)'
                });
            }

            price = close;
            time += 60;
        }

        // Set the last fully closed candle price as current
        currentPrice = data[data.length - 1].close;

        // Start a new live candle
        currentCandle = {
            time: data[data.length - 1].time + 900, // +15m
            open: currentPrice,
            high: currentPrice,
            low: currentPrice,
            close: currentPrice,
        };

        candleSeries.setData(data);
        volumeSeries.setData(volume);
    }

    function updateLiveCandle(price) {
        if (!currentCandle) return;

        currentCandle.close = price;
        currentCandle.high = Math.max(currentCandle.high, price);
        currentCandle.low = Math.min(currentCandle.low, price);

        candleSeries.update(currentCandle);

        // Update DOM Price
        const priceEl = document.getElementById('current-price');
        priceEl.innerText = price.toFixed(2);
        priceEl.className = `value ${price >= currentCandle.open ? 'up' : 'down'}-text`;

        document.title = `${price.toFixed(2)} | BTC/USDT | NexusTrade`;
    }

    // --- Order Book & History Mocking ---
    function renderOrderBook() {
        const asksContainer = document.getElementById('asks-list');
        const bidsContainer = document.getElementById('bids-list');
        const spreadEl = document.getElementById('current-price-spread');

        // Clear (simplified for this demo, usually virtual DOM)
        asksContainer.innerHTML = '';
        bidsContainer.innerHTML = '';

        // Generate Asks (Price > Current)
        for (let i = 8; i > 0; i--) {
            const p = currentPrice + (i * 5) + (Math.random() * 2);
            const amt = Math.random() * 2;
            const row = createBookRow(p, amt, 'ask');
            asksContainer.appendChild(row);
        }

        // Generate Bids (Price < Current)
        for (let i = 1; i <= 8; i++) {
            const p = currentPrice - (i * 5) - (Math.random() * 2);
            const amt = Math.random() * 2;
            const row = createBookRow(p, amt, 'bid');
            bidsContainer.appendChild(row);
        }

        // Spread
        spreadEl.innerText = currentPrice.toFixed(2);
        spreadEl.className = Math.random() > 0.5 ? 'price-up' : 'price-down';
    }

    function createBookRow(price, amount, type) {
        const div = document.createElement('div');
        div.className = `book-row ${type}-row`;
        div.innerHTML = `
            <span class="price-text ${type === 'ask' ? 'down' : 'up'}">${price.toFixed(2)}</span>
            <span class="amount-text">${amount.toFixed(4)}</span>
            <span class="total-text">${(price * amount).toFixed(2)}</span>
            <div class="depth-visual" style="width: ${Math.random() * 100}%"></div>
        `;
        return div;
    }

    function addHistoryRow(price, amount, side) {
        const tbody = document.getElementById('trade-history');
        const row = document.createElement('tr');
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });

        row.innerHTML = `
            <td>${time}</td>
            <td class="${side === 'buy' ? 'price-up' : 'price-down'}">${price.toFixed(2)}</td>
            <td>${amount.toFixed(5)}</td>
        `;

        tbody.prepend(row);
        if (tbody.children.length > 20) tbody.lastChild.remove();
    }

    // --- Main Loop ---
    function tick() {
        // Random Walk
        const change = (Math.random() - 0.5) * 20;
        currentPrice += change;

        updateLiveCandle(currentPrice);

        // Update Order Book occasionally
        if (Math.random() > 0.3) renderOrderBook();

        // Add fake trade occasionally
        if (Math.random() > 0.5) {
            addHistoryRow(currentPrice, Math.random(), Math.random() > 0.5 ? 'buy' : 'sell');
        }
    }

    // --- Interactions ---
    // --- Wallet & Trading Logic ---
    const WALLET = {
        usdt: 10000.00,
        btc: 0.1500, // Initial small position
        initialBalance: 0, // Calculated on load
        trades: []
    };

    // Initialize detailed wallet state
    WALLET.initialBalance = WALLET.usdt + (WALLET.btc * currentPrice);

    function updateWalletUI() {
        // Balances
        document.getElementById('usdt-balance').innerText = WALLET.usdt.toLocaleString('en-US', { minimumFractionDigits: 2 });
        document.getElementById('btc-balance').innerText = WALLET.btc.toFixed(4);

        // PnL Calculation
        const currentTotalValue = WALLET.usdt + (WALLET.btc * currentPrice);
        const pnl = currentTotalValue - WALLET.initialBalance;
        const pnlPercent = (pnl / WALLET.initialBalance) * 100;

        const pnlContainer = document.getElementById('pnl-container');
        const pnlValueEl = document.getElementById('pnl-value');
        const pnlPercentEl = document.getElementById('pnl-percent');

        pnlContainer.style.display = 'block';
        pnlValueEl.innerText = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDT`;
        pnlPercentEl.innerText = `${pnl >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`;

        const colorClass = pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
        pnlValueEl.className = colorClass;
        pnlPercentEl.className = colorClass;
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success'
            ? '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
            : '<svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';

        toast.innerHTML = `
            ${icon}
            <div>
                <span class="toast-title">${type === 'success' ? 'Order Filled' : 'Order Rejected'}</span>
                <div>${message}</div>
            </div>
            <span class="toast-time">Just now</span>
        `;

        container.appendChild(toast);

        // Remove after 4s
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // --- Inputs Handling ---
    const priceInput = document.querySelector('input[type="number"]'); // First input is price
    const amountInput = document.querySelectorAll('input[type="number"]')[1]; // Second is amount
    const sliderThumb = document.querySelector('.slider-thumb');
    const sliderFill = document.querySelector('.slider-fill');

    // Sync price input with market occasionally if not focused, or set defaults
    // For this demo, let's keep price input static or user defined.

    // --- Trading Interaction ---
    function executeTrade() {
        const side = document.querySelector('.side-btn.buy.active') ? 'buy' : 'sell';
        const price = parseFloat(priceInput.value) || currentPrice;
        const amount = parseFloat(amountInput.value);

        if (!amount || amount <= 0) {
            showToast('Please enter a valid amount', 'error');
            return;
        }

        const totalCost = price * amount;

        if (side === 'buy') {
            if (totalCost > WALLET.usdt) {
                showToast(`Insufficient USDT Balance. Required: ${totalCost.toFixed(2)}`, 'error');
                return;
            }
            WALLET.usdt -= totalCost;
            WALLET.btc += amount;
            showToast(`Bought ${amount} BTC at ${price.toFixed(2)}`, 'success');
        } else {
            if (amount > WALLET.btc) {
                showToast(`Insufficient BTC Balance. Available: ${WALLET.btc}`, 'error');
                return;
            }
            WALLET.btc -= amount;
            WALLET.usdt += totalCost;
            showToast(`Sold ${amount} BTC at ${price.toFixed(2)}`, 'success');
        }

        updateWalletUI();

        // Add to our OWN trade history at the top of the list? 
        // Or just let the generic history run. Let's add a personalized row with a highlight.
        addHistoryRow(price, amount, side);
    }

    const executeBtn = document.querySelector('.btn-execute');
    executeBtn.addEventListener('click', executeTrade);

    // --- Controls Wiring ---
    const sideBtns = document.querySelectorAll('.side-btn');
    sideBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sideBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (btn.classList.contains('buy')) {
                executeBtn.className = 'btn-execute buy-bg';
                executeBtn.innerText = 'Buy BTC';
            } else {
                executeBtn.className = 'btn-execute sell-bg';
                executeBtn.innerText = 'Sell BTC';
            }
        });
    });

    // --- UI Logic: Trade Types ---
    const tradeTabs = document.querySelectorAll('.tab-btn[data-tab]');
    tradeTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.tab;

            // Visual Update
            tradeTabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Logic
            if (type === 'market') {
                priceInput.disabled = true;
                priceInput.value = currentPrice.toFixed(2);
                priceInput.closest('.input-wrapper').style.opacity = '0.5';
            } else {
                priceInput.disabled = false;
                priceInput.closest('.input-wrapper').style.opacity = '1';
            }

            showToast(`Switched to ${type.charAt(0).toUpperCase() + type.slice(1)} Order`, 'info');
        });
    });

    // --- UI Logic: Order Book Filters ---
    const bookTabs = document.querySelectorAll('.order-tabs button');
    const asksPanel = document.getElementById('asks-list');
    const bidsPanel = document.getElementById('bids-list');

    bookTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            bookTabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const txt = btn.innerText;
            if (txt === 'ALL') {
                asksPanel.style.display = 'flex';
                bidsPanel.style.display = 'flex';
                asksPanel.style.flex = '1';
                bidsPanel.style.flex = '1';
            } else if (txt === 'Bids') {
                asksPanel.style.display = 'none';
                bidsPanel.style.display = 'flex';
                bidsPanel.style.flex = '1';
            } else if (txt === 'Asks') {
                asksPanel.style.display = 'flex';
                bidsPanel.style.display = 'none';
                asksPanel.style.flex = '1';
            }
        });
    });

    // --- UI Logic: Timeframes ---
    const timeBtns = document.querySelectorAll('.time-frames button');
    timeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            timeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Sim: Regenerate data
            showToast(`Loading ${btn.innerText} data...`, 'info');
            generateInitialData();
            // In a real app we'd fetch different API data here
        });
    });

    // --- UI Logic: Chart Indicators & Settings ---
    const chartTools = document.querySelectorAll('.chart-tools button');
    let smaSeries = null;

    chartTools.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.innerText === 'Indicators') {
                if (!smaSeries) {
                    smaSeries = chart.addLineSeries({ color: 'rgba(4, 111, 232, 1)', lineWidth: 2 });
                    // Provide some fake SMA data matching the existing candles
                    const data = candleSeries.data().map(c => ({ time: c.time, value: c.close * 1.001 })); // Just slightly offset
                    smaSeries.setData(data);
                    showToast('Enabled SMA Indicator', 'success');
                } else {
                    chart.removeSeries(smaSeries);
                    smaSeries = null;
                    showToast('Disabled Indicators', 'info');
                }
            } else {
                showToast('Settings Saved', 'success');
            }
        });
    });

    // --- UI Logic: Sidebar & Header ---
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('active')) return;
            navItems.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const title = btn.getAttribute('title');
            showToast(`Navigated to ${title}`, 'success');
        });
    });

    const connectBtn = document.querySelector('.btn-primary');
    connectBtn.addEventListener('click', () => {
        if (connectBtn.innerText === 'Connect Wallet') {
            connectBtn.innerText = '0x12..F4A';
            connectBtn.style.background = '#0ecb81'; // Greenish
            showToast('Wallet Connected Successfully', 'success');
        } else {
            connectBtn.innerText = 'Connect Wallet';
            connectBtn.style.background = ''; // Reset
            showToast('Wallet Disconnected', 'info');
        }
    });

    document.querySelector('.btn-icon').addEventListener('click', () => {
        showToast('No new notifications', 'info');
    });

    // Slider Logic Sim
    const percentages = document.querySelectorAll('.percentages span');
    percentages.forEach(p => {
        p.addEventListener('click', (e) => {
            const pct = parseInt(e.target.innerText);
            // Logic to set amount based on wallet
            const side = document.querySelector('.side-btn.buy.active') ? 'buy' : 'sell';
            const price = parseFloat(priceInput.value) || currentPrice;

            let maxAmount = 0;
            if (side === 'buy') {
                maxAmount = WALLET.usdt / price;
            } else {
                maxAmount = WALLET.btc;
            }

            const amount = maxAmount * (pct / 100);
            amountInput.value = amount.toFixed(4);

            // Update Slider UI
            sliderFill.style.width = `${pct}%`;
            sliderThumb.style.left = `${pct}%`;
        });
    });

    // --- Main Loop Updates ---
    function tick() {
        // Random Walk
        const change = (Math.random() - 0.5) * 20;
        currentPrice += change;

        updateLiveCandle(currentPrice);
        updateWalletUI(); // Update PnL every tick

        // Price Input - keep close to market if empty or user wants "market" price (simulated)
        // If user hasn't edited price, maybe update it? Let's leave it static for "Limit" feel.

        // Update Order Book occasionally
        if (Math.random() > 0.3) renderOrderBook();

        // Add fake trade occasionally
        if (Math.random() > 0.5) {
            addHistoryRow(currentPrice, Math.random(), Math.random() > 0.5 ? 'buy' : 'sell');
        }
    }

    // --- Boot ---
    generateInitialData();
    renderOrderBook();
    updateWalletUI();
    setInterval(tick, CONFIG.updateInterval);
});

// Helper classes for dynamic coloring in JS specific calls
const style = document.createElement('style');
style.innerHTML = `
    .price-up { color: var(--color-up); }
    .price-down { color: var(--color-down); }
`;
document.head.appendChild(style);
