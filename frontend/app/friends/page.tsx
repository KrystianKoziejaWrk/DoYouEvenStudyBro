"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, UserPlus, UserMinus, Check, X, Clock, Users, Loader2 } from "lucide-react"
import {
  getFriends,
  getIncomingRequests,
  getOutgoingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  searchUsers,
} from "@/lib/api"
import { toast } from "sonner"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-provider"

interface Friend {
  id: number
  user: {
    id: number
    display_name: string | null
  username: string
    email_domain: string
  }
}

interface FriendRequest {
  id: number
  requester?: {
    display_name: string | null
    username: string
  }
  addressee?: {
    display_name: string | null
  username: string
  }
  created_at: string
}

function FriendsPageContent() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<
    Array<{ id: number; display_name: string | null; username: string; status: "add" | "pending" | "friend" }>
  >([])
  const [loading, setLoading] = useState(true)
  const [friends, setFriends] = useState<Friend[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      console.log("👥 Loading friends data...")
      const [friendsData, incomingData, outgoingData] = await Promise.all([
        getFriends().catch((err) => {
          console.error("❌ Failed to load friends:", err)
          return []
        }),
        getIncomingRequests().catch((err) => {
          console.error("❌ Failed to load incoming requests:", err)
          return []
        }),
        getOutgoingRequests().catch((err) => {
          console.error("❌ Failed to load outgoing requests:", err)
          return []
        }),
      ])
      console.log("✅ Friends data loaded:", {
        friends: friendsData.length,
        incoming: incomingData.length,
        outgoing: outgoingData.length,
      })
      setFriends(friendsData)
      setIncomingRequests(incomingData)
      setOutgoingRequests(outgoingData)
    } catch (err) {
      console.error("❌ Failed to load friends data:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    try {
      console.log("🔍 Searching for users:", searchQuery)
      const users = await searchUsers(searchQuery)
      console.log("✅ Search results:", users)
      
      // Check which users are already friends or have pending requests
      const friendUsernames = new Set(friends.map((f) => f.user.username))
      const incomingUsernames = new Set(incomingRequests.map((r) => r.requester?.username).filter(Boolean))
      const outgoingUsernames = new Set(outgoingRequests.map((r) => r.addressee?.username).filter(Boolean))

      const results = users.map((u: any) => ({
        id: u.id,
        display_name: u.display_name,
        username: u.username,
        status: friendUsernames.has(u.username)
          ? ("friend" as const)
          : incomingUsernames.has(u.username) || outgoingUsernames.has(u.username)
            ? ("pending" as const)
            : ("add" as const),
      }))
      
      console.log("📊 Processed search results:", results)
      setSearchResults(results)
      
      if (results.length === 0) {
        toast.info("No users found. Try a different search term.")
      }
    } catch (err: any) {
      console.error("❌ Failed to search users:", err)
      const errorMessage = err.message || "Failed to search users. Make sure you're logged in."
      toast.error(errorMessage)
      setSearchResults([])
    }
  }

  const handleAddFriend = async (username: string) => {
    try {
      await sendFriendRequest(username)
      toast.success("Friend request sent!")
      loadData()
      handleSearch() // Refresh search results
    } catch (err: any) {
      toast.error(err.message || "Failed to send friend request")
    }
  }

  const handleAcceptRequest = async (id: number) => {
    try {
      await acceptFriendRequest(id)
      toast.success("Friend request accepted!")
      loadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to accept request")
    }
  }

  const handleDeclineRequest = async (id: number) => {
    try {
      await declineFriendRequest(id)
      toast.success("Friend request declined")
      loadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to decline request")
    }
  }

  const handleRemoveFriend = async (id: number) => {
    try {
      await removeFriend(id)
      toast.success("Friend removed")
      loadData()
    } catch (err: any) {
      toast.error(err.message || "Failed to remove friend")
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/10 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-1 sm:px-3 md:px-6 py-1.5 sm:py-2 md:py-3 flex items-center justify-between gap-1 sm:gap-2">
          <Link href="/" className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">DYESB?</h1>
          </Link>

          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-4 absolute left-1/2 -translate-x-1/2 overflow-x-auto scrollbar-hide max-w-[60vw] sm:max-w-none">
            <Link href="/dashboard" className="text-[10px] sm:text-xs md:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-0.5 sm:px-1">
              Dashboard
            </Link>
            <Link href="/tracker" className="text-[10px] sm:text-xs md:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-0.5 sm:px-1">
              Web Tracker
            </Link>
            <Link href="/leaderboard" className="text-[10px] sm:text-xs md:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-0.5 sm:px-1">
              Leaderboard
            </Link>
            <Link href="/friends" className="text-[10px] sm:text-xs md:text-sm font-medium text-white transition-colors whitespace-nowrap px-0.5 sm:px-1">
              Friends
            </Link>
            <Link href="/settings" className="text-[10px] sm:text-xs md:text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap px-0.5 sm:px-1">
              Settings
            </Link>
          </div>

          {user ? (
            <span className="text-white text-sm font-medium">@{user.username}</span>
          ) : (
            <Link href="/login">
              <Button className="bg-white text-black hover:bg-gray-200">Sign In</Button>
            </Link>
          )}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-white" />
          <h1 className="text-3xl font-bold">Friends</h1>
        </div>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-black border border-white/10">
            <TabsTrigger
              value="friends"
              className="text-white data-[state=active]:bg-white data-[state=active]:text-black"
            >
              My Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="text-white data-[state=active]:bg-white data-[state=active]:text-black"
            >
              Requests ({incomingRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="search"
              className="text-white data-[state=active]:bg-white data-[state=active]:text-black"
            >
              Find Friends
            </TabsTrigger>
          </TabsList>

          {/* My Friends Tab */}
          <TabsContent value="friends" className="mt-6">
            <div className="space-y-3">
              {loading ? (
                <Card className="p-8 text-center bg-black border-white/10">
                  <Loader2 className="w-6 h-6 animate-spin text-white mx-auto mb-2" />
                  <p className="text-gray-400">Loading friends...</p>
                </Card>
              ) : friends.length > 0 ? (
                friends.map((friend) => (
                  <Card key={friend.id} className="p-4 bg-black border-white/10 flex items-center justify-between">
                    <Link href={`/profile/${friend.user.username}`} className="hover:opacity-80 transition-opacity">
                      <p className="font-medium text-white">{friend.user.display_name || friend.user.username}</p>
                      <p className="text-sm text-gray-400">@{friend.user.username}</p>
                    </Link>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="border-white/20 hover:bg-red-500/20 hover:border-red-500 hover:text-red-400 bg-transparent text-white"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-8 text-center bg-black border-white/10">
                  <p className="text-gray-400">No friends yet. Start by searching for people!</p>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="mt-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-white" />
                Incoming Requests ({incomingRequests.length})
              </h3>
              <div className="space-y-3">
                {incomingRequests.length > 0 ? (
                  incomingRequests.map((request) => (
                    <Card key={request.id} className="p-4 bg-black border-white/10 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{request.requester?.display_name || request.requester?.username}</p>
                        <p className="text-sm text-gray-400">
                          @{request.requester?.username} - {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-white text-black hover:bg-gray-200"
                          onClick={() => handleAcceptRequest(request.id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/20 hover:bg-red-500/20 hover:border-red-500 hover:text-red-400 bg-transparent text-white"
                          onClick={() => handleDeclineRequest(request.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="p-6 text-center bg-black border-white/10">
                    <p className="text-gray-400">No pending requests</p>
                  </Card>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-white" />
                Sent Requests ({outgoingRequests.length})
              </h3>
              <div className="space-y-3">
                {outgoingRequests.length > 0 ? (
                  outgoingRequests.map((request) => (
                    <Card key={request.id} className="p-4 bg-black border-white/10 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{request.addressee?.display_name || request.addressee?.username}</p>
                        <p className="text-sm text-gray-400">
                          @{request.addressee?.username} - Sent {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-sm text-gray-400 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Pending
                      </span>
                    </Card>
                  ))
                ) : (
                  <Card className="p-6 text-center bg-black border-white/10">
                    <p className="text-gray-400">No sent requests</p>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="mt-6">
            <div className="mb-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="bg-black border-white/10 text-white placeholder:text-gray-500"
                />
                <Button onClick={handleSearch} className="gap-2 bg-white text-black hover:bg-gray-200">
                  <Search className="w-4 h-4" />
                  Search
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <Card key={user.id} className="p-4 bg-black border-white/10 flex items-center justify-between">
                    <Link href={`/profile/${user.username}`} className="hover:opacity-80 transition-opacity">
                      <p className="font-medium text-white">{user.display_name || user.username}</p>
                      <p className="text-sm text-gray-400">@{user.username}</p>
                    </Link>
                    <Button
                      variant={user.status === "friend" ? "outline" : "default"}
                      size="sm"
                      disabled={user.status === "pending" || user.status === "friend"}
                      onClick={() => user.status === "add" && handleAddFriend(user.username)}
                      className={
                        user.status === "add"
                          ? "bg-white text-black hover:bg-gray-200"
                          : user.status === "friend"
                            ? "border-white text-white bg-transparent"
                            : "border-gray-500 text-gray-400 bg-transparent"
                      }
                    >
                      {user.status === "add" && (
                        <>
                          <UserPlus className="w-4 h-4 mr-1" />
                          Add Friend
                        </>
                      )}
                      {user.status === "pending" && "Pending"}
                      {user.status === "friend" && (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Friends
                        </>
                      )}
                    </Button>
                  </Card>
                ))
              ) : searchQuery.trim() ? (
                <Card className="p-8 text-center bg-black border-white/10">
                  <p className="text-gray-400">No users found matching "{searchQuery}"</p>
                  <p className="text-sm text-gray-500 mt-2">Try searching by username or display name</p>
                </Card>
              ) : (
                <Card className="p-8 text-center bg-black border-white/10">
                  <p className="text-gray-400">Search for friends by username or display name</p>
                  <p className="text-sm text-gray-500 mt-2">Enter a search term and click Search</p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function FriendsPage() {
  return (
    <ProtectedRoute>
      <FriendsPageContent />
    </ProtectedRoute>
  )
}
