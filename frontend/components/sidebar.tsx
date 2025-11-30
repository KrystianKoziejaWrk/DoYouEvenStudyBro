"use client"

import { Download, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useFilterStore } from "@/lib/store"

interface SidebarProps {
  isOpen: boolean
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const {
    timeRange,
    setTimeRange,
    scope,
    setScope,
    compareMode,
    toggleCompareMode,
    stackBySubject,
    toggleStackBySubject,
  } = useFilterStore()

  return (
    <aside
      className={`
        fixed md:relative z-40 md:z-0
        h-screen w-64 bg-card border-r border-border
        transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
    >
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Time Range */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Time Range</h3>
            <div className="space-y-2">
              {(["week", "month", "year"] as const).map((range) => (
                <label key={range} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={timeRange === range} onCheckedChange={() => setTimeRange(range)} />
                  <span className="text-sm capitalize">{range}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Scope Filter */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Data Scope</h3>
            <div className="space-y-2">
              {(["my_data", "friends", "global"] as const).map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={scope === s} onCheckedChange={() => setScope(s)} />
                  <span className="text-sm capitalize">{s.replace("_", " ")}</span>
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* Visualization Options */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Viz Options</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={compareMode} onCheckedChange={toggleCompareMode} />
                <span className="text-sm">Compare Mode</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={stackBySubject} onCheckedChange={toggleStackBySubject} />
                <span className="text-sm">Stack by Subject</span>
              </label>
            </div>
          </div>

          <Separator />

          {/* Export & Settings */}
          <div className="space-y-2 pt-2">
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              size="sm"
              onClick={() => {
                const csv = "Subject,Minutes\nWork,845\nStudy,620\n..."
                const link = document.createElement("a")
                link.href = "data:text/csv," + encodeURIComponent(csv)
                link.download = "focus-data.csv"
                link.click()
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" className="w-full justify-start bg-transparent" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>
      </ScrollArea>
    </aside>
  )
}
