const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  MATIC: "matic-network",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  UNI: "uniswap",
}

const priceCache = new Map<string, { price: number; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const asset = searchParams.get("asset")

  const coinId = asset ? COINGECKO_IDS[asset] : null
  if (!coinId) {
    return Response.json({ error: "Asset not supported" }, { status: 400 })
  }

  const cached = priceCache.get(asset)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    const price8 = BigInt(Math.round(cached.price * 1e8)).toString()
    return Response.json({ price8, priceDecimal: cached.price, cached: true })
  }

  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!res.ok) {
      if (res.status === 429 && cached) {
        console.log(`[v0] Rate limited, using cached price for ${asset}`)
        const price8 = BigInt(Math.round(cached.price * 1e8)).toString()
        return Response.json({ price8, priceDecimal: cached.price, cached: true, rateLimited: true })
      }
      throw new Error(`CoinGecko API returned ${res.status}`)
    }

    const data = await res.json()
    const price = data[coinId]?.usd

    if (!price || typeof price !== "number") {
      throw new Error("Invalid price data from CoinGecko")
    }

    priceCache.set(asset, { price, timestamp: Date.now() })

    // Convert to 8 decimals (standard oracle format)
    const price8 = BigInt(Math.round(price * 1e8)).toString()

    return Response.json({ price8, priceDecimal: price, cached: false })
  } catch (error: any) {
    console.error("CoinGecko API error:", error.message || error)

    if (cached) {
      console.log(`[v0] Error occurred, using cached price for ${asset}`)
      const price8 = BigInt(Math.round(cached.price * 1e8)).toString()
      return Response.json({ price8, priceDecimal: cached.price, cached: true, error: true })
    }

    return Response.json({ error: "Failed to fetch price from CoinGecko" }, { status: 500 })
  }
}
