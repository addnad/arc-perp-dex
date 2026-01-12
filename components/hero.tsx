"use client"

import { Button } from "@/components/ui/button"
import { TrendingUp, Zap, Shield, Wallet } from "lucide-react"
import Link from "next/link"
import { useWallet } from "@/lib/wallet-context"

export function Hero() {
  const { wallet, isConnecting, connect } = useWallet()

  const handleConnect = async () => {
    try {
      await connect()
    } catch (error: any) {
      console.error("Error connecting wallet:", error)
      const errorMessage = error.message || "Failed to connect wallet. Please try again."

      if (errorMessage.includes("preview mode")) {
        alert(
          "🔒 Preview Mode Limitation\n\n" +
            "Wallet connection doesn't work in v0 preview due to security restrictions.\n\n" +
            "✅ To test wallet features:\n" +
            "• Click 'Publish' (top right) to deploy to Vercel\n" +
            "• Or download and run locally\n\n" +
            "Your wallet will work perfectly once deployed! 🚀",
        )
      } else {
        alert(errorMessage)
      }
    }
  }

  return (
    <section className="relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 animate-gradient" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />

      <div className="container relative mx-auto px-4 py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Network badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 backdrop-blur-sm">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Powered by Arc Network Testnet</span>
          </div>

          {/* Main headline */}
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-balance md:text-7xl">
            A{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Hedge Fund
            </span>{" "}
            in Your Pocket
          </h1>

          <p className="mb-10 text-xl text-muted-foreground text-balance md:text-2xl">
            Trade perpetual futures with up to 50x leverage. Lightning-fast execution with deterministic sub-second
            finality on Arc Network.
          </p>

          {/* CTA buttons */}
          <div className="flex w-full flex-col items-center justify-center gap-3 sm:gap-4 md:flex-row">
            <Link href="/trade" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="glow-primary group h-12 sm:h-14 w-full px-6 sm:px-8 text-base sm:text-lg font-semibold"
              >
                Start Trading
                <TrendingUp className="ml-2 h-4 sm:h-5 w-4 sm:w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-8 text-base sm:text-lg font-semibold backdrop-blur-sm bg-transparent"
              onClick={handleConnect}
              disabled={isConnecting || !!wallet}
            >
              <Wallet className="mr-2 h-4 sm:h-5 w-4 sm:w-5" />
              {wallet ? "Connected" : isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>Testnet Live</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>USDC Gas Fees</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Sub-Second Finality</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
