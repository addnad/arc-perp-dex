"use client"

import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowDownUp } from "lucide-react"

export default function SwapPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-md">
          <h1 className="mb-8 text-center text-4xl font-bold">Swap</h1>
          <Card className="glass-card border-border/50 p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="from-amount">From</Label>
                <Input id="from-amount" type="number" placeholder="0.00" className="mt-2 text-lg" />
                <p className="mt-1 text-sm text-muted-foreground">Any Token</p>
              </div>

              <div className="flex justify-center">
                <Button size="icon" variant="outline" className="rounded-full bg-transparent">
                  <ArrowDownUp className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label htmlFor="to-amount">To</Label>
                <Input id="to-amount" type="number" placeholder="0.00" className="mt-2 text-lg" disabled />
                <p className="mt-1 text-sm text-muted-foreground">USDC</p>
              </div>

              <Button className="w-full glow-primary" size="lg">
                Swap to USDC
              </Button>

              <p className="text-center text-xs text-muted-foreground">Swap any token to USDC on Arc Network</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
