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

const DEFILLAMA_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  MATIC: "polygon",
  DOT: "polkadot",
  AVAX: "avalanche",
  LINK: "chainlink",
  UNI: "uniswap",
}

const priceCache = new Map<string, { price: number; timestamp: number }>()
const CACHE_DURATION = 300000 // 5 minutes
const inFlightRequests = new Map<string, Promise<number>>()

async function fetchFromDefiLlama(asset: string): Promise<number | null> {
  try {
    const coinId = DEFILLAMA_IDS[asset]
    const res = await fetch(`https://coins.llama.fi/prices/current/${coinId}`)

    if (!res.ok) return null

    const data = await res.json()
    const price = data.coins?.[`${coinId.toLowerCase()}:usd`]?.price

    return price ? Number(price) : null
  } catch (error) {
    console.error(`[v0] DefiLlama fallback failed for ${asset}:`, error)
    return null
  }
}

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

  if (inFlightRequests.has(asset)) {
    try {
      const price = await inFlightRequests.get(asset)!
      const price8 = BigInt(Math.round(price * 1e8)).toString()
      return Response.json({ price8, priceDecimal: price, deduped: true })
    } catch (error) {
      console.error(`[v0] Deduped request failed for ${asset}`)
    }
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`, {
        headers: {
          Accept: "application/json",
        },
      })

      if (!res.ok) {
        if (res.status === 429) {
          console.log(`[v0] CoinGecko rate limited for ${asset}, trying DefiLlama fallback`)
          const defiLlamaPrice = await fetchFromDefiLlama(asset)
          if (defiLlamaPrice) {
            priceCache.set(asset, { price: defiLlamaPrice, timestamp: Date.now() })
            return defiLlamaPrice
          }
        }
        throw new Error(`CoinGecko API returned ${res.status}`)
      }

      const data = await res.json()
      const price = data[coinId]?.usd

      if (!price || typeof price !== "number") {
        throw new Error("Invalid price data from CoinGecko")
      }

      priceCache.set(asset, { price, timestamp: Date.now() })
      return price
    } catch (error: any) {
      console.error(`[v0] CoinGecko error for ${asset}:`, error.message)

      const defiLlamaPrice = await fetchFromDefiLlama(asset)
      if (defiLlamaPrice) {
        priceCache.set(asset, { price: defiLlamaPrice, timestamp: Date.now() })
        return defiLlamaPrice
      }

      if (cached) {
        return cached.price
      }

      throw error
    }
  })()

  inFlightRequests.set(asset, fetchPromise)

  try {
    const price = await fetchPromise
    const price8 = BigInt(Math.round(price * 1e8)).toString()
    return Response.json({ price8, priceDecimal: price, cached: false })
  } catch (error: any) {
    console.error(`[v0] All price sources failed for ${asset}:`, error)

    if (cached) {
      const price8 = BigInt(Math.round(cached.price * 1e8)).toString()
      return Response.json({ price8, priceDecimal: cached.price, cached: true, stale: true }, { status: 200 })
    }

    return Response.json({ error: "Failed to fetch price from all sources" }, { status: 500 })
  } finally {
    inFlightRequests.delete(asset)
  }
}
