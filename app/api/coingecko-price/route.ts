export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const asset = searchParams.get("asset")

  const COINGECKO_IDS: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    SOL: "solana",
    AVAX: "avalanche-2",
    ADA: "cardano",
    XRP: "ripple",
    DOT: "polkadot",
    LINK: "chainlink",
  }

  const coinId = asset ? COINGECKO_IDS[asset] : null
  if (!coinId) {
    return Response.json({ error: "Asset not supported" }, { status: 400 })
  }

  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!res.ok) {
      throw new Error(`CoinGecko API returned ${res.status}`)
    }

    const data = await res.json()
    const price = data[coinId]?.usd

    if (!price || typeof price !== "number") {
      throw new Error("Invalid price data from CoinGecko")
    }

    // Convert to 8 decimals (standard oracle format)
    const price8 = BigInt(Math.round(price * 1e8)).toString()

    return Response.json({ price8, priceDecimal: price })
  } catch (error: any) {
    console.error("CoinGecko API error:", error.message || error)
    return Response.json({ error: "Failed to fetch price from CoinGecko" }, { status: 500 })
  }
}
