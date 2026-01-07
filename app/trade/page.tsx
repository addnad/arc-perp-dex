"use client"

import { useEffect, useState } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, ChevronDown } from "lucide-react"
import { useWallet } from "@/lib/wallet-context"
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
]

const ASSETS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "MATIC", "DOT", "AVAX", "LINK", "UNI"]

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  MATIC: "matic-network",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  UNI: "uniswap",
}

const TRADINGVIEW_PAIRS: Record<string, string> = {
  BTC: "BINANCE:BTCUSDT",
  ETH: "BINANCE:ETHUSDT",
  SOL: "BINANCE:SOLUSDT",
  BNB: "BINANCE:BNBUSDT",
  XRP: "BINANCE:XRPUSDT",
  ADA: "BINANCE:ADAUSDT",
  DOGE: "BINANCE:DOGEUSDT",
  MATIC: "BINANCE:MATICUSDT",
  DOT: "BINANCE:DOTUSDT",
  AVAX: "BINANCE:AVAXUSDT",
  LINK: "BINANCE:LINKUSDT",
  UNI: "BINANCE:UNIUSDT",
}

const priceCache = new Map<string, { price: number; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

async function fetchCoinGeckoPrice(asset: string): Promise<bigint> {
  // Check cache first
  const cached = priceCache.get(asset)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[v0] Using cached price for ${asset}: ${cached.price}`)
    return BigInt(Math.floor(cached.price * 1e8))
  }

  try {
    const res = await fetch(`/api/coingecko-price?asset=${asset}`)
    const data = await res.json()
    if (data.error) throw new Error(data.error)

    // Cache the price
    const priceNum = Number(data.price8) / 1e8
    priceCache.set(asset, { price: priceNum, timestamp: Date.now() })

    return BigInt(data.price8)
  } catch (error) {
    console.error(`[v0] Error fetching price for ${asset}:`, error)
    // Return cached price if available, even if expired
    if (cached) {
      console.log(`[v0] Using expired cache for ${asset}: ${cached.price}`)
      return BigInt(Math.floor(cached.price * 1e8))
    }
    throw error
  }
}

export default function TradePage() {
  const { wallet, usdcBalance } = useWallet()

  const [pair, setPair] = useState("BTC")
  const [showMarketDropdown, setShowMarketDropdown] = useState(false)
  const [price, setPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [volume24h, setVolume24h] = useState<number>(0)
  const [amount, setAmount] = useState("")
  const [leverage, setLeverage] = useState(10)
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState<any>(null)
  const [positions, setPositions] = useState<any[]>([])
  const [orderBookBids, setOrderBookBids] = useState<any[]>([])
  const [orderBookAsks, setOrderBookAsks] = useState<any[]>([])
  const [timeframe, setTimeframe] = useState("15m")
  const [balance, setBalance] = useState<number | null>(null)

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
    async function loadMarketData() {
      try {
        const res = await fetch(`/api/coingecko-price?asset=${pair}`)
        const data = await res.json()

        if (data.error) {
          console.error("Error fetching market data:", data.error)
          return
        }

        // Convert price8 (8 decimals) to regular price
        const currentPrice = Number(data.price8) / 1e8
        setPrice(currentPrice)

        // For now, we'll use mock data for 24h change and volume
        // You can enhance the API route later to include these
        setPriceChange(Math.random() * 10 - 5) // Mock: random between -5% and +5%
        setVolume24h(Math.random() * 1e9) // Mock: random volume
      } catch (error) {
        console.error("Error fetching market data:", error)
      }
    }
    loadMarketData()
    const interval = setInterval(loadMarketData, 10000)
    return () => clearInterval(interval)
  }, [pair])

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
          interval: timeframe.replace("m", "").replace("h", "0").replace("D", "D"),
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#0a0a0f",
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          container_id: "tv-chart",
          backgroundColor: "#0a0a0f",
        })
      }
    }
    document.body.appendChild(script)
  }, [pair, timeframe])

  useEffect(() => {
    async function getBalance() {
      if (!wallet || !provider) return
      try {
        const bal = await provider.getBalance(wallet.address)
        setBalance(ethers.formatUnits(bal, 18))
      } catch (error) {
        console.error("Error fetching balance:", error)
      }
    }
    getBalance()
  }, [wallet, provider])

  useEffect(() => {
    async function loadPositions() {
      if (!wallet || !provider) return
      try {
        const contract = new ethers.Contract(CONTRACT_ADDRESS, PERP_ABI, provider)
        const loadedPositions = []

        for (const asset of ASSETS) {
          const positionSize: bigint = await contract.positionSizes(wallet.address, asset)
          if (positionSize !== 0n) {
            const entry8 = await contract.entryPrices(wallet.address, asset)
            const marginWei = await contract.margins(wallet.address, asset)

            let pnl = "0.00"
            try {
              const currentPrice8 = await fetchCoinGeckoPrice(asset)
              const entryPrice = Number(entry8) / 1e8
              const currentPrice = Number(currentPrice8) / 1e8

              const size = Number(ethers.formatUnits(positionSize, 18))
              const margin = Number(ethers.formatUnits(marginWei, 18))

              // PnL = (current_price - entry_price) * position_size
              const pnlValue = (currentPrice - entryPrice) * Math.abs(size)
              pnl = pnlValue.toFixed(2)

              console.log(
                `[v0] PnL for ${asset}: Entry=${entryPrice}, Current=${currentPrice}, Size=${size}, PnL=${pnl}`,
              )
            } catch (error) {
              console.error(`[v0] Error calculating PnL for ${asset}:`, error)
              // Try to use contract's PnL as fallback
              try {
                const pnlRaw: bigint = await contract.getUnrealizedPnl(wallet.address, asset)
                pnl = Number(ethers.formatUnits(pnlRaw, 18)).toFixed(2)
              } catch (e) {
                console.error(`[v0] Contract PnL also failed for ${asset}:`, e)
              }
            }

            loadedPositions.push({
              asset,
              size: Number(ethers.formatUnits(positionSize, 18)).toFixed(6),
              entryPrice: (Number(entry8) / 1e8).toFixed(2),
              margin: Number(ethers.formatUnits(marginWei, 18)).toFixed(2),
              pnl,
              direction: Number(positionSize) > 0 ? "LONG" : "SHORT",
            })
          }
        }
        setPositions(loadedPositions)
      } catch (error) {
        console.error("[v0] Error loading positions:", error)
      }
    }
    loadPositions()
    const interval = setInterval(loadPositions, 15000)
    return () => clearInterval(interval)
  }, [wallet, provider])

  useEffect(() => {
    if (!price) return
    const bids = Array.from({ length: 10 }, (_, i) => ({
      price: (price - (i + 1) * 10).toFixed(1),
      size: (Math.random() * 2).toFixed(3),
    }))
    const asks = Array.from({ length: 10 }, (_, i) => ({
      price: (price + (i + 1) * 10).toFixed(1),
      size: (Math.random() * 2).toFixed(3),
    }))
    setOrderBookBids(bids)
    setOrderBookAsks(asks.reverse())
  }, [price])

  const executeTrade = async (isLong: boolean) => {
    if (!wallet) {
      alert("Please connect your wallet using the button in the navigation bar")
      return
    }
    if (!amount || Number(amount) <= 0) {
      alert("Please enter amount")
      return
    }

    try {
      setLoading(true)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, PERP_ABI, wallet.signer)

      const price8 = await fetchCoinGeckoPrice(pair)
      const updateTx = await contract.updatePrice(pair, price8)
      await updateTx.wait()

      const marginWei = ethers.parseUnits(amount, 18)
      const lev = isLong ? leverage : -leverage

      const tx = await contract.openPosition(pair, lev, { value: marginWei })
      await tx.wait()

      alert(`Opened ${Math.abs(lev)}x ${pair} ${isLong ? "LONG" : "SHORT"} position!`)
      setAmount("")
    } catch (error: any) {
      console.error("[v0] Trade error:", error)
      alert(`Transaction failed: ${error.reason || error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const closePosition = async (asset: string) => {
    if (!wallet) return
    try {
      setLoading(true)
      const contract = new ethers.Contract(CONTRACT_ADDRESS, PERP_ABI, wallet.signer)
      const tx = await contract.closePosition(asset)
      await tx.wait()
      alert(`Closed ${asset} position successfully!`)
    } catch (error) {
      console.error("[v0] Close position error:", error)
      alert("Failed to close position")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="border-b border-gray-800 p-3">
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <div className="relative">
            <button
              onClick={() => setShowMarketDropdown(!showMarketDropdown)}
              className="flex items-center gap-3 px-4 py-2 bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full" />
              <span className="text-xl font-bold">{pair}/USDC</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showMarketDropdown && (
              <div className="absolute top-full mt-2 left-0 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 w-64 max-h-96 overflow-y-auto">
                <div className="p-2 border-b border-gray-700">
                  <input
                    type="text"
                    placeholder="Search markets..."
                    className="w-full px-3 py-2 bg-gray-800 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-sm"
                  />
                </div>
                <div className="p-1">
                  {ASSETS.map((asset) => (
                    <button
                      key={asset}
                      onClick={() => {
                        setPair(asset)
                        setShowMarketDropdown(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded hover:bg-gray-800 transition-colors ${
                        pair === asset ? "bg-gray-800" : ""
                      }`}
                    >
                      <div className="font-semibold">{asset}/USDC</div>
                      <div className="text-xs text-gray-400">{COINGECKO_IDS[asset]}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <span className="text-lg">{leverage}x</span>
          <span className="text-2xl font-bold">
            ${price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "..."}
          </span>
          <span className={priceChange >= 0 ? "text-green-500" : "text-red-500"}>
            24h {priceChange >= 0 ? "+" : ""}
            {priceChange.toFixed(2)}%
          </span>
          <span className="text-gray-400">24h Volume ${(volume24h / 1e9).toFixed(2)}B</span>
        </div>
      </div>

      <div className="flex">
        <div className="flex-1 p-4">
          <div className="flex gap-2 mb-4">
            {["1m", "5m", "15m", "30m", "1h", "4h", "1D"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded ${timeframe === tf ? "bg-blue-600" : "bg-gray-800 hover:bg-gray-700"}`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div id="tv-chart" className="bg-[#0a0a0f] rounded-lg h-[500px]" />
        </div>

        <div className="w-96 border-l border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-bold mb-3">Order Book</h3>
            <div className="space-y-0.5 text-xs font-mono">
              {orderBookAsks.map((ask, i) => (
                <div key={i} className="grid grid-cols-3 text-right">
                  <span className="text-red-500">{ask.price}</span>
                  <span className="text-gray-400">{ask.size}</span>
                  <span className="text-gray-600">-</span>
                </div>
              ))}
              <div className="text-center py-1 border-y border-gray-700 text-gray-500">{price?.toFixed(1)}</div>
              {orderBookBids.map((bid, i) => (
                <div key={i} className="grid grid-cols-3 text-right">
                  <span className="text-green-500">{bid.price}</span>
                  <span className="text-gray-400">{bid.size}</span>
                  <span className="text-gray-600">-</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 flex-1">
            <div className="flex gap-2 mb-4">
              <button className="flex-1 py-2 bg-gray-800 rounded text-sm">CROSS</button>
              <button className="flex-1 py-2 bg-gray-800 rounded text-sm">{leverage}x</button>
            </div>

            <p className="text-sm mb-3 text-gray-400">
              Available {usdcBalance !== null ? usdcBalance.toFixed(2) : "0.00"} USDC
            </p>

            <div className="mb-4">
              <label className="text-sm text-gray-400 block mb-2">Margin (USDC)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 bg-gray-900 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-400 block mb-2">Leverage {leverage}x</label>
              <input
                type="range"
                min="1"
                max="50"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1x</span>
                <span>50x</span>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <Button
                onClick={() => executeTrade(true)}
                disabled={loading}
                className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded"
              >
                <ArrowUpRight className="mr-2" /> LONG
              </Button>
              <Button
                onClick={() => executeTrade(false)}
                disabled={loading}
                className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded"
              >
                <ArrowDownRight className="mr-2" /> SHORT
              </Button>
            </div>

            {amount && price && (
              <div className="text-xs text-gray-400 space-y-1 p-3 bg-gray-900 rounded">
                <div className="flex justify-between">
                  <span>Position Size:</span>
                  <span>
                    {((Number(amount) * leverage) / price).toFixed(4)} {pair}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Entry Price:</span>
                  <span>${price.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 p-4">
        <div className="flex gap-6 mb-4">
          <button className="font-bold text-blue-400 border-b-2 border-blue-400 pb-2">
            POSITIONS ({positions.length})
          </button>
        </div>

        {positions.length > 0 ? (
          <div className="space-y-2">
            {positions.map((pos) => (
              <div key={pos.asset} className="bg-gray-900 p-4 rounded-lg flex justify-between items-center">
                <div className="flex gap-6">
                  <div>
                    <div className="text-xs text-gray-400">Asset</div>
                    <div className="font-bold">{pos.asset}/USDC</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Direction</div>
                    <div className={pos.direction === "LONG" ? "text-green-500" : "text-red-500"}>{pos.direction}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Size</div>
                    <div>
                      {pos.size} {pos.asset}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Entry</div>
                    <div>${pos.entryPrice}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Margin</div>
                    <div>{Number(pos.margin).toFixed(2)} USDC</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">PnL</div>
                    <div className={Number(pos.pnl) >= 0 ? "text-green-500" : "text-red-500"}>
                      {Number(pos.pnl) >= 0 ? "+" : ""}
                      {pos.pnl} USDC
                    </div>
                  </div>
                </div>
                <Button onClick={() => closePosition(pos.asset)} disabled={loading} variant="destructive" size="sm">
                  Close
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No open positions</p>
        )}
      </div>
    </div>
  )
}
