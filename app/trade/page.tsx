"use client"

import { useEffect, useState } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"

const PERP_ADDRESS = "0x111EDB4B795119BeC5BF1A2d92CE2F3f4a3BAbAC"
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" // Updated USDC contract address to correct Arc testnet address

const PERP_ABI = [
  "function openPosition(uint256 margin, uint256 leverage, bool isLong)",
  "function getPosition(address user) view returns (uint256, uint256, bool, uint256)",
  "function minimumMargin() view returns (uint256)",
]
const USDC_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
]

const PAIRS = {
  BTC: { cg: "bitcoin", tv: "BINANCE:BTCUSDT" },
  ETH: { cg: "ethereum", tv: "BINANCE:ETHUSDT" },
  SOL: { cg: "solana", tv: "BINANCE:SOLUSDT" },
  AVAX: { cg: "avalanche-2", tv: "BINANCE:AVAXUSDT" },
  ADA: { cg: "cardano", tv: "BINANCE:ADAUSDT" },
  XRP: { cg: "ripple", tv: "BINANCE:XRPUSDT" },
  DOT: { cg: "polkadot", tv: "BINANCE:DOTUSDT" },
  LINK: { cg: "chainlink", tv: "BINANCE:LINKUSDT" },
}

async function switchToArc() {
  const chainId = "0x4CEF52" // Arc Testnet correct chain ID
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

export default function TradePage() {
  const [pair, setPair] = useState("BTC")
  const [price, setPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [margin, setMargin] = useState("")
  const [leverage, setLeverage] = useState(5)
  const [wallet, setWallet] = useState<any>(null)
  const [balance, setBalance] = useState<string>("0")
  const [loading, setLoading] = useState(false)

  // Fetch price
  useEffect(() => {
    async function loadPrice() {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${PAIRS[pair as keyof typeof PAIRS].cg}&vs_currencies=usd&include_24hr_change=true`,
        )
        const data = await res.json()
        const cgId = PAIRS[pair as keyof typeof PAIRS].cg
        setPrice(data[cgId].usd)
        setPriceChange(data[cgId].usd_24h_change || 0)
      } catch (error) {
        console.error("Error fetching price:", error)
      }
    }
    loadPrice()
    const interval = setInterval(loadPrice, 30000)
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
          symbol: PAIRS[pair as keyof typeof PAIRS].tv,
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
        setBalance(ethers.formatUnits(balanceWei, 6)) // USDC has 6 decimals
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

  async function executeTrade(isLong: boolean) {
    if (!wallet) {
      await connectWallet()
      return
    }
    if (!margin || Number(margin) <= 0) {
      alert("Please enter margin amount")
      return
    }

    try {
      setLoading(true)

      const contract = new ethers.Contract(PERP_ADDRESS, PERP_ABI, wallet.provider)
      try {
        console.log("[v0] Verifying contract at:", PERP_ADDRESS)
        const minMargin = await contract.minimumMargin()
        console.log("[v0] Contract verified. Minimum margin:", minMargin.toString())
      } catch (verifyError: any) {
        console.error("[v0] Contract verification failed:", verifyError)
        alert(
          "The perpetual contract at this address is not responding. Please check the contract address is correct for Arc testnet.",
        )
        return
      }

      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet.signer)
      const marginAmount = ethers.parseUnits(margin, 6) // USDC has 6 decimals

      console.log("[v0] Checking USDC allowance...")
      const allowance = await usdcContract.allowance(wallet.address, PERP_ADDRESS)

      if (allowance < marginAmount) {
        console.log("[v0] Approving USDC spending...")
        const approveTx = await usdcContract.approve(PERP_ADDRESS, ethers.parseUnits("1000000", 6)) // Approve large amount
        await approveTx.wait()
        console.log("[v0] USDC approved successfully")
      }

      const contractWithSigner = new ethers.Contract(PERP_ADDRESS, PERP_ABI, wallet.signer)
      console.log("[v0] Opening position with margin:", margin, "leverage:", leverage, "isLong:", isLong)
      console.log("[v0] Margin amount (raw):", marginAmount.toString())

      const tx = await contractWithSigner.openPosition(marginAmount, leverage, isLong)
      console.log("[v0] Transaction sent:", tx.hash)

      await tx.wait()
      console.log("[v0] Position opened successfully!")
      alert(`${isLong ? "Long" : "Short"} position opened successfully!`)
      setMargin("")
    } catch (error: any) {
      console.error("Trade error:", error)
      let errorMsg = "Transaction failed: "
      if (error.code === "CALL_EXCEPTION") {
        errorMsg += "The contract rejected your transaction. This could mean:\n"
        errorMsg += "- The contract address is incorrect for Arc testnet\n"
        errorMsg += "- Your margin is below the minimum required\n"
        errorMsg += "- There's insufficient liquidity\n"
        errorMsg += "\nPlease verify the contract address with the Arc testnet documentation."
      } else if (error.code === "INSUFFICIENT_FUNDS") {
        errorMsg = "Insufficient USDC balance"
      } else if (error.reason) {
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
        {Object.keys(PAIRS).map((p) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2">
          <div id="tv-chart" className="h-[500px] bg-card rounded-lg border border-border" />
        </div>

        {/* Trade Panel */}
        <div className="bg-card p-6 rounded-lg border border-border h-fit">
          <h2 className="text-xl font-bold mb-4">Trade</h2>

          {/* Margin Input */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">Margin (USDC)</label>
            <input
              type="number"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              placeholder="0.00"
              className="w-full p-3 bg-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Leverage Slider */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Leverage</span>
              <span className="font-bold text-foreground">{leverage}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1x</span>
              <span>50x</span>
            </div>
          </div>

          {/* Position Size */}
          {margin && (
            <div className="mb-6 p-3 bg-background rounded-lg border border-border">
              <div className="text-sm text-muted-foreground">Position Size</div>
              <div className="text-lg font-bold">${(Number(margin) * leverage).toFixed(2)}</div>
            </div>
          )}

          {/* Trade Buttons */}
          <div className="flex gap-3">
            <Button
              disabled={loading}
              onClick={() => executeTrade(true)}
              className="flex-1 bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 text-white font-bold py-6"
            >
              {loading ? "Processing..." : "Long"}
            </Button>
            <Button
              disabled={loading}
              onClick={() => executeTrade(false)}
              className="flex-1 bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70 text-white font-bold py-6"
            >
              {loading ? "Processing..." : "Short"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
