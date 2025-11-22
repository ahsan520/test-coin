/* Full client-side dashboard converted for CDN React usage */

const { useState, useEffect } = React;
const {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} = Recharts;

async function fetchCG(coinId, days, interval) {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

function computeVol(prices) {
  if (!prices || prices.length < 2) return 0;
  const returns = [];
  for (let i = 1; i < prices.length; i++)
    returns.push(Math.log(prices[i][1] / prices[i - 1][1]));
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance);
}

function decisionSignal(v, funding, inflow) {
  const score =
    inflow * 0.4 +
    (funding > 0 ? -1 : 1) * 0.3 +
    (v < 0.005 ? 1 : -1) * 0.3;

  if (score > 0.25) return "BUY";
  if (score < -0.25) return "SELL";
  return "NEUTRAL";
}

function ChartBox(props) {
  return React.createElement(
    "div",
    { className: "bg-white p-3 rounded shadow", style: { height: "260px" } },
    React.createElement("div", { className: "font-medium mb-1" }, props.title),
    React.createElement(
      ResponsiveContainer,
      null,
      React.createElement(
        LineChart,
        { data: props.data },
        React.createElement(CartesianGrid, { strokeDasharray: "3 3" }),
        React.createElement(XAxis, { dataKey: "t", minTickGap: 20 }),
        React.createElement(YAxis, null),
        React.createElement(Tooltip, null),
        React.createElement(Line, {
          type: "monotone",
          dataKey: "p",
          stroke: "#4f46e5",
          strokeWidth: 2,
          dot: false
        })
      )
    )
  );
}

function Metric(props) {
  return React.createElement(
    "div",
    { className: "bg-white p-4 rounded shadow text-center" },
    React.createElement("div", { className: "text-sm text-gray-600" }, props.label),
    React.createElement(
      "div",
      { className: `text-xl font-semibold ${props.color || ""}` },
      props.value
    )
  );
}

