import { Zap, Shield, TrendingUp, DollarSign, Clock, Users } from "lucide-react"

export function Features() {
  const features = [
    {
      icon: Zap,
      title: "Sub-Second Finality",
      description: "Lightning-fast trade execution with Arc Network's deterministic finality",
    },
    {
      icon: DollarSign,
      title: "USDC Gas Fees",
      description: "Pay predictable gas fees in USDC, not volatile tokens",
    },
    {
      icon: TrendingUp,
      title: "Up to 50x Leverage",
      description: "Maximize your trading potential with high leverage positions",
    },
    {
      icon: Shield,
      title: "Testnet Safe",
      description: "Practice trading with no real financial risk on Arc Testnet",
    },
    {
      icon: Clock,
      title: "Real-Time Prices",
      description: "Live market data from CoinGecko API updated every 10 seconds",
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Join hundreds of traders in the decentralized finance revolution",
    },
  ]

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Why Choose Arc Perps</h2>
          <p className="text-lg text-muted-foreground">Institutional-grade trading infrastructure built for everyone</p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="glass-card group relative overflow-hidden rounded-xl p-6 transition-all hover:scale-105"
              >
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
