"use client"

import { useEffect, useState } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const FALLBACK_RPC = "https://5042002.rpc.thirdweb.com"
const CONTRACT_ADDRESS = "0xF2d1584EDF324bee38b2B200e48e820447B85D0F"

const PERP_ABI = [
  "function openPosition(string asset, int8 leverage) external payable",
  "function closePosition(string asset) external",
  "function updatePrice(string asset, uint256 newPrice) external",
  "function getPrice(string asset) view returns (uint256)",
  "function getUnrealizedPnl(address user, string asset) view returns (int256)",
  "function positionSizes(address user, string asset) view returns (int256)",
  "function entryPrices(address user, string asset) view returns (uint256)",
  "function margins(address user, string asset) view returns (uint256)",
  "event PriceUpdated(string asset, uint256 newPrice)",
  "event PositionOpened(address indexed user, string asset, int256 size, uint256 price, uint256 margin)",
  "event PositionClosed(address indexed user, string asset, int256 size, uint256 price, int256 pnl)",
]

const ASSETS = ["BTC", "ETH"]

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
}

const TRADINGVIEW_PAIRS: Record<string, string> = {
  BTC: "BINANCE:BTCUSDT",
  ETH: "BINANCE:ETHUSDT",
}

async function switchToArc() {
  const chainId = "0x4CEF52"
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    })
  } catch (e: any) {
    if (e.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId,
            chainName: "Arc Testnet",
            nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
            rpcUrls: ["https://rpc.testnet.arc.network"],
            blockExplorerUrls: ["https://testnet.arcscan.app"],
          },
        ],
      })
    }
  }
}

async function fetchCoinGeckoPrice(asset: string): Promise<bigint> {
  const res = await fetch(`/api/coingecko-price?asset=${asset}`)
  const data = await res.json()

  if (data.error) {
    throw new Error(data.error)
  }

  return BigInt(data.price8)
}

