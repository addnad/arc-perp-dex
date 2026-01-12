"use client"

import { useEffect, useState } from "react"
import { ethers } from "ethers"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { useWallet } from "@/lib/wallet-context"

const CONTRACT_ADDRESS = "0xF2d1584EDF324bee38b2B200e48e820447B85D0F"
const FALLBACK_RPC = "https://5042002.rpc.thirdweb.com"

const PERP_ABI = [
  "function getPrice(string asset) view returns (uint256)",
  "function positionSizes(address user, string asset) view returns (int256)",
  "function entryPrices(address user, string asset) view returns (uint256)",
  "function margins(address user, string asset) view returns (uint256)",
  "function getUnrealizedPnl(address user, string asset) view returns (int256)",
]

const ASSETS = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE", "MATIC", "DOT", "AVAX", "LINK", "UNI"]

export default function PortfolioPage() {
  const { wallet, usdcBalance } = useWallet()
  const [positions, setPositions] = useState<
    Record<string, { amount: string; value: number; price: number; pnl: string; direction: string }>
  >({})
  const [totalValue, setTotalValue] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const prov = new ethers.BrowserProvider(window.ethereum)
      setProvider(prov)
    }
  }, [])

  useEffect(() => {
    if (wallet?.address) {
      console.log("[v0] Portfolio: Fetching for address:", wallet.address)
      fetchPortfolioData()
      const interval = setInterval(() => {
        fetchPortfolioData()
      }, 5000) // Refresh every 5 seconds
      return () => clearInterval(interval)
    }
  }, [wallet?.address, provider])

  const fetchPortfolioData = async () => {
    if (!wallet?.address || !provider) {
      console.log("[v0] Portfolio: Wallet or provider not ready")
      return
    }

    setLoading(true)
    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, PERP_ABI, provider)
      const userAddress = wallet.address

      console.log("[v0] Portfolio: Fetching positions for", userAddress)

      const newPositions: Record<
        string,
        { amount: string; value: number; price: number; pnl: string; direction: string }
      > = {}
      let total = 0

      const positionPromises = ASSETS.map(async (asset) => {
        try {
          const [sizeRaw, entry8, price8, marginRaw, pnlRaw] = await Promise.all([
            contract.positionSizes(userAddress, asset),
            contract.entryPrices(userAddress, asset),
            contract.getPrice(asset),
            contract.margins(userAddress, asset),
            contract.getUnrealizedPnl(userAddress, asset),
          ])

          const size = Number(sizeRaw) / 1e18
          const entryPrice = Number(entry8) / 1e8
          const currentPrice = Number(price8) / 1e8
          const margin = Number(marginRaw) / 1e18
          const pnl = (Number(pnlRaw) / 1e18).toFixed(2)

          console.log(
            `[v0] Portfolio: ${asset} - size: ${size}, entry: ${entryPrice}, current: ${currentPrice}, pnl: ${pnl}`,
          )

          if (size !== 0) {
            const value = Math.abs(size) * currentPrice
            newPositions[asset] = {
              amount: Math.abs(size).toFixed(6),
              value,
              price: currentPrice,
              pnl,
              direction: size > 0 ? "Long" : "Short",
            }
            total += value
          }
        } catch (error) {
          console.error(`[v0] Error fetching position for ${asset}:`, error)
        }
      })

      await Promise.all(positionPromises)

      setPositions(newPositions)
      setTotalValue(total)
      console.log("[v0] Portfolio: Updated with", Object.keys(newPositions).length, "positions, total value:", total)
    } catch (error) {
      console.error("[v0] Error fetching portfolio:", error)
    } finally {
      setLoading(false)
    }
  }

  const openPositions = Object.keys(positions).length
  const displayBalance = usdcBalance !== null ? usdcBalance : 0

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-4xl font-bold">Portfolio</h1>
            {wallet && (
              <Button onClick={() => fetchPortfolioData()} disabled={loading} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>

          {!wallet ? (
            <Card className="glass-card border-border/50 p-12 text-center">
              <p className="mb-4 text-lg text-muted-foreground">Connect your wallet to view your portfolio</p>
              <p className="text-sm text-muted-foreground">Use the "Connect Wallet" button in the top navigation</p>
            </Card>
          ) : (
            <>
              <div className="mb-8 grid gap-4 md:grid-cols-3">
                <Card className="glass-card border-border/50 p-6">
                  <p className="mb-2 text-sm text-muted-foreground">USDC Balance</p>
                  <p className="text-3xl font-bold">{displayBalance.toFixed(2)} USDC</p>
                </Card>
                <Card className="glass-card border-border/50 p-6">
                  <p className="mb-2 text-sm text-muted-foreground">Total Position Value</p>
                  <p className="text-3xl font-bold text-primary">${totalValue.toFixed(2)}</p>
                </Card>
                <Card className="glass-card border-border/50 p-6">
                  <p className="mb-2 text-sm text-muted-foreground">Open Positions</p>
                  <p className="text-3xl font-bold">{openPositions}</p>
                </Card>
              </div>

              <h2 className="mb-4 text-2xl font-bold">Open Positions</h2>
              {openPositions === 0 ? (
                <Card className="glass-card border-border/50 p-12 text-center">
                  <p className="text-muted-foreground">No open positions</p>
                  <p className="mt-2 text-sm text-muted-foreground">Start trading to see your positions here</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {Object.entries(positions).map(([asset, data]) => (
                    <Card key={asset} className="glass-card border-border/50 p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-lg font-bold text-white">
                            {asset.slice(0, 1)}
                          </div>
                          <div>
                            <p className="text-lg font-bold">{asset}/USDC</p>
                            <p className="text-sm text-muted-foreground">
                              {data.direction} {Number(data.amount).toFixed(6)} {asset}
                            </p>
                          </div>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-2xl font-bold">${data.value.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            ${data.price.toFixed(2)} per {asset}
                          </p>
                          <p
                            className={`text-sm font-medium ${Number.parseFloat(data.pnl) >= 0 ? "text-success" : "text-destructive"}`}
                          >
                            {Number.parseFloat(data.pnl) >= 0 ? "+" : ""}
                            {data.pnl} USDC PnL
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
