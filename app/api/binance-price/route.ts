export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const asset = searchParams.get("asset")

  const BINANCE_SYMBOLS: Record<string, string> = {
    BTC: "BTCUSDT",
    ETH: "ETHUSDT",
    SOL: "SOLUSDT",
    AVAX: "AVAXUSDT",
    ADA: "ADAUSDT",
    XRP: "XRPUSDT",
    DOT: "DOTUSDT",
    LINK: "LINKUSDT",
  }

  const symbol = asset ? BINANCE_SYMBOLS[asset] : null
  if (!symbol) {
    return Response.json({ error: "Asset not supported" }, { status: 400 })
  }

  try {
    const res = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`)
    const data = await res.json()
    const price = Number.parseFloat(data.price)

    // Convert to 8 decimals (standard oracle format)
    const price8 = BigInt(Math.round(price * 1e8)).toString()

    return Response.json({ price8, priceDecimal: price })
  } catch (error) {
    console.error("Binance API error:", error)
    return Response.json({ error: "Failed to fetch price" }, { status: 500 })
  }
}
