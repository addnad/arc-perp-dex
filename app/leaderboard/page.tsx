"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { CONTRACTS, ARC_PERP_VAULT_ABI, weiToUsdc } from "@/lib/contracts"

const FALLBACK_RPC = "https://5042002.rpc.thirdweb.com"

interface TradeRecord {
  user: string
  margin: number
  leverage: number
  isLong: boolean
  entryPrice: number
  exitPrice: number
  pnl: number
  timestamp: number
}

interface LeaderboardEntry {
  address: string
  totalPnl: number
  tradeCount: number
  winRate: number
  bestTrade: number
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [recentTrades, setRecentTrades] = useState<TradeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"today" | "alltime">("today")
  const [provider, setProvider] = useState<ethers.BrowserProvider | ethers.JsonRpcProvider | null>(null)

  useEffect(() => {
    const prov =
      typeof window !== "undefined" && window.ethereum
        ? new ethers.BrowserProvider(window.ethereum)
        : new ethers.JsonRpcProvider(FALLBACK_RPC)

    setProvider(prov)
  }, [])

  useEffect(() => {
    if (provider) {
      fetchLeaderboardData()
      const interval = setInterval(fetchLeaderboardData, 30000)
      return () => clearInterval(interval)
    }
  }, [provider, tab])

  const fetchLeaderboardData = async () => {
    if (!provider) return

    try {
      setLoading(true)

      const vaultContract = new ethers.Contract(CONTRACTS.ARC_PERP_VAULT, ARC_PERP_VAULT_ABI, provider)

      // Fetch recent trades
      const trades = await vaultContract.getRecentTrades(100)

      const formattedTrades: TradeRecord[] = trades.map((trade: any) => ({
        user: trade.user,
        margin: weiToUsdc(trade.margin),
        leverage: Number(trade.leverage),
        isLong: trade.isLong,
        entryPrice: Number(trade.entryPrice) / 1e8,
        exitPrice: Number(trade.exitPrice) / 1e8,
        pnl: weiToUsdc(BigInt(trade.pnl.toString())),
        timestamp: Number(trade.timestamp),
      }))

      setRecentTrades(formattedTrades)

      // Calculate leaderboard
      const userStats = new Map<
        string,
        {
          totalPnl: number
          tradeCount: number
          wins: number
          bestTrade: number
        }
      >()

      const now = Date.now() / 1000
      const oneDayAgo = now - 86400

      formattedTrades.forEach((trade) => {
        if (tab === "today" && trade.timestamp < oneDayAgo) return

        const existing = userStats.get(trade.user) || {
          totalPnl: 0,
          tradeCount: 0,
          wins: 0,
          bestTrade: 0,
        }

        existing.totalPnl += trade.pnl
        existing.tradeCount += 1
        if (trade.pnl > 0) existing.wins += 1
        if (trade.pnl > existing.bestTrade) existing.bestTrade = trade.pnl

        userStats.set(trade.user, existing)
      })

      const entries: LeaderboardEntry[] = Array.from(userStats.entries())
        .map(([address, stats]) => ({
          address,
          totalPnl: stats.totalPnl,
          tradeCount: stats.tradeCount,
          winRate: (stats.wins / stats.tradeCount) * 100,
          bestTrade: stats.bestTrade,
        }))
        .sort((a, b) => b.totalPnl - a.totalPnl)
        .slice(0, 10)

      setLeaderboard(entries)
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold">Leaderboard</h1>
            <Button onClick={fetchLeaderboardData} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {loading && leaderboard.length === 0 ? (
            <Card className="glass-card border-border/50 p-12">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded"></div>
                ))}
              </div>
            </Card>
          ) : (
            <>
              {/* Tab Selector */}
              <div className="flex gap-2 bg-card rounded-lg p-1 border border-border/50">
                <button
                  onClick={() => setTab("today")}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    tab === "today"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setTab("alltime")}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    tab === "alltime"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All Time
                </button>
              </div>

              {/* Leaderboard */}
              <Card className="glass-card border-border/50 overflow-hidden">
                <div className="p-6 border-b border-border/50">
                  <h2 className="text-2xl font-bold">🏆 Top Traders</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tab === "today" ? "Best performers today" : "All-time rankings"}
                  </p>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">No trades yet. Be the first to trade!</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                            Rank
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                            Trader
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                            Total PnL
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                            Win Rate
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                            Trades
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                            Best Trade
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {leaderboard.map((entry, index) => (
                          <tr key={entry.address} className="hover:bg-muted/30">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-2xl">
                                {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-mono font-medium">{formatAddress(entry.address)}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span
                                className={`font-bold ${entry.totalPnl >= 0 ? "text-success" : "text-destructive"}`}
                              >
                                {entry.totalPnl >= 0 ? "+" : ""}${entry.totalPnl.toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className={`${entry.winRate >= 50 ? "text-success" : "text-muted-foreground"}`}>
                                {entry.winRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-foreground">
                              {entry.tradeCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="text-success font-medium">+${entry.bestTrade.toFixed(2)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Recent Trades */}
              <Card className="glass-card border-border/50 overflow-hidden">
                <div className="p-6 border-b border-border/50">
                  <h3 className="text-xl font-bold">Recent Trades</h3>
                </div>

                {recentTrades.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">No recent trades</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                            Trader
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
                            Type
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                            Entry
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                            Exit
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                            Leverage
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                            PnL
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {recentTrades.slice(0, 10).map((trade, index) => (
                          <tr key={index} className="hover:bg-muted/30">
                            <td className="px-6 py-3 whitespace-nowrap font-mono text-sm">
                              {formatAddress(trade.user)}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-center">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  trade.isLong ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                                }`}
                              >
                                {trade.isLong ? "LONG" : "SHORT"}
                              </span>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right text-sm">
                              ${trade.entryPrice.toLocaleString()}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right text-sm">
                              ${trade.exitPrice.toLocaleString()}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right text-sm">{trade.leverage}x</td>
                            <td className="px-6 py-3 whitespace-nowrap text-right">
                              <span className={`font-bold ${trade.pnl >= 0 ? "text-success" : "text-destructive"}`}>
                                {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
