import { ethers } from "ethers"

// Smart contract ABIs
export const USDC_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
]

export const ARC_PERP_VAULT_ABI = [
  "function openPosition(string asset, int8 leverage) external payable",
  "function closePosition(string asset) external",
  "function positions(address user, string asset) view returns (int256 size, uint256 entryPrice, uint256 margin)",
  "function getPrice(string asset) view returns (uint256)",
  "function updatePrice(string asset, uint256 price) external",
  "function getRecentTrades(uint256 limit) view returns (tuple(address user, uint256 margin, int8 leverage, bool isLong, uint256 entryPrice, uint256 exitPrice, int256 pnl, uint256 timestamp)[])",
  "event PositionOpened(address indexed user, string asset, int256 size, uint256 price, uint256 margin)",
  "event PositionClosed(address indexed user, string asset, int256 pnl)",
]

export const ARC_PRICE_ORACLE_ABI = [
  "function setPrice(uint256 _price) external",
  "function getPrice() view returns (uint256)",
  "function price() view returns (uint256)",
]

// Contract addresses on Arc Testnet
export const CONTRACTS = {
  USDC: "0x3600000000000000000000000000000000000000",
  ARC_PERP_VAULT: "0xF2d1584EDF324bee38b2B200e48e820447B85D0F",
  ARC_PRICE_ORACLE: "0x0000000000000000000000000000000000000000",
}

// Helper to convert USDC amount to wei (USDC has 18 decimals on Arc)
export function usdcToWei(amount: number): bigint {
  return ethers.parseUnits(amount.toString(), 18)
}

// Helper to convert wei to USDC
export function weiToUsdc(wei: bigint): number {
  return Number(ethers.formatUnits(wei, 18))
}

// Helper to convert price to oracle format (price * 1e8)
export function priceToOracle(price: number): bigint {
  return BigInt(Math.floor(price * 1e8))
}

export async function approveUSDC(provider: ethers.BrowserProvider, address: string, amount: number): Promise<boolean> {
  try {
    const signer = await provider.getSigner()
    const usdcContract = new ethers.Contract(CONTRACTS.USDC, USDC_ABI, signer)

    const amountWei = usdcToWei(amount)
    const tx = await usdcContract.approve(CONTRACTS.ARC_PERP_VAULT, amountWei)
    await tx.wait()

    console.log("[v0] USDC approved:", tx.hash)
    return true
  } catch (error) {
    console.error("[v0] Error approving USDC:", error)
    return false
  }
}

export async function checkAllowance(provider: ethers.BrowserProvider, address: string): Promise<number> {
  try {
    const usdcContract = new ethers.Contract(CONTRACTS.USDC, USDC_ABI, provider)
    const allowance = await usdcContract.allowance(address, CONTRACTS.ARC_PERP_VAULT)
    return weiToUsdc(allowance)
  } catch (error) {
    console.error("[v0] Error checking allowance:", error)
    return 0
  }
}

export async function executeTradeOnChain(
  provider: ethers.BrowserProvider,
  margin: number,
  leverage: number,
  isLong: boolean,
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const signer = await provider.getSigner()
    const vaultContract = new ethers.Contract(CONTRACTS.ARC_PERP_VAULT, ARC_PERP_VAULT_ABI, signer)

    const marginWei = usdcToWei(margin)

    console.log("[v0] Opening position:", { margin, leverage, isLong })

    const tx = await vaultContract.openPosition("USDC", leverage, { value: marginWei })
    console.log("[v0] Transaction sent:", tx.hash)

    const receipt = await tx.wait()
    console.log("[v0] Transaction confirmed:", receipt.hash)

    return { success: true, txHash: receipt.hash }
  } catch (error: any) {
    console.error("[v0] Error executing trade:", error)
    return { success: false, error: error.message || "Transaction failed" }
  }
}

export async function getUserPosition(
  provider: ethers.BrowserProvider,
  address: string,
): Promise<{
  size: number
  entryPrice: number
  margin: number
  isLong: boolean
} | null> {
  try {
    const vaultContract = new ethers.Contract(CONTRACTS.ARC_PERP_VAULT, ARC_PERP_VAULT_ABI, provider)
    const position = await vaultContract.positions(address, "USDC")

    if (position.size === 0n) return null

    return {
      size: Number(position.size),
      entryPrice: Number(position.entryPrice) / 1e8,
      margin: weiToUsdc(position.margin),
      isLong: position.size > 0,
    }
  } catch (error) {
    console.error("[v0] Error getting position:", error)
    return null
  }
}

export async function getRecentTrades(provider: ethers.BrowserProvider, limit: number): Promise<any[]> {
  try {
    const vaultContract = new ethers.Contract(CONTRACTS.ARC_PERP_VAULT, ARC_PERP_VAULT_ABI, provider)
    const trades = await vaultContract.getRecentTrades(limit)
    return trades
  } catch (error) {
    console.error("[v0] Error getting recent trades:", error)
    return []
  }
}
