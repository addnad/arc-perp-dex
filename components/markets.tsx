"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import Link from "next/link"

interface CoinGeckoPrices {
  bitcoin: { usd: number }
  ethereum: { usd: number }
  solana: { usd: number }
  "avalanche-2": { usd: number }
  [key: string]: { usd: number }
}

interface DisplayPrice {
  id: string
  name: string
  symbol: string
  price: number
}

export function Markets() {
  const [prices, setPrices] = useState<DisplayPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    fetchPrices()
    const interval = setInterval(fetchPrices, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchPrices() {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,avalanche-2&vs_currencies=usd",
      )
      const data: CoinGeckoPrices = await res.json()

      const displayPrices: DisplayPrice[] = [
        { id: "bitcoin", name: "Bitcoin", symbol: "BTC", price: data.bitcoin.usd },
        { id: "ethereum", name: "Ethereum", symbol: "ETH", price: data.ethereum.usd },
        { id: "solana", name: "Solana", symbol: "SOL", price: data.solana.usd },
        { id: "avalanche-2", name: "Avalanche", symbol: "AVAX", price: data["avalanche-2"].usd },
      ]

      setPrices(displayPrices)
      setLastUpdate(new Date())
    } catch (error) {
      console.error("Failed to fetch crypto prices:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Trade Popular Markets</h2>
          <p className="text-lg text-muted-foreground">
            Real-time prices from CoinGecko
            {lastUpdate && ` • Updated ${lastUpdate.toLocaleTimeString()}`}
          </p>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card h-48 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {prices.map((crypto) => (
              <Link key={crypto.id} href={`/trade?pair=${crypto.symbol}`}>
                <Card className="glass-card group relative overflow-hidden border-border/50 p-6 transition-all hover:scale-105 hover:border-primary/50">
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold">{crypto.symbol}/USDC</h3>
                    <p className="text-sm text-muted-foreground">{crypto.name}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-3xl font-bold font-mono">
                      $
                      {crypto.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
