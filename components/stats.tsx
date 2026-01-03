"use client"

import { useEffect, useState } from "react"
import { TrendingUp, Users, DollarSign, Activity } from "lucide-react"

export function Stats() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const stats = [
    {
      label: "24h Volume",
      value: "$24.5M",
      change: "+12.5%",
      icon: DollarSign,
      positive: true,
    },
    {
      label: "Total Positions",
      value: "1,284",
      change: "+8.2%",
      icon: Activity,
      positive: true,
    },
    {
      label: "Active Traders",
      value: "892",
      change: "+15.3%",
      icon: Users,
      positive: true,
    },
    {
      label: "Avg. APR",
      value: "32.4%",
      change: "+2.1%",
      icon: TrendingUp,
      positive: true,
    },
  ]

  return (
    <section className="border-y border-border/50 bg-muted/30 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="glass-card group relative overflow-hidden rounded-lg p-6 transition-all hover:scale-105"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight">{mounted ? stat.value : "---"}</p>
                    <p className={`mt-1 text-sm font-medium ${stat.positive ? "text-success" : "text-destructive"}`}>
                      {mounted ? stat.change : "---"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
