"use client"

import { create } from "zustand"
import type { Subject } from "./types"

interface FilterState {
  timeRange: "week" | "month" | "year"
  selectedSubject: string | null // changed to track selected subject
  timezone: string
  scope: "my_data" | "friends" | "global"
  compareMode: boolean
  stackBySubject: boolean
  unitsMode: "minutes" | "hours"
  theme: "light" | "dark"
  subjects: Subject[] // added subjects list
  showAllSubjects: boolean // track if viewing all subjects

  setTimeRange: (range: "week" | "month" | "year") => void
  setSelectedSubject: (subject: string | null) => void // updated
  setTimezone: (tz: string) => void
  setScope: (scope: "my_data" | "friends" | "global") => void
  toggleCompareMode: () => void
  toggleStackBySubject: () => void
  setUnitsMode: (mode: "minutes" | "hours") => void
  setTheme: (theme: "light" | "dark") => void
  addSubject: (subject: Subject) => void // added
  updateSubject: (subject: Subject) => void // added
  deleteSubject: (id: string) => void // added
  mergeSubjects: (sourceId: string, targetId: string) => void // added
  setShowAllSubjects: (show: boolean) => void // added
  setSubjects: (subjects: Subject[]) => void // added
}

export const useFilterStore = create<FilterState>((set) => ({
  timeRange: "week",
  selectedSubject: null,
  timezone: "America/Chicago",
  scope: "my_data",
  compareMode: false,
  stackBySubject: false,
  unitsMode: "minutes",
  theme: "light",
  subjects: [], // Loaded from database via API
  showAllSubjects: true,

  setTimeRange: (range) => set({ timeRange: range }),
  setSelectedSubject: (subject) => set({ selectedSubject: subject }),
  setTimezone: (tz) => set({ timezone: tz }),
  setScope: (scope) => set({ scope }),
  toggleCompareMode: () => set((state) => ({ compareMode: !state.compareMode })),
  toggleStackBySubject: () => set((state) => ({ stackBySubject: !state.stackBySubject })),
  setUnitsMode: (mode) => set({ unitsMode: mode }),
  setTheme: (theme) => set({ theme }),
  addSubject: (subject) => set((state) => {
    // Don't add if already exists
    if (state.subjects.find(s => s.id === subject.id)) return state
    return { subjects: [...state.subjects, subject] }
  }),
  updateSubject: (subject) =>
    set((state) => ({
      subjects: state.subjects.map((s) => (s.id === subject.id ? subject : s)),
    })),
  deleteSubject: (id) =>
    set((state) => ({
      subjects: state.subjects.filter((s) => s.id !== id),
    })),
  setSubjects: (newSubjects) => set({ subjects: newSubjects }),
  mergeSubjects: (sourceId, targetId) =>
    set((state) => ({
      subjects: state.subjects.filter((s) => s.id !== sourceId),
    })),
  setShowAllSubjects: (show) => set({ showAllSubjects: show }),
}))
