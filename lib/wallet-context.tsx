"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { ethers } from "ethers"
import { connectWallet, fetchUsdcBalance } from "./wallet"

interface WalletContextType {
  wallet: {
    provider: ethers.BrowserProvider
    signer: ethers.Signer
    address: string
  } | null
  usdcBalance: number | null
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<any>(null)
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
        console.error("[v0] Error checking wallet connection:", error)
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
      console.error("[v0] Error connecting wallet:", error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    setWallet(null)
    setUsdcBalance(null)
  }

  return (
    <WalletContext.Provider
      value={{
        wallet,
        usdcBalance,
        isConnecting,
        connect: handleConnect,
        disconnect: handleDisconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
