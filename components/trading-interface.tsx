"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, Info, Loader2, Wallet, RefreshCw } from "lucide-react"
import { getWalletAddress, fetchUsdcBalance } from "@/lib/wallet"
import { createPosition } from "@/app/actions/trading"
import { useRouter } from "next/navigation"
import { ethers } from "ethers"
import { approveUSDC, checkAllowance, executeTradeOnChain, CONTRACTS } from "@/lib/contracts"

const TRADING_PAIRS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", tvSymbol: "BTCUSDT" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", tvSymbol: "ETHUSDT" },
  { id: "solana", symbol: "SOL", name: "Solana", tvSymbol: "SOLUSDT" },
  { id: "cardano", symbol: "ADA", name: "Cardano", tvSymbol: "ADAUSDT" },
  { id: "ripple", symbol: "XRP", name: "Ripple", tvSymbol: "XRPUSDT" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", tvSymbol: "DOTUSDT" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", tvSymbol: "AVAXUSDT" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", tvSymbol: "LINKUSDT" },
]

interface CryptoPrice {
  usd: number
  usd_24h_change: number
}

interface PriceData {
  [key: string]: CryptoPrice
}

export function TradingInterface() {
  const router = useRouter()
  const [leverage, setLeverage] = useState([10])
  const [position, setPosition] = useState<"long" | "short">("long")
  const [collateral, setCollateral] = useState("")
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [allPrices, setAllPrices] = useState<PriceData>({})
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isLoadingPrice, setIsLoadingPrice] = useState(true)
  const [selectedPair, setSelectedPair] = useState(TRADING_PAIRS[0])
  const [timeframe, setTimeframe] = useState("1h")
  const [isApproving, setIsApproving] = useState(false)
  const [needsApproval, setNeedsApproval] = useState(false)

  const currentPrice = allPrices[selectedPair.id]?.usd || 0
  const priceChange = allPrices[selectedPair.id]?.usd_24h_change || 0

  useEffect(() => {
    const fetchAllPrices = async () => {
      try {
        setIsLoadingPrice(true)
        const ids = TRADING_PAIRS.map((p) => p.id).join(",")
        const response = await fetch(`/api/crypto-prices?ids=${ids}`)
        const data = await response.json()

        setAllPrices(data)
        setLastUpdate(new Date())
      } catch (error) {
        console.error("[v0] Error fetching prices:", error)
      } finally {
        setIsLoadingPrice(false)
      }
    }

    fetchAllPrices()
    const interval = setInterval(fetchAllPrices, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const checkWallet = async () => {
      const address = await getWalletAddress()
      setWalletAddress(address)

      if (address && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const balance = await fetchUsdcBalance(provider, address)
        setWalletBalance(balance)
      }
    }
    checkWallet()

    // Listen for wallet changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", async (accounts: string[]) => {
        const newAddress = accounts[0] || null
        setWalletAddress(newAddress)

        if (newAddress) {
          const provider = new ethers.BrowserProvider(window.ethereum)
          const balance = await fetchUsdcBalance(provider, newAddress)
          setWalletBalance(balance)
        } else {
          setWalletBalance(0)
        }
      })
    }
  }, [])

  const calculatePositionSize = () => {
    if (!collateral) return "0.00"
    return (Number.parseFloat(collateral) * leverage[0]).toFixed(2)
  }

  const calculateLiquidationPrice = () => {
    const liqPercentage = 1 / leverage[0]
    if (position === "long") {
      return currentPrice * (1 - liqPercentage)
    } else {
      return currentPrice * (1 + liqPercentage)
    }
  }

  const handleOpenPosition = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet first")
      return
    }

    if (!CONTRACTS.ARC_PERP_VAULT) {
      alert("Smart contracts are not yet deployed. Trade execution is currently unavailable.")
      return
    }

    if (!collateral || Number.parseFloat(collateral) <= 0) {
      alert("Please enter a valid collateral amount")
      return
    }

    if (Number.parseFloat(collateral) > walletBalance) {
      alert(`Insufficient balance. You have ${walletBalance.toFixed(2)} USDC`)
      return
    }

    setIsSubmitting(true)

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const collateralAmount = Number.parseFloat(collateral)

      console.log("[v0] Checking USDC allowance...")
      const allowance = await checkAllowance(provider, walletAddress)

      // Check if we need to approve USDC spending
      if (allowance < collateralAmount) {
        setNeedsApproval(true)
        setIsApproving(true)
        console.log("[v0] Requesting USDC approval...")
        const approved = await approveUSDC(provider, walletAddress, collateralAmount)

        if (!approved) {
          alert("Failed to approve USDC spending. Please try again.")
          setIsSubmitting(false)
          setIsApproving(false)
          return
        }
        setIsApproving(false)
        setNeedsApproval(false)
      }

      console.log("[v0] Executing trade on-chain...")
      const result = await executeTradeOnChain(provider, collateralAmount, leverage[0], position === "long")

      if (!result.success) {
        alert(`Trade failed: ${result.error}`)
        setIsSubmitting(false)
        return
      }

      // Save trade to database for tracking
      await createPosition({
        walletAddress,
        pair: `${selectedPair.symbol}/USDC`,
        side: position,
        size: Number.parseFloat(calculatePositionSize()),
        collateral: collateralAmount,
        entryPrice: currentPrice,
        leverage: leverage[0],
        liquidationPrice: calculateLiquidationPrice(),
        txHash: result.txHash,
      })

      alert(`Successfully opened ${position} position for ${selectedPair.symbol}!\nTx: ${result.txHash}`)
      setCollateral("")
      router.push("/portfolio")
    } catch (error: any) {
      console.error("[v0] Error opening position:", error)
      alert(`Failed to open position: ${error.message || "Unknown error"}`)
    } finally {
      setIsSubmitting(false)
      setIsApproving(false)
    }
  }

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {!CONTRACTS.ARC_PERP_VAULT && (
        <div className="mb-6 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-center">
          <p className="text-sm font-medium text-amber-500">
            Smart contracts are not yet deployed on Arc testnet. Trade execution is currently unavailable.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart - Left side (2 columns) */}
        <div className="lg:col-span-2">
          <Card className="glass-card h-[600px] overflow-hidden border-border/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <select
                  value={selectedPair.id}
                  onChange={(e) => {
                    const pair = TRADING_PAIRS.find((p) => p.id === e.target.value)
                    if (pair) setSelectedPair(pair)
                  }}
                  className="rounded-lg border border-border bg-background px-4 py-2 text-lg font-semibold"
                >
                  {TRADING_PAIRS.map((pair) => {
                    const price = allPrices[pair.id]
                    const priceStr = price
                      ? `$${price.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "$0.00"
                    const changeStr = price
                      ? ` ${price.usd_24h_change >= 0 ? "+" : ""}${price.usd_24h_change.toFixed(2)}%`
                      : ""
                    return (
                      <option key={pair.id} value={pair.id}>
                        {pair.symbol}/USDC {priceStr}
                        {changeStr}
                      </option>
                    )
                  })}
                </select>
                <div>
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-3xl font-bold font-mono ${priceChange >= 0 ? "text-success" : "text-destructive"}`}
                    >
                      {isLoadingPrice ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: currentPrice < 10 ? 4 : 2 })}`
                      )}
                    </p>
                    <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoadingPrice ? "animate-spin" : ""}`} />
                  </div>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${priceChange >= 0 ? "text-success" : "text-destructive"}`}>
                      {priceChange >= 0 ? "+" : ""}
                      {priceChange.toFixed(2)}% (24h)
                    </p>
                    <span className="text-xs text-muted-foreground">• Updated {formatTimeAgo(lastUpdate)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={timeframe === "1m" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeframe("1m")}
                >
                  1m
                </Button>
                <Button
                  variant={timeframe === "5m" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeframe("5m")}
                >
                  5m
                </Button>
                <Button
                  variant={timeframe === "15m" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeframe("15m")}
                >
                  15m
                </Button>
                <Button
                  variant={timeframe === "1h" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeframe("1h")}
                >
                  1h
                </Button>
                <Button
                  variant={timeframe === "4h" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeframe("4h")}
                >
                  4h
                </Button>
                <Button
                  variant={timeframe === "1D" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeframe("1D")}
                >
                  1D
                </Button>
              </div>
            </div>

            <div className="h-[500px] rounded-lg border border-border/30 bg-background/50">
              <iframe
                src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=BINANCE:${selectedPair.tvSymbol}&interval=${timeframe}&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=f4f7f9&studies=[]&theme=dark&style=1&timezone=Etc/UTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=arc-perp-dex&utm_medium=widget_new&utm_campaign=chart&utm_term=BINANCE:${selectedPair.tvSymbol}`}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="TradingView Chart"
              />
            </div>
          </Card>
        </div>

        {/* Order panel - Right side (1 column) */}
        <div className="lg:col-span-1">
          {walletAddress && (
            <Card className="glass-card mb-4 border-border/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Balance</span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold">{walletBalance.toFixed(2)} USDC</p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
              </div>
            </Card>
          )}

          <Card className="glass-card border-border/50 p-6">
            <Tabs value={position} onValueChange={(v) => setPosition(v as "long" | "short")}>
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="long" className="data-[state=active]:bg-success data-[state=active]:text-white">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Long
                </TabsTrigger>
                <TabsTrigger
                  value="short"
                  className="data-[state=active]:bg-destructive data-[state=active]:text-white"
                >
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Short
                </TabsTrigger>
              </TabsList>

              <TabsContent value="long" className="space-y-6">
                <OrderForm
                  position="long"
                  leverage={leverage}
                  setLeverage={setLeverage}
                  collateral={collateral}
                  setCollateral={setCollateral}
                  calculatePositionSize={calculatePositionSize}
                  calculateLiquidationPrice={calculateLiquidationPrice}
                  currentPrice={currentPrice}
                  onSubmit={handleOpenPosition}
                  isSubmitting={isSubmitting}
                  walletConnected={!!walletAddress}
                  walletBalance={walletBalance}
                  selectedPair={selectedPair.symbol}
                />
              </TabsContent>

              <TabsContent value="short" className="space-y-6">
                <OrderForm
                  position="short"
                  leverage={leverage}
                  setLeverage={setLeverage}
                  collateral={collateral}
                  setCollateral={setCollateral}
                  calculatePositionSize={calculatePositionSize}
                  calculateLiquidationPrice={calculateLiquidationPrice}
                  currentPrice={currentPrice}
                  onSubmit={handleOpenPosition}
                  isSubmitting={isSubmitting}
                  walletConnected={!!walletAddress}
                  walletBalance={walletBalance}
                  selectedPair={selectedPair.symbol}
                />
              </TabsContent>
            </Tabs>
          </Card>

          {/* Position info card */}
          <Card className="glass-card mt-6 border-border/50 p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Arc Network Testnet</p>
                <p className="mt-1">Trading with testnet USDC. No real value at risk.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function OrderForm({
  position,
  leverage,
  setLeverage,
  collateral,
  setCollateral,
  calculatePositionSize,
  calculateLiquidationPrice,
  currentPrice,
  onSubmit,
  isSubmitting,
  walletConnected,
  walletBalance,
  selectedPair,
}: {
  position: "long" | "short"
  leverage: number[]
  setLeverage: (value: number[]) => void
  collateral: string
  setCollateral: (value: string) => void
  calculatePositionSize: () => string
  calculateLiquidationPrice: () => number
  currentPrice: number
  onSubmit: () => void
  isSubmitting: boolean
  walletConnected: boolean
  walletBalance: number
  selectedPair: string
}) {
  const leveragePresets = [2, 5, 10, 25, 50]

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Leverage</Label>
          <span className={`text-2xl font-bold font-mono ${position === "long" ? "text-success" : "text-destructive"}`}>
            {leverage[0]}x
          </span>
        </div>

        {/* Leverage preset buttons */}
        <div className="flex gap-2">
          {leveragePresets.map((preset) => (
            <Button
              key={preset}
              variant={leverage[0] === preset ? "default" : "outline"}
              size="sm"
              onClick={() => setLeverage([preset])}
              className="flex-1"
              disabled={isSubmitting}
            >
              {preset}x
            </Button>
          ))}
        </div>

        <Slider value={leverage} onValueChange={setLeverage} min={1} max={50} step={1} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1x</span>
          <span>25x</span>
          <span>50x</span>
        </div>
      </div>

      {/* Collateral input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Collateral (USDC)</Label>
          {walletConnected && (
            <span className="text-xs text-muted-foreground">Balance: {walletBalance.toFixed(2)} USDC</span>
          )}
        </div>
        <div className="relative">
          <Input
            type="number"
            placeholder="0.00"
            value={collateral}
            onChange={(e) => setCollateral(e.target.value)}
            className="pr-20 font-mono text-lg"
            disabled={isSubmitting}
            step="0.01"
            min="0"
            max={walletBalance}
          />
          <div className="absolute right-1 top-1 flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={() => setCollateral((walletBalance * 0.5).toFixed(2))}
              disabled={isSubmitting || !walletConnected}
            >
              50%
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={() => setCollateral(walletBalance.toFixed(2))}
              disabled={isSubmitting || !walletConnected}
            >
              MAX
            </Button>
          </div>
        </div>
      </div>

      {/* Position size */}
      <div className="space-y-2">
        <Label>Position Size</Label>
        <div className="rounded-lg bg-muted/50 p-4 font-mono text-3xl font-bold">${calculatePositionSize()}</div>
        <p className="text-xs text-muted-foreground">
          = {collateral || "0"} USDC × {leverage[0]}x leverage
        </p>
      </div>

      {/* Order details */}
      <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Entry Price</span>
          <span className="font-mono font-medium">
            $
            {currentPrice > 0
              ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })
              : "Loading..."}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Liquidation Price</span>
          <span className="font-mono font-medium text-destructive">
            $
            {currentPrice > 0
              ? calculateLiquidationPrice().toLocaleString(undefined, { maximumFractionDigits: 2 })
              : "0.00"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Trading Fee</span>
          <span className="font-mono font-medium">0.05%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Est. Gas Fee</span>
          <span className="font-mono font-medium">~$0.05 USDC</span>
        </div>
      </div>

      <Button
        size="lg"
        className={`w-full text-lg font-bold shadow-2xl transition-all hover:scale-[1.02] ${
          position === "long"
            ? "glow-success bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-white"
            : "glow-destructive bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70 text-white"
        }`}
        onClick={onSubmit}
        disabled={
          isSubmitting || !walletConnected || currentPrice === 0 || !collateral || Number.parseFloat(collateral) <= 0
        }
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : !walletConnected ? (
          "Connect Wallet to Trade"
        ) : (
          <>
            {position === "long" ? <TrendingUp className="mr-2 h-5 w-5" /> : <TrendingDown className="mr-2 h-5 w-5" />}
            Execute {position === "long" ? "Long" : "Short"} {selectedPair}
          </>
        )}
      </Button>
    </div>
  )
}
