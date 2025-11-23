document.addEventListener('DOMContentLoaded', () => {

  // --- State ---
  let coins = JSON.parse(localStorage.getItem('coins')) || [
    {id: 'bitcoin', symbol: 'BTCUSDT', label: 'Bitcoin (BTC)'},
    {id: 'ethereum', symbol: 'ETHUSDT', label: 'Ethereum (ETH)'}
  ];
  let selectedCoin = localStorage.getItem('selectedCoin') || coins[0].id;

  // --- Elements ---
  const coinSelectEl = document.getElementById('coinSelect');
  const inflowEl = document.getElementById('inflow');
  const volatilityEl = document.getElementById('volatility');
  const fundingEl = document.getElementById('funding');
  const signalEl = document.getElementById('signal');
  const livePriceEl = document.getElementById('livePrice');
  const predictedSignalEl = document.getElementById('predictedSignal');
  const liveChartEl = document.getElementById('liveChart');
  const coinListEl = document.getElementById('coinList'); // Coin list container

  // Render coin list and dropdown
  function renderCoinList() {
    coinListEl.innerHTML = '';
    coinSelectEl.innerHTML = '';
    coins.forEach(c => {
      const div = document.createElement('div');
      div.textContent = c.label;

      // Create a "Remove" button
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '×';
      removeBtn.style.color = 'red';
      removeBtn.style.marginLeft = '10px';
      removeBtn.onclick = () => removeCoin(c.id);

      div.appendChild(removeBtn);
      coinListEl.appendChild(div);

      // Add to the coin select dropdown
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.label;
      coinSelectEl.appendChild(opt);
    });
    coinSelectEl.value = selectedCoin;
  }

  // Add new coin with CoinGecko ID and TradingView Symbol
  document.getElementById('addCoinBtn').addEventListener('click', () => {
    const newCoinId = document.getElementById('newCoinId').value.trim();
    const newCoinSymbol = document.getElementById('newCoinSymbol').value.trim().toUpperCase();
    if (newCoinId && newCoinSymbol) {
      coins.push({id: newCoinId, symbol: newCoinSymbol, label: `${newCoinSymbol} (${newCoinId})`});
      renderCoinList();
      saveState(); // Save updated state to localStorage
    }
    document.getElementById('newCoinId').value = '';
    document.getElementById('newCoinSymbol').value = '';
  });

  // Function to remove a coin
  function removeCoin(id) {
    coins = coins.filter(c => c.id !== id);
    if (selectedCoin === id && coins.length > 0) {
      selectedCoin = coins[0].id; // Select the first coin if the removed coin was selected
    }
    saveState(); // Save updated state to localStorage
    renderCoinList();
    loadDashboard(); // Reload dashboard with updated data
  }

  // Save state to localStorage
  function saveState() {
    localStorage.setItem('coins', JSON.stringify(coins));
    localStorage.setItem('selectedCoin', selectedCoin);
  }

  // Fetch CoinGecko data
  async function fetchCoinData(coinId) {
    try {
      const url = `https://api.coingecko.com/api/v3/coins/${coinId}`;
      const res = await fetch(url);
      const data = await res.json();

      // Log the data for debugging purposes
      console.log('CoinGecko Data:', data);

      if (!data || !data.market_data) {
        throw new Error('Data not available');
      }

      // Live Price (current price)
      const livePrice = data.market_data.current_price?.usd || 'N/A';
      livePriceEl.innerText = livePrice !== 'N/A' ? `Live Price: $${livePrice.toLocaleString()}` : 'Live Price: N/A';

      // Inflows (24h volume)
      const inflows = data.market_data.total_volumes?.usd || 'N/A';
      inflowEl.innerText = inflows !== 'N/A' ? `$${inflows.toLocaleString()}` : inflows;

      // Change color of inflows based on whether the value is positive or negative
      if (inflows !== 'N/A') {
        inflowEl.style.color = inflows > 0 ? 'green' : 'red';  // Positive is green, negative is red
      }

      // Volatility (24h price change percentage)
      const volatility = data.market_data.price_change_percentage_24h || 'N/A';
      volatilityEl.innerText = `${volatility}%`;

      // Funding Rate (for Binance)
      const fundingUrl = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${coinId.toUpperCase()}USDT`;
      const fundingRes = await fetch(fundingUrl);
      const fundingData = await fundingRes.json();

      const fundingRate = fundingData[fundingData.length - 1]?.fundingRate || 'N/A';
      fundingEl.innerText = fundingRate !== 'N/A' && fundingRate !== 0 ? `${(fundingRate * 100).toFixed(2)}%` : 'N/A';

      // Signal (simple calculation for demonstration)
      const signal = calculateSignal(data);
      signalEl.innerText = signal;

      // Predicted Signal (Based on a simple condition)
      const predictedSignal = calculatePredictedSignal(data);
      predictedSignalEl.innerText = predictedSignal !== 'N/A' ? `Predicted Signal: ${predictedSignal}` : 'Predicted Signal: N/A';

    } catch (error) {
      console.error('Error fetching data:', error);
      inflowEl.innerText = 'Error';
      volatilityEl.innerText = 'Error';
      fundingEl.innerText = 'Error';
      signalEl.innerText = 'Error';
      predictedSignalEl.innerText = 'Error';
    }
  }

  // Function to calculate signal (simple logic based on volatility)
  function calculateSignal(data) {
    const volatility = data.market_data.price_change_percentage_24h;
    if (volatility > 10) return 'SELL';
    if (volatility < 5) return 'BUY';
    return 'NEUTRAL';
  }

  // Function to calculate predicted signal (dummy logic for demonstration)
  function calculatePredictedSignal(data) {
    const volatility = data.market_data.price_change_percentage_24h;
    if (volatility > 8) return 'SELL';   // High volatility predicted sell
    if (volatility < -5) return 'BUY';   // Significant negative volatility predicted buy
    return 'NEUTRAL';                    // Otherwise neutral
  }

  // Update the live chart iframe source based on the selected coin
  coinSelectEl.addEventListener('change', () => {
    const selectedCoinId = coinSelectEl.value;
    const selectedCoin = coins.find(c => c.id === selectedCoinId);
    liveChartEl.src = `https://s.tradingview.com/widgetembed/?frameElementId=tv_btc&symbol=BINANCE:${selectedCoin.symbol}&interval=60&theme=dark`;

    // Fetch data for the selected coin
    fetchCoinData(selectedCoinId);
  });

  // Initial load
  renderCoinList();
  fetchCoinData(coins[0].id);
  liveChartEl.src = `https://s.tradingview.com/widgetembed/?frameElementId=tv_btc&symbol=BINANCE:${coins[0].symbol}&interval=60&theme=dark`;

  // Poll for updates (Every 15 minutes for live data)
  setInterval(() => fetchCoinData(selectedCoin), 900000); // Refresh every 15 minutes

});

