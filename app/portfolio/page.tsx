"use client"

import { useEffect, useState } from "react"
import { ethers } from "ethers"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

const CONTRACT_ADDRESS = "0xc41452a842674160bE59CF0bbEa003EB2ddD31b2"
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000"

const PERP_ABI = [
  "function getPrice(string asset) view returns (uint256)",
  "function positionSizes(address user, string asset) view returns (int256)",
  "function entryPrices(address user, string asset) view returns (uint256)",
  "function margins(address user, string asset) view returns (uint256)",
  "function getUnrealizedPnl(address user, string asset) view returns (int256)",
]

const USDC_ABI = ["function balanceOf(address account) external view returns (uint256)"]

const ASSETS = ["BTC", "ETH"]

export default function PortfolioPage() {
  const [wallet, setWallet] = useState<any>(null)
  const [provider, setProvider] = useState<any>(null)
  const [usdcBalance, setUsdcBalance] = useState<string>("0")
  const [positions, setPositions] = useState<
    Record<string, { amount: string; value: number; price: number; pnl: string; direction: string }>
  >({})
  const [totalValue, setTotalValue] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const prov = new ethers.BrowserProvider(window.ethereum)
      setProvider(prov)
      checkWallet(prov)
    }
  }, [])

  const checkWallet = async (prov: any) => {
    try {
      const accounts = await prov.listAccounts()
      if (accounts.length > 0) {
        const signer = await prov.getSigner()
        const address = await signer.getAddress()
        setWallet({ provider: prov, signer, address })
        fetchPortfolioData(address, prov)
      }
    } catch (error) {
      console.error("Error checking wallet:", error)
    }
  }

  const fetchPortfolioData = async (address?: string, prov = provider) => {
    if (!prov || (!address && !wallet)) return
    setLoading(true)

    try {
      const userAddress = address || wallet.address
      const contract = new ethers.Contract(CONTRACT_ADDRESS, PERP_ABI, prov)

      const balWei = await prov.getBalance(userAddress)
      const balFormatted = ethers.formatUnits(balWei, 18)
      setUsdcBalance(balFormatted)

      const newPositions: Record<
        string,
        { amount: string; value: number; price: number; pnl: string; direction: string }
      > = {}
      let total = 0

      for (const asset of ASSETS) {
        const sizeRaw: bigint = await contract.positionSizes(userAddress, asset)
        const size = Number(sizeRaw) / 1e10

        if (size !== 0) {
          const entry8 = await contract.entryPrices(userAddress, asset)
          const entryPrice = Number(entry8) / 1e8

          const price8 = await contract.getPrice(asset)
          const currentPrice = Number(price8) / 1e8

          const margin = ethers.formatUnits(await contract.margins(userAddress, asset), 6)
          const pnlRaw: bigint = await contract.getUnrealizedPnl(userAddress, asset)
          const pnl = (Number(pnlRaw) / 1e6).toFixed(2)

          const value = Math.abs(size) * currentPrice
          newPositions[asset] = {
            amount: Math.abs(size).toFixed(4),
            value,
            price: currentPrice,
            pnl,
            direction: size > 0 ? "Long" : "Short",
          }
          total += value
        }
      }

      setPositions(newPositions)
      setTotalValue(total)
    } catch (error) {
      console.error("Error fetching portfolio:", error)
    } finally {
      setLoading(false)
    }
  }

  const openPositions = Object.keys(positions).length

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
                  <p className="text-3xl font-bold">{Number(usdcBalance).toFixed(2)} USDC</p>
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-lg font-bold text-white">
                            {asset}
                          </div>
                          <div>
                            <p className="text-lg font-bold">{asset}/USDC</p>
                            <p className="text-sm text-muted-foreground">
                              {data.direction} {Number(data.amount).toFixed(4)} {asset}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
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
