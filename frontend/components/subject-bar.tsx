"use client"

import { useState } from "react"
import { Plus, ChevronDown, Trash2, PencilIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFilterStore } from "@/lib/store"
import type { Subject } from "@/lib/types"
import ColorPicker from "@/components/color-picker"
import { getSubjects, createSubject, updateSubject as updateSubjectAPI, deleteSubject as deleteSubjectAPI } from "@/lib/api"
import { useEffect } from "react"

export default function SubjectBar() {
  const {
    subjects,
    selectedSubject,
    setSelectedSubject,
    showAllSubjects,
    setShowAllSubjects,
    addSubject,
    updateSubject,
    deleteSubject,
    setSubjects,
  } = useFilterStore()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState("")
  const [newSubjectColor, setNewSubjectColor] = useState("#3b82f6")
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(false)

  // Load subjects from API on mount and replace store
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        const apiSubjects = await getSubjects()
        console.log("📚 Loaded subjects from API:", apiSubjects)
        // Convert API subjects to store format
        const storeSubjects = apiSubjects.map((s: any) => ({
          id: String(s.id),
          name: s.name,
          color: s.color || "#3b82f6",
          createdAt: s.createdAt || new Date().toISOString(),
        }))
        // Replace all subjects in store with API subjects
        setSubjects(storeSubjects)
      } catch (err) {
        console.error("Failed to load subjects:", err)
      }
    }
    loadSubjects()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return
    
    setLoading(true)
    try {
      // Ensure color is in hex format
      const colorHex = newSubjectColor.startsWith("#") ? newSubjectColor : `#${newSubjectColor}`
      
      const created = await createSubject({
        name: newSubjectName.trim(),
        color: colorHex,
      })
      
      // Reload all subjects from database to ensure sync
      const apiSubjects = await getSubjects()
      const storeSubjects = apiSubjects.map((s: any) => ({
        id: String(s.id),
        name: s.name,
        color: s.color || "#3b82f6",
        createdAt: s.createdAt || new Date().toISOString(),
      }))
      setSubjects(storeSubjects)
      
      setNewSubjectName("")
      setNewSubjectColor("#3b82f6")
      setShowCreateDialog(false)
    } catch (err: any) {
      console.error("Failed to create subject:", err)
      alert(err.message || "Failed to create subject. Make sure you're logged in.")
    } finally {
      setLoading(false)
    }
  }

  const handleChangeColor = (color: string) => {
    setNewSubjectColor(color)
  }

  const handleSaveColor = async () => {
    if (!editingSubject) return
    
    setLoading(true)
    try {
      // Ensure color is in hex format
      const colorHex = newSubjectColor.startsWith("#") ? newSubjectColor : `#${newSubjectColor}`
      console.log("🎨 Saving color:", { subjectId: editingSubject.id, color: colorHex })
      await updateSubjectAPI(Number(editingSubject.id), { color: colorHex })
      console.log("✅ Color saved successfully")
      
      // Reload all subjects from database to ensure sync
      const apiSubjects = await getSubjects()
      const storeSubjects = apiSubjects.map((s: any) => ({
        id: String(s.id),
        name: s.name,
        color: s.color || "#3b82f6",
        createdAt: s.createdAt || new Date().toISOString(),
      }))
      setSubjects(storeSubjects)
      console.log("✅ Subjects reloaded from database")
      
      setShowColorPicker(false)
      setEditingSubject(null)
    } catch (err: any) {
      console.error("❌ Failed to update color:", err)
      alert(err.message || "Failed to update color. Make sure you're logged in.")
    } finally {
      setLoading(false)
    }
  }

  const handleRenameSubject = async () => {
    if (!editingSubject || !newSubjectName.trim()) return
    
    setLoading(true)
    try {
      console.log("✏️ Renaming subject:", { subjectId: editingSubject.id, newName: newSubjectName })
      await updateSubjectAPI(Number(editingSubject.id), { name: newSubjectName.trim() })
      console.log("✅ Subject renamed successfully")
      
      // Reload all subjects from database to ensure sync
      const apiSubjects = await getSubjects()
      const storeSubjects = apiSubjects.map((s: any) => ({
        id: String(s.id),
        name: s.name,
        color: s.color || "#3b82f6",
        createdAt: s.createdAt || new Date().toISOString(),
      }))
      setSubjects(storeSubjects)
      
      setShowRenameDialog(false)
      setNewSubjectName("")
      setEditingSubject(null)
    } catch (err) {
      console.error("Failed to rename subject:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSubject = async () => {
    if (!editingSubject) return
    
    setLoading(true)
    try {
      console.log("🗑️ Deleting subject:", editingSubject)
      
      // Delete from database via API
      await deleteSubjectAPI(Number(editingSubject.id))
      console.log("✅ Subject deleted from database")
      
      // Reload subjects from database to ensure sync (this will remove it from store)
      const apiSubjects = await getSubjects()
      console.log("📚 Reloaded subjects from API:", apiSubjects)
      const storeSubjects = apiSubjects.map((s: any) => ({
        id: String(s.id),
        name: s.name,
        color: s.color || "#3b82f6",
        createdAt: s.createdAt || new Date().toISOString(),
      }))
      setSubjects(storeSubjects)
      console.log("✅ Subjects updated in store")
      
      setShowDeleteConfirm(false)
      setEditingSubject(null)
    } catch (err: any) {
      console.error("❌ Failed to delete subject:", err)
      alert(err.message || "Failed to delete subject. Make sure you're logged in.")
    } finally {
      setLoading(false)
    }
  }

  const allSubjects = subjects.find(s => s.name === "All Subjects") || subjects[0]
  const otherSubjects = subjects.filter(s => s.name !== "All Subjects")

  return (
    <>
      <Card className="p-4 flex items-center gap-3 overflow-x-auto flex-nowrap flex-row bg-black border-white/10">
        {/* All Subjects Tab */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant={showAllSubjects ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setShowAllSubjects(true)
              setSelectedSubject(null)
            }}
            className={`flex-shrink-0 ${
              showAllSubjects ? "bg-white text-black hover:bg-gray-200" : "border-white/20 text-white hover:bg-white/10"
            }`}
          >
            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: allSubjects?.color || "#f59f0a" }} />
            All Subjects
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0 text-white hover:bg-white/10">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-900 border-white/10">
              <DropdownMenuItem
                onClick={() => {
                  if (allSubjects) {
                    setEditingSubject(allSubjects)
                    setNewSubjectColor(allSubjects.color || "#f59f0a")
                    setShowColorPicker(true)
                  }
                }}
                className="text-white hover:bg-white/10"
              >
                Change Color
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Other Subjects */}
        {otherSubjects.map((subject) => (
          <div key={subject.id} className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant={selectedSubject === subject.id ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setShowAllSubjects(false)
                setSelectedSubject(subject.id)
              }}
              className={`flex items-center gap-2 ${
                selectedSubject === subject.id
                  ? "bg-white text-black hover:bg-gray-200"
                  : "border-white/20 text-white hover:bg-white/10"
              }`}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
              {subject.name}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0 text-white hover:bg-white/10">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-900 border-white/10">
                <DropdownMenuItem
                  onClick={() => {
                    setEditingSubject(subject)
                    setNewSubjectName(subject.name)
                    setShowRenameDialog(true)
                  }}
                  className="text-white hover:bg-white/10"
                >
                  <PencilIcon className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setEditingSubject(subject)
                    setNewSubjectColor(subject.color)
                    setShowColorPicker(true)
                  }}
                  className="text-white hover:bg-white/10"
                >
                  Change Color
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setEditingSubject(subject)
                    setShowDeleteConfirm(true)
                  }}
                  className="text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        {/* Add Subject Button */}
        <Button
          variant="outline"
          size="sm"
          className="rounded-full w-8 h-8 p-0 flex-shrink-0 border-white/20 text-white hover:bg-white/10 bg-transparent"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject-name" className="text-gray-400">
                Subject Name
              </Label>
              <Input
                id="subject-name"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="e.g., Work, Study, Personal"
                className="bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
            <div>
              <Label className="text-gray-400">Color</Label>
              <div className="mt-2">
                <ColorPicker color={newSubjectColor} onChange={setNewSubjectColor} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button onClick={handleCreateSubject} disabled={loading} className="bg-white text-black hover:bg-gray-200">
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showColorPicker} onOpenChange={setShowColorPicker}>
        <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Change Subject Color</DialogTitle>
          </DialogHeader>
          <ColorPicker color={newSubjectColor} onChange={handleChangeColor} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowColorPicker(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveColor} disabled={loading} className="bg-white text-black hover:bg-gray-200">
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="bg-gray-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Rename Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rename-input" className="text-gray-400">
                Subject Name
              </Label>
              <Input
                id="rename-input"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="Enter new subject name"
                className="bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRenameDialog(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button onClick={handleRenameSubject} disabled={loading} className="bg-white text-black hover:bg-gray-200">
              {loading ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-gray-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Delete Subject</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-400">
            Are you sure you want to delete <strong className="text-white">{editingSubject?.name}</strong>? This action
            cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSubject} disabled={loading} className="bg-red-500 hover:bg-red-600">
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
