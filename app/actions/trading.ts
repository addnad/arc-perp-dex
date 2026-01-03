"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createPosition({
  walletAddress,
  pair,
  side,
  size,
  collateral,
  entryPrice,
  leverage,
  liquidationPrice,
  txHash,
}: {
  walletAddress: string
  pair: string
  side: "long" | "short"
  size: number
  collateral: number
  entryPrice: number
  leverage: number
  liquidationPrice: number
  txHash?: string
}) {
  const supabase = await createClient()

  // Create position record
  const { data: position, error: positionError } = await supabase
    .from("positions")
    .insert({
      wallet_address: walletAddress,
      pair,
      side,
      size,
      collateral,
      entry_price: entryPrice,
      leverage,
      liquidation_price: liquidationPrice,
      status: "open",
      tx_hash: txHash,
    })
    .select()
    .single()

  if (positionError) {
    console.error("Error creating position:", positionError)
    throw new Error("Failed to create position")
  }

  // Create trade history entry
  const { error: historyError } = await supabase.from("trade_history").insert({
    wallet_address: walletAddress,
    pair,
    side,
    size,
    collateral,
    entry_price: entryPrice,
    action: "open",
    tx_hash: txHash,
  })

  if (historyError) {
    console.error("Error creating trade history:", historyError)
  }

  revalidatePath("/portfolio")
  revalidatePath("/trade")

  return position
}

export async function closePosition({
  positionId,
  exitPrice,
  walletAddress,
}: {
  positionId: string
  exitPrice: number
  walletAddress: string
}) {
  const supabase = await createClient()

  // Get the position
  const { data: position, error: fetchError } = await supabase
    .from("positions")
    .select("*")
    .eq("id", positionId)
    .eq("wallet_address", walletAddress)
    .single()

  if (fetchError || !position) {
    throw new Error("Position not found")
  }

  // Calculate realized PnL
  const priceChange = exitPrice - position.entry_price
  const multiplier = position.side === "long" ? 1 : -1
  const realizedPnl = (priceChange / position.entry_price) * position.size * multiplier

  // Update position
  const { error: updateError } = await supabase
    .from("positions")
    .update({
      status: "closed",
      exit_price: exitPrice,
      realized_pnl: realizedPnl,
      closed_at: new Date().toISOString(),
    })
    .eq("id", positionId)

  if (updateError) {
    throw new Error("Failed to close position")
  }

  // Create trade history entry
  await supabase.from("trade_history").insert({
    wallet_address: walletAddress,
    pair: position.pair,
    side: position.side,
    size: position.size,
    collateral: position.collateral,
    entry_price: position.entry_price,
    exit_price: exitPrice,
    realized_pnl: realizedPnl,
    action: "close",
  })

  revalidatePath("/portfolio")
  revalidatePath("/trade")

  return { realizedPnl }
}
