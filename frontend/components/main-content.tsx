"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import TopRow from "./top-row"
import SubjectBar from "./subject-bar"
import WeeklyCalendar from "./weekly-calendar"
import Last30Line from "./last-30-line"
import YearHeatmap from "./year-heatmap"

export default function MainContent() {
  return (
    <ScrollArea className="flex-1 w-full bg-black">
      <div className="p-6 space-y-6 max-w-full">
        {/* Top Row: Pie Chart, XP/Rank, Streak */}
        <div className="animate-in fade-in-50 duration-500">
          <TopRow />
        </div>

        {/* Subject Bar for filtering */}
        <div className="animate-in fade-in-50 duration-700">
          <SubjectBar />
        </div>

        <div className="animate-in fade-in-50 duration-700">
          <WeeklyCalendar />
        </div>

        {/* 30-day trend */}
        <div className="animate-in fade-in-50 duration-700">
          <Last30Line />
        </div>

        <div className="animate-in fade-in-50 duration-700">
          <YearHeatmap />
        </div>
      </div>
    </ScrollArea>
  )
}
