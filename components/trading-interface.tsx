"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, Info } from "lucide-react"

export function TradingInterface() {
  const [leverage, setLeverage] = useState([10])
  const [position, setPosition] = useState<"long" | "short">("long")
  const [collateral, setCollateral] = useState("")

  const calculatePositionSize = () => {
    if (!collateral) return "0.00"
    return (Number.parseFloat(collateral) * leverage[0]).toFixed(2)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart placeholder - Left side (2 columns) */}
        <div className="lg:col-span-2">
          <Card className="glass-card h-[600px] overflow-hidden border-border/50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">BTC/USDC</h2>
                <p className="text-3xl font-bold font-mono text-success">$42,156.32</p>
                <p className="text-sm text-success">+2.45% (24h)</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  1m
                </Button>
                <Button variant="outline" size="sm">
                  5m
                </Button>
                <Button variant="outline" size="sm">
                  15m
                </Button>
                <Button variant="default" size="sm">
                  1h
                </Button>
                <Button variant="outline" size="sm">
                  4h
                </Button>
                <Button variant="outline" size="sm">
                  1D
                </Button>
              </div>
            </div>

            {/* Chart visualization placeholder */}
            <div className="flex h-[500px] items-center justify-center rounded-lg border border-border/30 bg-muted/20">
              <div className="text-center text-muted-foreground">
                <TrendingUp className="mx-auto mb-2 h-12 w-12" />
                <p>TradingView Chart Integration</p>
                <p className="text-sm">Real-time candlestick chart with technical indicators</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Order panel - Right side (1 column) */}
        <div className="lg:col-span-1">
          <Card className="glass-card border-border/50 p-6">
            <Tabs value={position} onValueChange={(v) => setPosition(v as "long" | "short")}>
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="long" className="data-[state=active]:bg-success data-[state=active]:text-white">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Long
                </TabsTrigger>
                <TabsTrigger
                  value="short"
                  className="data-[state=active]:bg-destructive data-[state=active]:text-white"
                >
                  <TrendingDown className="mr-2 h-4 w-4" />
                  Short
                </TabsTrigger>
              </TabsList>

              <TabsContent value="long" className="space-y-6">
                <OrderForm
                  position="long"
                  leverage={leverage}
                  setLeverage={setLeverage}
                  collateral={collateral}
                  setCollateral={setCollateral}
                  calculatePositionSize={calculatePositionSize}
                />
              </TabsContent>

              <TabsContent value="short" className="space-y-6">
                <OrderForm
                  position="short"
                  leverage={leverage}
                  setLeverage={setLeverage}
                  collateral={collateral}
                  setCollateral={setCollateral}
                  calculatePositionSize={calculatePositionSize}
                />
              </TabsContent>
            </Tabs>
          </Card>

          {/* Position info card */}
          <Card className="glass-card mt-6 border-border/50 p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Arc Network Testnet</p>
                <p className="mt-1">Trading with testnet USDC. No real value at risk.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function OrderForm({
  position,
  leverage,
  setLeverage,
  collateral,
  setCollateral,
  calculatePositionSize,
}: {
  position: "long" | "short"
  leverage: number[]
  setLeverage: (value: number[]) => void
  collateral: string
  setCollateral: (value: string) => void
  calculatePositionSize: () => string
}) {
  return (
    <div className="space-y-6">
      {/* Leverage slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Leverage</Label>
          <span className={`text-lg font-bold font-mono ${position === "long" ? "text-success" : "text-destructive"}`}>
            {leverage[0]}x
          </span>
        </div>
        <Slider value={leverage} onValueChange={setLeverage} min={1} max={50} step={1} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1x</span>
          <span>50x</span>
        </div>
      </div>

      {/* Collateral input */}
      <div className="space-y-2">
        <Label>Collateral (USDC)</Label>
        <div className="relative">
          <Input
            type="number"
            placeholder="0.00"
            value={collateral}
            onChange={(e) => setCollateral(e.target.value)}
            className="pr-16 font-mono"
          />
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1 h-8 text-xs"
            onClick={() => setCollateral("1000")}
          >
            MAX
          </Button>
        </div>
      </div>

      {/* Position size */}
      <div className="space-y-2">
        <Label>Position Size</Label>
        <div className="rounded-lg bg-muted/50 p-3 font-mono text-2xl font-bold">${calculatePositionSize()}</div>
      </div>

      {/* Order details */}
      <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Entry Price</span>
          <span className="font-mono font-medium">$42,156.32</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Liquidation Price</span>
          <span className="font-mono font-medium text-destructive">
            ${position === "long" ? "38,150.00" : "46,162.64"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Est. Gas Fee</span>
          <span className="font-mono font-medium">$0.05 USDC</span>
        </div>
      </div>

      {/* Open position button */}
      <Button
        size="lg"
        className={`w-full text-lg font-semibold ${position === "long" ? "glow-success bg-success hover:bg-success/90" : "glow-destructive bg-destructive hover:bg-destructive/90"}`}
      >
        Open {position === "long" ? "Long" : "Short"} Position
      </Button>
    </div>
  )
}
