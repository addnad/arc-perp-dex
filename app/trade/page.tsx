"use client"

import { useEffect, useState } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"

const CONTRACT_ADDRESS = "0x25491Abd75Ac5678DeEB385b9f073c2323ECa1E3"
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000"

const PERP_ABI = [
  "function updatePrice(string asset, uint256 newPrice) external",
  "function getPrice(string asset) view returns (uint256)",
  "function openPosition(string asset, uint256 amount) external",
  "function closePosition(string asset, uint256 amount) external",
  "event PriceUpdated(string asset, uint256 newPrice)",
  "event PositionOpened(address user, string asset, uint256 amount, uint256 price)",
  "event PositionClosed(address user, string asset, uint256 amount, uint256 price)",
]

const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
]

const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  AVAX: "AVAXUSDT",
  ADA: "ADAUSDT",
  XRP: "XRPUSDT",
  DOT: "DOTUSDT",
  LINK: "LINKUSDT",
}

const TRADINGVIEW_PAIRS: Record<string, string> = {
  BTC: "BINANCE:BTCUSDT",
  ETH: "BINANCE:ETHUSDT",
  SOL: "BINANCE:SOLUSDT",
  AVAX: "BINANCE:AVAXUSDT",
  ADA: "BINANCE:ADAUSDT",
  XRP: "BINANCE:XRPUSDT",
  DOT: "BINANCE:DOTUSDT",
  LINK: "BINANCE:LINKUSDT",
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

async function fetchBinancePrice(asset: string): Promise<bigint> {
  const res = await fetch(`/api/binance-price?asset=${asset}`)
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
  const [wallet, setWallet] = useState<any>(null)
  const [balance, setBalance] = useState<string>("0")
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    async function loadPrice() {
      try {
        const symbol = BINANCE_SYMBOLS[pair]
        const res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`)
        const data = await res.json()
        setPrice(Number.parseFloat(data.lastPrice))
        setPriceChange(Number.parseFloat(data.priceChangePercent))
        setLastUpdate(new Date())
      } catch (error) {
        console.error("Error fetching price:", error)
      }
    }
    loadPrice()
    const interval = setInterval(loadPrice, 10000) // Update every 10 seconds
    return () => clearInterval(interval)
  }, [pair])

  // Load TradingView chart
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

  // Fetch balance
  useEffect(() => {
    async function getBalance() {
      if (!wallet || !wallet.provider) return
      try {
        const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet.provider)
        const balanceWei = await usdcContract.balanceOf(wallet.address)
        setBalance(ethers.formatUnits(balanceWei, 6))
      } catch (error) {
        console.error("Error fetching balance:", error)
      }
    }
    getBalance()
  }, [wallet])

  async function connectWallet() {
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
      setWallet({ provider, signer, address })
    } catch (error) {
      console.error("Connection error:", error)
      alert("Failed to connect wallet")
    }
  }

  async function executeTrade(isOpen: boolean) {
    if (!wallet) {
      await connectWallet()
      return
    }
    if (!amount || Number(amount) <= 0) {
      alert("Please enter amount")
      return
    }

    try {
      setLoading(true)

      const contract = new ethers.Contract(CONTRACT_ADDRESS, PERP_ABI, wallet.signer)

      // Update price on-chain first
      console.log(`[v0] Fetching ${pair} price from Binance...`)
      const price8 = await fetchBinancePrice(pair)
      console.log(`[v0] Updating price on-chain: ${Number(price8) / 1e8}`)

      const updateTx = await contract.updatePrice(pair, price8)
      await updateTx.wait()
      console.log(`[v0] Price updated on-chain`)

      // Execute trade
      const amountWei = ethers.parseUnits(amount, 18)
      console.log(`[v0] ${isOpen ? "Opening" : "Closing"} position for ${amount} ${pair}`)

      const tx = isOpen ? await contract.openPosition(pair, amountWei) : await contract.closePosition(pair, amountWei)

      console.log(`[v0] Transaction sent:`, tx.hash)
      await tx.wait()

      alert(`${isOpen ? "Opened" : "Closed"} ${amount} ${pair} position successfully!`)
      setAmount("")

      // Refresh balance
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet.provider)
      const balanceWei = await usdcContract.balanceOf(wallet.address)
      setBalance(ethers.formatUnits(balanceWei, 6))
    } catch (error: any) {
      console.error("[v0] Trade error:", error)
      let errorMsg = "Transaction failed: "
      if (error.reason) {
        errorMsg += error.reason
      } else if (error.message) {
        errorMsg += error.message
      }
      alert(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Header */}
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

      {/* Pair Selector */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {Object.keys(BINANCE_SYMBOLS).map((p) => (
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

      {/* Price Display */}
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
        <div className="text-xs text-muted-foreground mt-2">Live price from Binance Perpetual Futures</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2">
          <div id="tv-chart" className="h-[500px] bg-card rounded-lg border border-border" />
        </div>

        {/* Trade Panel */}
        <div className="bg-card p-6 rounded-lg border border-border h-fit">
          <h2 className="text-xl font-bold mb-4">Trade</h2>

          {/* Amount Input */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">Amount ({pair})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-3 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Trade Buttons */}
          <div className="flex gap-3">
            <Button
              disabled={loading}
              onClick={() => executeTrade(true)}
              className="flex-1 bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-white font-bold py-6"
            >
              {loading ? "Processing..." : "Open Long"}
            </Button>
            <Button
              disabled={loading}
              onClick={() => executeTrade(false)}
              className="flex-1 bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70 text-white font-bold py-6"
            >
              {loading ? "Processing..." : "Close Position"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            Prices are fetched from Binance and updated on-chain before each trade
          </p>
        </div>
      </div>
    </div>
  )
}
