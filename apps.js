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
    const sideBtns = document.querySelectorAll('.side-btn');
    sideBtns.forEach(btn => {
        btn.addEventListener('click', () => {
             sideBtns.forEach(b => b.classList.remove('active'));
             btn.classList.add('active');
             
             const executeBtn = document.querySelector('.btn-execute');
             if (btn.classList.contains('buy')) {
                 executeBtn.className = 'btn-execute buy-bg';
                 executeBtn.innerText = 'Log In to Buy';
             } else {
                 executeBtn.className = 'btn-execute sell-bg';
                 executeBtn.innerText = 'Log In to Sell';
             }
        });
    });

    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // --- Boot ---
    generateInitialData();
    renderOrderBook();
    setInterval(tick, CONFIG.updateInterval);
});

// Helper classes for dynamic coloring in JS specific calls
const style = document.createElement('style');
style.innerHTML = `
    .price-up { color: var(--color-up); }
    .price-down { color: var(--color-down); }
`;
document.head.appendChild(style);
