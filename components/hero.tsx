"use client"

import { Button } from "@/components/ui/button"
import { TrendingUp, Zap, Shield, Wallet } from "lucide-react"
import Link from "next/link"
import { useWallet } from "@/lib/wallet-context"
import { useMouseFollow } from "@/hooks/use-mouse-follow"

export function Hero() {
  const { wallet, isConnecting, connect } = useWallet()
  const badgeHover = useMouseFollow(16)
  const headingHover = useMouseFollow(12)

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
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      >
        <source src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/VIDEO-2026-01-13-02-02-29-kZZLiNXDKvhCIcTajQq4xMDzRoqpAx.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay to ensure foreground content remains visible */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Grid pattern overlay for subtle design element */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />

      <div className="container relative mx-auto px-4 py-24 md:py-32 z-10">
        <div className="mx-auto max-w-4xl text-center">
          {/* Network badge with interactive hover effect */}
          <div
            ref={badgeHover.ref}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 backdrop-blur-sm transition-transform duration-150 ease-out"
            style={{
              transform: badgeHover.transform,
              willChange: "transform",
            }}
          >
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Powered by Arc Network Testnet</span>
          </div>

          {/* Main headline with interactive hover effect */}
          <div
            ref={headingHover.ref}
            className="transition-transform duration-150 ease-out"
            style={{
              transform: headingHover.transform,
              willChange: "transform",
            }}
          >
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-balance md:text-7xl">
              A{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Hedge Fund
              </span>{" "}
              in Your Pocket
            </h1>
          </div>

          <p className="mb-10 text-xl text-muted-foreground text-balance md:text-2xl">
            Trade perpetual futures with up to 50x leverage. Lightning-fast execution with deterministic sub-second
            finality on Arc Network.
          </p>

          <div className="flex w-full flex-col items-center justify-center gap-3 sm:gap-4 md:flex-row">
            <Link href="/trade" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="glow-primary group h-12 sm:h-14 w-full px-6 sm:px-8 text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              >
                Start Trading
                <TrendingUp className="ml-2 h-4 sm:h-5 w-4 sm:w-5 transition-transform duration-300 group-hover:translate-x-1 group-hover:scale-110" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="h-12 sm:h-14 w-full sm:w-auto px-6 sm:px-8 text-base sm:text-lg font-semibold backdrop-blur-sm bg-transparent transition-all duration-300 hover:scale-105 hover:bg-secondary/20 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 focus:ring-offset-background"
              onClick={handleConnect}
              disabled={isConnecting || !!wallet}
            >
              <Wallet className="mr-2 h-4 sm:h-5 w-4 sm:w-5 transition-transform duration-300 group-hover:rotate-12" />
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
