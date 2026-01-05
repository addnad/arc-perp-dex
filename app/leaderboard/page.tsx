"use client"

import { useEffect, useState } from "react"
import { ethers } from "ethers"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Medal, Award, RefreshCw } from "lucide-react"

const CONTRACT_ADDRESS = "0xc41452a842674160bE59CF0bbEa003EB2ddD31b2"
const FALLBACK_RPC = "https://5042002.rpc.thirdweb.com"

const PERP_ABI = [
  "function getPrice(string asset) view returns (uint256)",
  "function positionSizes(address user, string asset) view returns (int256)",
  "event PositionOpened(address indexed user, string asset, int256 size, uint256 price, uint256 margin)",
]

const ASSETS = ["BTC", "ETH"]

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<Array<{ user: string; totalValue: number; rank: number }>>([])
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState<any>(null)

  useEffect(() => {
    const prov =
      typeof window !== "undefined" && window.ethereum
        ? new ethers.BrowserProvider(window.ethereum)
        : new ethers.JsonRpcProvider(FALLBACK_RPC)

    setProvider(prov)
    fetchLeaderboard(prov)
  }, [])

  const fetchLeaderboard = async (prov = provider) => {
    if (!prov) return
    setLoading(true)

    try {
      const contract = new ethers.Contract(CONTRACT_ADDRESS, PERP_ABI, prov)

      const filter = contract.filters.PositionOpened()
      const logs = await contract.queryFilter(filter, -10000) // Last 10k blocks

      // Get unique users
      const uniqueUsers = [...new Set(logs.map((log: any) => log.args.user))]

      const rankings: Array<{ user: string; totalValue: number }> = []

      for (const user of uniqueUsers.slice(0, 20)) {
        let userValue = 0

        for (const asset of ASSETS) {
          try {
            const sizeRaw: bigint = await contract.positionSizes(user, asset)
            const size = Math.abs(Number(sizeRaw)) / 1e10 // Absolute value

            if (size > 0) {
              const price8 = await contract.getPrice(asset)
              const price = Number(price8) / 1e8
              userValue += size * price
            }
          } catch (error) {
            // Skip if error reading position
            continue
          }
        }

        if (userValue > 0) {
          rankings.push({ user, totalValue: userValue })
        }
      }

      rankings.sort((a, b) => b.totalValue - a.totalValue)
      const rankedData = rankings.slice(0, 10).map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }))

      setLeaderboard(rankedData)
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 flex items-center justify-between">
            <h1 className="text-4xl font-bold">Leaderboard</h1>
            <Button onClick={() => fetchLeaderboard()} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {loading && leaderboard.length === 0 ? (
            <Card className="glass-card border-border/50 p-12 text-center">
              <p className="text-muted-foreground">Loading leaderboard...</p>
            </Card>
          ) : leaderboard.length === 0 ? (
            <Card className="glass-card border-border/50 p-12 text-center">
              <p className="text-muted-foreground">No traders yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Be the first to open a position!</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {leaderboard.map((trader) => (
                <Card
                  key={trader.user}
                  className={`glass-card border-border/50 p-6 transition-all hover:border-primary/50 ${
                    trader.rank <= 3 ? "border-primary/30" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xl font-bold text-white">
                        {trader.rank === 1 && <Trophy className="h-6 w-6" />}
                        {trader.rank === 2 && <Medal className="h-6 w-6" />}
                        {trader.rank === 3 && <Award className="h-6 w-6" />}
                        {trader.rank > 3 && `#${trader.rank}`}
                      </div>
                      <div>
                        <p className="text-lg font-bold">
                          {trader.user.slice(0, 6)}...{trader.user.slice(-4)}
                        </p>
                        <p className="text-sm text-muted-foreground">Trader</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-success">${trader.totalValue.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Total Position Value</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Rankings based on total open position value across all assets
          </p>
        </div>
      </main>
    </div>
  )
}
