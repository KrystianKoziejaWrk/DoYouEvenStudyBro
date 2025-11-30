"use client"

import Navbar from "./navbar"
import MainContent from "./main-content"

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-black text-white flex-col">
      <Navbar />
      <MainContent />
    </div>
  )
}
