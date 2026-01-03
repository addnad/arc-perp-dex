import { ethers } from "ethers"

declare global {
  interface Window {
    ethereum?: any
  }
}

export const ARC_TESTNET = {
  chainId: "0x4CEF52", // 5042002 - corrected from chainlist.org
  chainName: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.testnet.arc.network"],
  blockExplorerUrls: ["https://testnet.arcscan.app"],
}

export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000"
export const USDC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
]

export async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask or another Web3 wallet to use this app")
    return null
  }

  try {
    console.log("[v0] Requesting wallet accounts...")
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found. Please unlock your wallet.")
    }

    console.log("[v0] Account connected:", accounts[0])

    try {
      console.log("[v0] Attempting to switch to Arc Testnet...")
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ARC_TESTNET.chainId }],
      })
      console.log("[v0] Successfully switched to Arc Testnet")
    } catch (switchError: any) {
      console.log("[v0] Switch error:", switchError)
      // Chain not added, try to add it
      if (switchError.code === 4902 || switchError.message?.includes("Unrecognized chain")) {
        console.log("[v0] Arc Network not found, adding it...")
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [ARC_TESTNET],
        })
        console.log("[v0] Arc Network added successfully")
      } else {
        throw switchError
      }
    }

    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const address = await signer.getAddress()

    console.log("[v0] Wallet connected successfully:", address)
    return { provider, signer, address }
  } catch (error: any) {
    console.error("[v0] Connection error:", error)

    if (error.code === 4001) {
      throw new Error("Connection rejected. Please approve the connection in your wallet.")
    }

    if (error.code === 4902) {
      throw new Error("Failed to add Arc Network. Please add it manually in your wallet settings.")
    }

    throw new Error(error.message || "Failed to connect wallet. Please try again.")
  }
}

export async function fetchUsdcBalance(provider: ethers.BrowserProvider, address: string): Promise<number> {
  try {
    console.log("[v0] Fetching USDC balance for:", address)
    const contract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)
    const balance = await contract.balanceOf(address)
    const decimals = await contract.decimals()
    const formattedBalance = Number(balance) / 10 ** Number(decimals)
    console.log("[v0] USDC balance:", formattedBalance)
    return formattedBalance
  } catch (error) {
    console.error("[v0] Error fetching USDC balance:", error)
    return 0
  }
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export async function getWalletAddress(): Promise<string | null> {
  if (!window.ethereum) return null
  try {
    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    return await signer.getAddress()
  } catch {
    return null
  }
}
