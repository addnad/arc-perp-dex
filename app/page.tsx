import { Hero } from "@/components/hero"
import { Markets } from "@/components/markets"
import { Features } from "@/components/features"
import { Stats } from "@/components/stats"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Stats />
      <Markets />
      <Features />
    </div>
  )
}
