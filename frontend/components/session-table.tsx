"use client"

import { useEffect, useState } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSessions } from "@/lib/api"
import type { FocusSession } from "@/lib/types"
import { minutesToHhMm } from "@/lib/utils"

type SortField = "startTime" | "duration" | "subject"

export default function SessionTable() {
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [filteredSessions, setFilteredSessions] = useState<FocusSession[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>("startTime")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  useEffect(() => {
    const load = async () => {
      try {
        // Get sessions from last year to now
        const now = new Date()
        const oneYearAgo = new Date(now.getFullYear() - 1, 0, 1)
        
        const apiSessions = await getSessions({
          start_date: oneYearAgo.toISOString().split("T")[0],
          end_date: now.toISOString().split("T")[0],
        })
        
        // Transform API response to match FocusSession type
        const transformed: FocusSession[] = apiSessions.map((s: any) => ({
          id: s.id,
          startTime: s.started_at,
          endTime: s.ended_at,
          duration: Math.floor(s.duration_ms / 60000), // Convert ms to minutes
          subject: s.subject || "All Subjects",
          notes: null, // Notes not implemented yet
        }))
        
        setSessions(transformed)
      } catch (err) {
        console.error("Failed to load sessions:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const sorted = [...sessions]

    sorted.sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase()
        bVal = (bVal as string).toLowerCase()
      }

      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortOrder === "asc" ? cmp : -cmp
    })

    setFilteredSessions(sorted)
  }, [sessions, sortField, sortOrder])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("desc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-500 text-xs">⇅</span>
    return sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
  }

  if (loading) {
    return (
      <Card className="p-6 bg-black border-white/10">
        <h3 className="text-lg font-semibold mb-4 text-white">Sessions</h3>
        <Skeleton className="h-64 w-full bg-gray-800" />
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-black border-white/10">
      <h3 className="text-lg font-semibold mb-4 text-white">Sessions</h3>

      <ScrollArea className="h-64 border border-white/10 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-white/5">
              <TableHead className="w-32 text-gray-400">
                <button className="flex items-center gap-1 hover:text-white" onClick={() => toggleSort("startTime")}>
                  Start Time
                  <SortIcon field="startTime" />
                </button>
              </TableHead>
              <TableHead className="w-24 text-gray-400">End Time</TableHead>
              <TableHead className="w-24 text-gray-400">
                <button className="flex items-center gap-1 hover:text-white" onClick={() => toggleSort("duration")}>
                  Duration
                  <SortIcon field="duration" />
                </button>
              </TableHead>
              <TableHead className="w-28 text-gray-400">
                <button className="flex items-center gap-1 hover:text-white" onClick={() => toggleSort("subject")}>
                  Subject
                  <SortIcon field="subject" />
                </button>
              </TableHead>
              <TableHead className="text-gray-400">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No sessions found
                </TableCell>
              </TableRow>
            ) : (
              filteredSessions.slice(0, 8).map((session) => (
                <TableRow key={session.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-sm text-white">
                    {new Date(session.startTime).toLocaleTimeString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="text-sm text-white">
                    {new Date(session.endTime).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-white">{minutesToHhMm(session.duration)}</TableCell>
                  <TableCell className="text-sm text-white">{session.subject}</TableCell>
                  <TableCell className="text-sm text-gray-400">{session.notes || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
        <span>
          Showing {Math.min(8, filteredSessions.length)} of {filteredSessions.length} sessions
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled className="border-white/10 text-gray-400 bg-transparent">
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled className="border-white/10 text-gray-400 bg-transparent">
            Next
          </Button>
        </div>
      </div>
    </Card>
  )
}
