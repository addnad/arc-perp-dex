"use client"

import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Trophy, Medal, Award } from "lucide-react"

const leaderboardData = [
  { rank: 1, name: "TraderX", pnl: 12000, trades: 234 },
  { rank: 2, name: "AlphaWolf", pnl: 9400, trades: 189 },
  { rank: 3, name: "ArcKing", pnl: 8100, trades: 156 },
  { rank: 4, name: "User004", pnl: 5000, trades: 98 },
  { rank: 5, name: "CryptoNinja", pnl: 3200, trades: 67 },
]

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-12 text-center text-4xl font-bold">Leaderboard</h1>

          <div className="space-y-4">
            {leaderboardData.map((trader) => (
              <Card
                key={trader.rank}
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
                      <p className="text-lg font-bold">{trader.name}</p>
                      <p className="text-sm text-muted-foreground">{trader.trades} trades</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-success">${trader.pnl.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total PnL</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Rankings based on total realized profit & loss
          </p>
        </div>
      </main>
    </div>
  )
}