export default function TradePage() {
  const [pair, setPair] = useState("BTC")
  const [price, setPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [amount, setAmount] = useState("")
  const [leverage, setLeverage] = useState(10)
  const [tpPrice, setTpPrice] = useState("")
  const [slPrice, setSlPrice] = useState("")
  const [wallet, setWallet] = useState<any>(null)
  const [balance, setBalance] = useState<string>("0")
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [provider, setProvider] = useState<any>(null)
  const [hasPosition, setHasPosition] = useState<Record<string, boolean>>({})
  const [positionDetails, setPositionDetails] = useState<
    Record<
      string,
      { size: string; entryPrice: number; margin: string; pnl: string; tp?: string; sl?: string; direction?: string }
    >
  >({})
  const [priceHistory, setPriceHistory] = useState<{ labels: string[]; data: number[] }>({
    labels: [],
    data: [],
  })

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const prov = new ethers.BrowserProvider(window.ethereum)
      setProvider(prov)
    } else {
      const fallback = new ethers.JsonRpcProvider(FALLBACK_RPC)
      setProvider(fallback)
    }
  }, [])

  useEffect(() => {
    async function loadPrice() {
      try {
        const coinId = COINGECKO_IDS[pair]
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
        )
        const data = await res.json()
        const currentPrice = data[coinId]?.usd || 0
        setPrice(currentPrice)
        setPriceChange(data[coinId]?.usd_24h_change || 0)
        setLastUpdate(new Date())

        setPriceHistory((prev) => {
          const newData = [...prev.data, currentPrice].slice(-20)
          const newLabels = [...prev.labels, new Date().toLocaleTimeString()].slice(-20)
          return { labels: newLabels, data: newData }
        })
      } catch (error) {
        console.error("Error fetching price:", error)
      }
    }
    loadPrice()
    const interval = setInterval(loadPrice, 10000)
    return () => clearInterval(interval)
  }, [pair])

  useEffect(() => {
    if (!wallet || !provider) return
    const interval = setInterval(() => {
      checkAllPositions()
      checkTpSlTriggers()
    }, 15000)
    return () => clearInterval(interval)
  }, [wallet, provider, pair])

  useEffect(() => {
    const el = document.getElementById("tv-chart")
    if (!el) return
    el.innerHTML = ""

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/tv.js"
    script.async = true
    script.onload = () => {
      if (window.TradingView) {
        new window.TradingView.widget({
          autosize: true,
          symbol: TRADINGVIEW_PAIRS[pair],
          interval: "15",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#0b0b14",
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          container_id: "tv-chart",
          backgroundColor: "#0b0b14",
        })
      }
    }
    document.body.appendChild(script)
  }, [pair])

  useEffect(() => {
    async function getBalance() {
      if (!wallet || !provider) return
      try {
        const bal = await provider.getBalance(wallet.address)
        const balanceFormatted = ethers.formatUnits(bal, 18)
        setBalance(balanceFormatted)
      } catch (error) {
        console.error("Error fetching USDC balance:", error)
      }
    }
    getBalance()
  }, [wallet, provider])

  useEffect(() => {
    checkAllPositions()
  }, [wallet, provider, pair])

  const checkAllPositions = async () => {
    if (!wallet || !provider) return
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, PERP_ABI, provider)

      for (const asset of ASSETS) {
        const positionSize: bigint = await contract.positionSizes(wallet.address, asset)
        const hasPos = positionSize !== 0n
        setHasPosition((prev) => ({ ...prev, [asset]: hasPos }))

        if (hasPos) {
          const entry8 = await contract.entryPrices(wallet.address, asset)
          const entryPrice = Number(entry8) / 1e8
          const marginWei = await contract.margins(wallet.address, asset)
          const margin = ethers.formatUnits(marginWei, 18)
          const pnlRaw: bigint = await contract.getUnrealizedPnl(wallet.address, asset)
          const pnl = (Number(pnlRaw) / 1e6).toFixed(2)
          const size = (Number(positionSize) / 1e10).toFixed(4)

          setPositionDetails((prev) => ({
            ...prev,
            [asset]: { ...prev[asset], size, entryPrice, margin, pnl },
          }))
        } else {
          setPositionDetails((prev) => {
            const newDetails = { ...prev }
            delete newDetails[asset]
            return newDetails
          })
        }
      }
    } catch (error) {
      console.error("Error checking positions:", error)
    }
  }

  const checkTpSlTriggers = async () => {
    if (!price) return

    for (const [asset, pos] of Object.entries(positionDetails)) {
      if (asset !== pair || (!pos.tp && !pos.sl)) continue

      const tp = Number.parseFloat(pos.tp || "0")
      const sl = Number.parseFloat(pos.sl || "0")
      const currentPrice = price

      const shouldClose = (tp > 0 && currentPrice >= tp) || (sl > 0 && currentPrice <= sl)

      if (shouldClose) {
        await closePosition(
          asset,
          `Auto-closed ${asset} - ${currentPrice >= tp ? "Take Profit" : "Stop Loss"} hit at $${currentPrice}`,
        )
      }
    }
  }

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask or use a Web3 browser")
      return
    }
    try {
      await switchToArc()
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send("eth_requestAccounts", [])
      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      setProvider(provider)
      setWallet({ provider, signer, address })
    } catch (error) {
      console.error("Connection error:", error)
      alert("Failed to connect wallet")
    }
  }

  const executeTrade = async (isLong: boolean) => {
    if (!wallet) {
      await connectWallet()
      return
    }
    if (!amount || Number(amount) <= 0) {
      alert("Please enter amount")
      return
    }

    // Check if user already has a position for this asset
    if (hasPosition[pair]) {
      alert(`You already have an open position for ${pair}. Close it first before opening a new one.`)
      return
    }

    try {
      setLoading(true)

      const contract = new ethers.Contract(CONTRACT_ADDRESS, PERP_ABI, wallet.signer)

      // Fetch and update price on-chain
      const price8 = await fetchCoinGeckoPrice(pair)
      const updateTx = await contract.updatePrice(pair, price8)
      await updateTx.wait()

      // Open position (leverage is positive for long, negative for short)
      const marginWei = ethers.parseUnits(amount, 18)
      const lev = isLong ? leverage : -leverage // Negative leverage for short

      const tx = await contract.openPosition(pair, lev, { value: marginWei })
      await tx.wait()

      setHasPosition((prev) => ({ ...prev, [pair]: true }))

      // Fetch position details
      const positionSize: bigint = await contract.positionSizes(wallet.address, pair)
      const entry8 = await contract.entryPrices(wallet.address, pair)
      const entryPrice = Number(entry8) / 1e8
      const marginWei2 = await contract.margins(wallet.address, pair)
      const margin = ethers.formatUnits(marginWei2, 18)
      const size = (Number(positionSize) / 1e10).toFixed(4)

      setPositionDetails((prev) => ({
        ...prev,
        [pair]: {
          size,
          entryPrice,
          margin,
          pnl: "0.00",
          tp: tpPrice,
          sl: slPrice,
          direction: isLong ? "Long" : "Short",
        },
      }))

      alert(`Opened ${Math.abs(lev)}x ${pair} ${isLong ? "LONG" : "SHORT"} position with ${amount} USDC margin!`)
      setTpPrice("")
      setSlPrice("")
      setAmount("")

      // Update balance
      const bal = await provider.getBalance(wallet.address)
      const balanceFormatted = ethers.formatUnits(bal, 18)
      setBalance(balanceFormatted)
    } catch (error: any) {
      console.error("Trade error:", error)
      let errorMsg = "Transaction failed: "
      if (error.reason) {
        errorMsg += error.reason
      } else if (error.message) {
        errorMsg += error.message
      } else {
        errorMsg += "Unknown error"
      }
      alert(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const closePosition = async (asset: string, customMsg?: string) => {
    if (!wallet) return
    try {
      setLoading(true)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, PERP_ABI, wallet.signer)
      const tx = await contract.closePosition(asset)
      await tx.wait()

      setHasPosition((prev) => ({ ...prev, [asset]: false }))
      setPositionDetails((prev) => {
        const newDetails = { ...prev }
        delete newDetails[asset]
        return newDetails
      })

      alert(customMsg || `Closed ${asset} position successfully!`)

      const bal = await provider.getBalance(wallet.address)
      const balanceFormatted = ethers.formatUnits(bal, 18)
      setBalance(balanceFormatted)
    } catch (error) {
      console.error("Close position error:", error)
      alert("Failed to close position")
    } finally {
      setLoading(false)
    }
  }

  const chartData = {
    labels: priceHistory.labels,
    datasets: [
      {
        label: `${pair} Price`,
        data: priceHistory.data,
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        tension: 0.4,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        ticks: {
          color: "rgb(156, 163, 175)",
        },
        grid: {
          color: "rgba(156, 163, 175, 0.1)",
        },
      },
      x: {
        ticks: {
          color: "rgb(156, 163, 175)",
          maxRotation: 0,
        },
        grid: {
          display: false,
        },
      },
    },
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Arc Perps DEX
        </h1>
        <div className="flex gap-3 items-center">
          {wallet && (
            <div className="text-sm bg-card px-4 py-2 rounded-lg border border-border">
              <div className="text-muted-foreground">Balance</div>
              <div className="font-bold">{Number(balance).toFixed(2)} USDC</div>
            </div>
          )}
          <Button onClick={connectWallet} className="bg-gradient-to-r from-primary to-accent">
            {wallet ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : "Connect Wallet"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="trade" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="trade">Trade</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
        </TabsList>

        <TabsContent value="trade">
          <div className="flex gap-3 mb-4 flex-wrap">
            {ASSETS.map((p) => (
              <Button
                key={p}
                variant={pair === p ? "default" : "outline"}
                onClick={() => setPair(p)}
                className={pair === p ? "bg-gradient-to-r from-primary to-accent" : ""}
              >
                {p}/USDC
              </Button>
            ))}
          </div>

          <div className="mb-4 bg-card p-4 rounded-lg border border-border">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-muted-foreground mb-1">{pair}/USDC</div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold">
                    {price
                      ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "Loading..."}
                  </div>
                  {priceChange !== 0 && (
                    <div className={`text-sm font-medium ${priceChange > 0 ? "text-success" : "text-destructive"}`}>
                      {priceChange > 0 ? "+" : ""}
                      {priceChange.toFixed(2)}%
                    </div>
                  )}
                </div>
              </div>
              {lastUpdate && (
                <div className="text-xs text-muted-foreground">
                  Updated {Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Live price from CoinGecko</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div id="tv-chart" className="h-[400px] bg-card rounded-lg border border-border" />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Price History (Last 20 updates)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border h-fit">
              <h2 className="text-xl font-bold mb-4">Trade</h2>

              {hasPosition[pair] && positionDetails[pair] && (
                <div className="mb-4 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                  <div className="text-sm font-bold text-primary mb-2">Active {pair} Position</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size:</span>
                      <span className="font-medium">
                        {positionDetails[pair].size} {pair}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entry Price:</span>
                      <span className="font-medium">${positionDetails[pair].entryPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Margin:</span>
                      <span className="font-medium">{Number(positionDetails[pair].margin).toFixed(2)} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unrealized PnL:</span>
                      <span
                        className={`font-bold ${Number(positionDetails[pair].pnl) >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {Number(positionDetails[pair].pnl) >= 0 ? "+" : ""}
                        {positionDetails[pair].pnl} USDC
                      </span>
                    </div>
                    {positionDetails[pair].tp && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Take Profit:</span>
                        <span className="font-medium text-success">${positionDetails[pair].tp}</span>
                      </div>
                    )}
                    {positionDetails[pair].sl && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stop Loss:</span>
                        <span className="font-medium text-destructive">${positionDetails[pair].sl}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="text-sm text-muted-foreground mb-2 block">Margin (USDC)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-3 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-muted-foreground">Leverage</label>
                  <span className="text-lg font-bold text-primary">{leverage}x</span>
                </div>
                <div className="flex gap-2 mb-3">
                  {[2, 5, 10, 25, 50].map((lev) => (
                    <Button
                      key={lev}
                      size="sm"
                      variant={leverage === lev ? "default" : "outline"}
                      onClick={() => setLeverage(lev)}
                      className={leverage === lev ? "bg-primary" : ""}
                    >
                      {lev}x
                    </Button>
                  ))}
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1x</span>
                  <span>50x</span>
                </div>
              </div>

              {!hasPosition[pair] && (
                <>
                  <div className="mb-3">
                    <label className="text-sm text-muted-foreground mb-2 block">Take Profit Price (Optional)</label>
                    <input
                      type="number"
                      value={tpPrice}
                      onChange={(e) => setTpPrice(e.target.value)}
                      placeholder="e.g. 95000"
                      className="w-full p-3 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-success"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="text-sm text-muted-foreground mb-2 block">Stop Loss Price (Optional)</label>
                    <input
                      type="number"
                      value={slPrice}
                      onChange={(e) => setSlPrice(e.target.value)}
                      placeholder="e.g. 85000"
                      className="w-full p-3 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-destructive"
                    />
                  </div>
                </>
              )}

              {amount && price && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Position Size:</span>
                    <span className="font-medium">${(Number(amount) * price).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">With {leverage}x Leverage:</span>
                    <span className="font-bold text-primary">${(Number(amount) * price * leverage).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Required Margin:</span>
                    <span className="font-medium">${(Number(amount) * price).toFixed(2)} USDC</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => executeTrade(true)}
                  disabled={loading || !amount || hasPosition[pair]}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  {loading ? "Processing..." : hasPosition[pair] ? "Position Open" : "Open Long"}
                </Button>
                <Button
                  onClick={() => executeTrade(false)}
                  disabled={loading || !amount || hasPosition[pair]}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                >
                  {loading ? "Processing..." : hasPosition[pair] ? "Position Open" : "Open Short"}
                </Button>
              </div>

              {hasPosition[pair] && (
                <Button
                  onClick={() => closePosition(pair)}
                  disabled={loading}
                  variant="outline"
                  className="w-full mt-3 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  {loading ? "Closing..." : "Close Position"}
                </Button>
              )}

              <p className="text-xs text-muted-foreground mt-4 text-center">
                TP/SL will auto-close your position when triggered
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="portfolio">
          <Card>
            <CardHeader>
              <CardTitle>Your Positions</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(positionDetails).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-lg mb-2">No open positions</p>
                  <p className="text-sm">Head to the Trade tab to open your first position!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(positionDetails).map(([asset, pos]) => (
                    <Card key={asset} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-lg">{asset}/USDC</h3>
                            <p className="text-sm text-muted-foreground">
                              {pos.direction === "Long" ? "Long" : "Short"} Position
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => closePosition(asset)}
                            disabled={loading}
                          >
                            Close
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Size:</span>
                            <p className="font-medium">
                              {pos.size} {asset}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Entry:</span>
                            <p className="font-medium">${pos.entryPrice.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Margin:</span>
                            <p className="font-medium">{Number(pos.margin).toFixed(2)} USDC</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">PnL:</span>
                            <p className={`font-bold ${Number(pos.pnl) >= 0 ? "text-success" : "text-destructive"}`}>
                              {Number(pos.pnl) >= 0 ? "+" : ""}
                              {pos.pnl} USDC
                            </p>
                          </div>
                          {pos.tp && (
                            <div>
                              <span className="text-muted-foreground">Take Profit:</span>
                              <p className="font-medium text-success">${pos.tp}</p>
                            </div>
                          )}
                          {pos.sl && (
                            <div>
                              <span className="text-muted-foreground">Stop Loss:</span>
                              <p className="font-medium text-destructive">${pos.sl}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
