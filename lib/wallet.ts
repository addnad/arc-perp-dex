import { ethers } from "ethers"

declare global {
  interface Window {
    ethereum?: any
  }
}

export const ARC_TESTNET = {
  chainId: "0x4CE642", // 5042002
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: ["https://rpc.testnet.arc.network"],
  blockExplorerUrls: ["https://explorer.testnet.arc.network"],
}

export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000"
export const USDC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
]

export function isPreviewEnvironment(): boolean {
  if (typeof window === "undefined") return false
  return window.location.hostname.includes("vusercontent.net") || window.location.hostname.includes("v0.app")
}

export async function switchToArc() {
  if (!window.ethereum) return
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ARC_TESTNET.chainId }],
    })
  } catch (e: any) {
    if (e.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [ARC_TESTNET],
      })
    } else {
      throw e
    }
  }
}

export async function connectWallet() {
  if (!window.ethereum) {
    alert("Please install MetaMask to use this app")
    return null
  }

  try {
    await switchToArc()
    const provider = new ethers.BrowserProvider(window.ethereum)
    await provider.send("eth_requestAccounts", [])
    const signer = await provider.getSigner()
    const address = await signer.getAddress()

    return { provider, signer, address }
  } catch (error: any) {
    console.error("Wallet connection error:", error)

    if (isPreviewEnvironment()) {
      throw new Error(
        "Wallet connection is limited in preview mode. To test wallet features:\n\n" +
          "1. Click 'Publish' to deploy to Vercel, OR\n" +
          "2. Download the code and run locally\n\n" +
          "The wallet will work perfectly once deployed!",
      )
    }

    if (error.code === 4001) {
      throw new Error("Connection rejected. Please approve the connection in MetaMask.")
    }

    if (error.message?.includes("origin")) {
      throw new Error("Origin error. Please try deploying the app to use wallet features.")
    }

    throw new Error("Failed to connect wallet. Please try again.")
  }
}

export async function fetchUsdcBalance(provider: ethers.BrowserProvider, address: string): Promise<number> {
  try {
    const contract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider)
    const balance = await contract.balanceOf(address)
    const decimals = await contract.decimals()
    return Number(balance) / 10 ** Number(decimals)
  } catch (error) {
    console.error("Error fetching USDC balance:", error)
    return 0
  }
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