function Dashboard() {
  const [coins, setCoins] = useState([
    { id: "bitcoin", symbol: "BTC" },
    { id: "ethereum", symbol: "ETH" },
    { id: "binancecoin", symbol: "BNB" }
  ]);

  const [selectedId, setSelectedId] = useState("bitcoin");
  const [livePrice, setLivePrice] = useState(null);
  const [chart30m, setChart30m] = useState([]);
  const [chart1h, setChart1h] = useState([]);
  const [chart4h, setChart4h] = useState([]);

  const [inflow, setInflow] = useState(0);
  const [volatility, setVolatility] = useState(0);
  const [funding, setFunding] = useState(0);
  const [signal, setSignal] = useState("NEUTRAL");

  const [newCoinId, setNewCoinId] = useState("");
  const [newCoinSymbol, setNewCoinSymbol] = useState("");

  async function loadCharts() {
    const d30 = await fetchCG(selectedId, 0.02, "minutely");
    const d1 = await fetchCG(selectedId, 0.05, "minutely");
    const d4 = await fetchCG(selectedId, 0.2, "minutely");

    if (d30) setChart30m(d30.prices);
    if (d1) setChart1h(d1.prices);
    if (d4) setChart4h(d4.prices);

    if (d4?.prices?.length) {
      setVolatility(computeVol(d4.prices));
    }

    const inflowSim = (Math.random() - 0.45) * 2000;
    setInflow(inflowSim);

    const fundingSim = (Math.random() - 0.5) * 0.05;
    setFunding(fundingSim);

    setSignal(decisionSignal(volatility, fundingSim, inflowSim));
  }

  useEffect(() => {
    let t;
    async function poll() {
      try {
        const r = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${selectedId}&vs_currencies=usd`
        );
        const j = await r.json();
        setLivePrice(j[selectedId]?.usd ?? null);
      } catch {}
      t = setTimeout(poll, 10000);
    }
    poll();
    return () => clearTimeout(t);
  }, [selectedId]);

  useEffect(() => {
    loadCharts();
    const id = setInterval(loadCharts, 30000);
    return () => clearInterval(id);
  }, [selectedId]);

  function fmt(arr) {
    return arr.map(([t, p]) => ({
      t: new Date(t).toLocaleTimeString(),
      p: +p.toFixed(2)
    }));
  }

  function addCoin() {
    if (!newCoinId.trim() || !newCoinSymbol.trim()) return;
    setCoins([
      ...coins,
      { id: newCoinId.trim(), symbol: newCoinSymbol.trim().toUpperCase() }
    ]);
    setNewCoinId("");
    setNewCoinSymbol("");
  }

  function removeCoin(id) {
    const updated = coins.filter(c => c.id !== id);
    setCoins(updated);
    if (selectedId === id && updated.length > 0) {
      setSelectedId(updated[0].id);
    }
  }

  return React.createElement(
    "div",
    { className: "p-4 max-w-7xl mx-auto" },
    React.createElement("h1", { className: "text-2xl font-semibold mb-4" }, "Crypto Dashboard"),

    /* Coin Manager */
    React.createElement(
      "div",
      { className: "border p-4 rounded mb-4 bg-white" },
      React.createElement("h2", { className: "font-semibold mb-2" }, "Coin Manager"),
      React.createElement("div", { className: "mb-2" }, "Existing Coins:"),
      React.createElement(
        "div",
        { className: "flex flex-wrap gap-2 mb-4" },
        coins.map(c =>
          React.createElement(
            "div",
            { key: c.id, className: "flex items-center gap-2 border px-2 py-1 rounded" },
            React.createElement("span", null, c.symbol),
            React.createElement(
              "button",
              { onClick: () => removeCoin(c.id), className: "text-red-600" },
              "×"
            )
          )
        )
      ),

      React.createElement(
        "div",
        { className: "flex gap-2 mb-4" },
        React.createElement("input", {
          className: "border p-1 rounded",
          placeholder: "coin id (bitcoin)",
          value: newCoinId,
          onChange: e => setNewCoinId(e.target.value)
        }),
        React.createElement("input", {
          className: "border p-1 rounded",
          placeholder: "symbol (BTC)",
          value: newCoinSymbol,
          onChange: e => setNewCoinSymbol(e.target.value)
        }),
        React.createElement(
          "button",
          { onClick: addCoin, className: "bg-blue-600 text-white px-3 py-1 rounded" },
          "Add"
        )
      ),

      React.createElement(
        "div",
        null,
        React.createElement(
          "label",
          { className: "mr-2 font-medium" },
          "Select Coin:"
        ),
        React.createElement(
          "select",
          {
            value: selectedId,
            onChange: e => setSelectedId(e.target.value),
            className: "border p-1 rounded"
          },
          coins.map(c =>
            React.createElement("option", { key: c.id, value: c.id }, c.symbol)
          )
        )
      )
    ),

    /* Live Price */
    React.createElement(
      "div",
      { className: "bg-white p-4 rounded shadow mb-4" },
      React.createElement(
        "div",
        { className: "text-lg font-medium" },
        "Live Price: ",
        livePrice ? `$${livePrice.toLocaleString()}` : "—"
      )
    ),

    /* Three Charts */
    React.createElement(
      "div",
      { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" },
      React.createElement(ChartBox, { title: "30m", data: fmt(chart30m) }),
      React.createElement(ChartBox, { title: "1h", data: fmt(chart1h) }),
      React.createElement(ChartBox, { title: "4h", data: fmt(chart4h) })
    ),

    /* Bottom panel */
    React.createElement(
      "div",
      { className: "grid grid-cols-1 md:grid-cols-4 gap-4" },
      React.createElement(Metric, {
        label: "Inflows",
        value: inflow.toFixed(0),
        color: inflow > 0 ? "text-green-600" : "text-red-600"
      }),
      React.createElement(Metric, {
        label: "Volatility",
        value: volatility.toFixed(5)
      }),
      React.createElement(Metric, {
        label: "Funding",
        value: (funding * 100).toFixed(3) + "%",
        color: funding >= 0 ? "text-green-600" : "text-red-600"
      }),
      React.createElement(Metric, {
        label: "Signal",
        value: signal,
        color:
          signal === "BUY"
            ? "text-green-600"
            : signal === "SELL"
            ? "text-red-600"
            : "text-gray-600"
      })
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  React.createElement(Dashboard)
);
