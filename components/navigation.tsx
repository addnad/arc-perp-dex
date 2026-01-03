"use client"

import { Button } from "@/components/ui/button"
import { Activity, Menu, X, Wallet } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { connectWallet, fetchUsdcBalance, formatAddress } from "@/lib/wallet"
import type { ethers } from "ethers"

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [wallet, setWallet] = useState<{
    provider: ethers.BrowserProvider
    signer: ethers.Signer
    address: string
  } | null>(null)
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    checkWalletConnection()
  }, [])

  useEffect(() => {
    if (wallet) {
      fetchBalance()
      const interval = setInterval(fetchBalance, 10000)
      return () => clearInterval(interval)
    }
  }, [wallet])

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" })
        if (accounts.length > 0) {
          await handleConnect()
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error)
      }
    }
  }

  const fetchBalance = async () => {
    if (wallet) {
      const balance = await fetchUsdcBalance(wallet.provider, wallet.address)
      setUsdcBalance(balance)
    }
  }

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      const walletData = await connectWallet()
      if (walletData) {
        setWallet(walletData)
      }
    } catch (error: any) {
      console.error("Error connecting wallet:", error)
      const errorMessage = error.message || "Failed to connect wallet. Please try again."

      // Use a custom styled alert for preview environment
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
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setWallet(null)
    setUsdcBalance(null)
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <div className="rounded-lg bg-gradient-to-br from-primary to-secondary p-2">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Arc Perps</span>
          </Link>

          {/* Desktop menu */}
          <div className="hidden items-center gap-8 md:flex">
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
              Markets
            </Link>
            <Link href="/trade" className="text-sm font-medium transition-colors hover:text-primary">
              Trade
            </Link>
            <Link href="/portfolio" className="text-sm font-medium transition-colors hover:text-primary">
              Portfolio
            </Link>
            <Link href="/swap" className="text-sm font-medium transition-colors hover:text-primary">
              Swap
            </Link>
            <Link href="/leaderboard" className="text-sm font-medium transition-colors hover:text-primary">
              Leaderboard
            </Link>
            <Link href="/docs" className="text-sm font-medium transition-colors hover:text-primary">
              Docs
            </Link>
          </div>

          {/* Connect wallet button */}
          <div className="hidden items-center gap-4 md:flex">
            <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Arc Testnet
            </div>
            {wallet ? (
              <div className="flex items-center gap-3">
                {usdcBalance !== null && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium">
                    {usdcBalance.toFixed(2)} USDC
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                  onClick={disconnectWallet}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  {formatAddress(wallet.address)}
                </Button>
              </div>
            ) : (
              <Button size="sm" className="glow-primary" onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border/50 py-4 md:hidden">
            <div className="flex flex-col gap-4">
              <Link href="/" className="text-sm font-medium">
                Markets
              </Link>
              <Link href="/trade" className="text-sm font-medium">
                Trade
              </Link>
              <Link href="/portfolio" className="text-sm font-medium">
                Portfolio
              </Link>
              <Link href="/swap" className="text-sm font-medium">
                Swap
              </Link>
              <Link href="/leaderboard" className="text-sm font-medium">
                Leaderboard
              </Link>
              <Link href="/docs" className="text-sm font-medium">
                Docs
              </Link>
              {wallet ? (
                <>
                  {usdcBalance !== null && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-center">
                      {usdcBalance.toFixed(2)} USDC
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-primary/30 bg-primary/10 text-primary"
                    onClick={disconnectWallet}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    {formatAddress(wallet.address)}
                  </Button>
                </>
              ) : (
                <Button size="sm" className="glow-primary w-full" onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
