"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function FaucetPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to external faucet
    window.location.href = "https://easyfaucetarc.xyz/"
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-2xl font-bold">Redirecting to Arc Faucet...</div>
        <div className="text-muted-foreground">
          If you are not redirected automatically,{" "}
          <a href="https://easyfaucetarc.xyz/" className="text-primary hover:underline">
            click here
          </a>
          .
        </div>
      </div>
    </div>
  )
}
