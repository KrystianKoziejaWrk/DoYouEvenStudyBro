"use client"

import { useState, useEffect, useRef, memo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { BarChart3, Users, Trophy, Github, Linkedin, Mail } from "lucide-react"
import ColorBends from "@/components/color-bends"
import CardSwap, { Card as SwapCard } from "@/components/card-swap"
import ScrollVelocity from "@/components/scroll-velocity"
import { useAuth } from "@/lib/auth-provider"
import { getUserCount, getGlobalStats } from "@/lib/api"

const AnimatedCounter = memo(function AnimatedCounter({
  target,
  duration = 2000,
}: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true)
        }
      },
      { threshold: 0.1 },
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [hasStarted])

  useEffect(() => {
    if (!hasStarted) return

    let startTime: number
    let animationId: number

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) {
        animationId = requestAnimationFrame(step)
      }
    }
    animationId = requestAnimationFrame(step)

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
    }
  }, [hasStarted, target, duration])

  return (
    <p ref={ref} className="text-lg text-white font-semibold mb-8">
      Join {count.toLocaleString()} focused individuals tracking their time
    </p>
  )
})

const ranks = [
  {
    name: "Baus",
    hours: "0-5 hrs/week",
    image: "/images/chatgpt-20image-20nov-2028-2c-202025-2c-2002-00-29-20am.png",
    description: "Just starting out. Everyone begins somewhere!",
  },
  {
    name: "Sherm",
    hours: "5-10 hrs/week",
    image: "/images/chatgpt-20image-20nov-2028-2c-202025-2c-2003-35-20-20pm.png",
    description: "Getting serious about studying. Keep grinding!",
  },
  {
    name: "Squid",
    hours: "10-20 hrs/week",
    image: "/images/chatgpt-20image-20nov-2028-2c-202025-2c-2002-00-06-20am.png",
    description: "Tentacles deep in the books. Impressive focus!",
  },
  {
    name: "French Mouse",
    hours: "20-30 hrs/week",
    image: "/images/chatgpt-20image-20nov-2028-2c-202025-2c-2003-33-28-20pm.png",
    description: "Oui oui! A sophisticated scholar emerges.",
  },
  {
    name: "Taus",
    hours: "30+ hrs/week",
    image: "/images/chatgpt-20image-20nov-2028-2c-202025-2c-2003-32-49-20pm.png",
    description: "Peak performance. You are the study master.",
  },
]

export default function LandingPage() {
  const { user } = useAuth()
  const [userCount, setUserCount] = useState(0)
  const [totalHours, setTotalHours] = useState(0)
  
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await getGlobalStats()
        setUserCount(stats.userCount || 0)
        setTotalHours(stats.totalHours || 0)
      } catch (err) {
        console.error("Failed to load global stats:", err)
        setUserCount(0)
        setTotalHours(0)
      }
    }
    loadStats()
  }, [])
  
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-black fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-1 sm:px-3 md:px-6 py-1.5 sm:py-2 md:py-3 flex items-center justify-between gap-1 sm:gap-2">
          {/* Left - Logo */}
          <Link href="/" className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">DYESB?</h1>
          </Link>

          {/* Center - Nav links - visible at all zoom levels, very compact */}
          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 lg:gap-4 absolute left-1/2 -translate-x-1/2 overflow-x-auto scrollbar-hide max-w-[60vw] sm:max-w-none">
            <Link href="/dashboard" className="text-[10px] sm:text-xs md:text-sm font-medium hover:text-gray-300 transition-colors whitespace-nowrap px-0.5 sm:px-1">
              Dashboard
            </Link>
            <Link href="/tracker" className="text-[10px] sm:text-xs md:text-sm font-medium hover:text-gray-300 transition-colors whitespace-nowrap px-0.5 sm:px-1">
              Web Tracker
            </Link>
            <Link href="/leaderboard" className="text-[10px] sm:text-xs md:text-sm font-medium hover:text-gray-300 transition-colors whitespace-nowrap px-0.5 sm:px-1">
              Leaderboard
            </Link>
            <Link href="/friends" className="text-[10px] sm:text-xs md:text-sm font-medium hover:text-gray-300 transition-colors whitespace-nowrap px-0.5 sm:px-1">
              Friends
            </Link>
            <Link href="/settings" className="text-[10px] sm:text-xs md:text-sm font-medium hover:text-gray-300 transition-colors whitespace-nowrap px-0.5 sm:px-1">
              Settings
            </Link>
          </div>

          {/* Right - User name or Sign Up */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            {user ? (
              <span className="text-white text-sm font-medium">
                {user.display_name || user.username || user.email.split("@")[0]}
              </span>
            ) : (
              <Link href="/signup">
                <Button className="bg-white text-black hover:bg-gray-200">Sign Up</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ColorBends Background */}
      <div className="fixed inset-0 w-full h-full z-0">
        <ColorBends
          colors={["#ff5c7a", "#ff9f43", "#feca57", "#48dbfb", "#1dd1a1", "#5f27cd", "#ee5a24"]}
          rotation={0}
          speed={0.25}
          scale={1.0}
          frequency={1.2}
          warpStrength={1.0}
          mouseInfluence={0.6}
          parallax={0.5}
          noise={0.05}
          transparent
        />
      </div>

      <div className="h-16" />

      {/* Scroll Velocity Banner */}
      <section className="relative z-10 py-8 md:py-12">
        <ScrollVelocity
          texts={["DoYouEvenStudyBro?", "DoYouEvenStudyBro?"]}
          velocity={150}
          className="text-white font-bold"
          numCopies={8}
        />
      </section>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-8 md:py-16 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center w-full">
          <div className="flex flex-col justify-start">
            <h2 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-6">Master Your Focus.</h2>
            <p className="text-xl text-gray-300 mb-4">
              Track your productivity sessions, compete with friends, and build better focus habits with real-time
              analytics.
            </p>
            <AnimatedCounter target={userCount || 1} duration={2000} />
            <p className="text-lg text-white font-semibold mb-8">
              {totalHours > 0 ? `${totalHours.toLocaleString()} hours` : "0 hours"} of focused study time tracked
            </p>
            <div className="flex gap-4">
              <Link href="/tracker">
                <Button size="lg" className="gap-2 bg-white text-black hover:bg-gray-200">
                  Start Tracking
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative h-[350px] md:h-[400px] overflow-visible">
            <CardSwap
              width={400}
              height={180}
              cardDistance={50}
              verticalDistance={60}
              delay={5000}
              pauseOnHover={true}
              easing="elastic"
            >
              <SwapCard customClass="bg-black/90 border-white/20 p-6">
                <div className="flex flex-col h-full justify-center">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/10 rounded-lg flex-shrink-0">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Track Study Habits</h3>
                      <p className="text-sm text-gray-400">Track sessions by subject with detailed insights</p>
                    </div>
                  </div>
                </div>
              </SwapCard>

              <SwapCard customClass="bg-black/90 border-white/20 p-6">
                <div className="flex flex-col h-full justify-center">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/10 rounded-lg flex-shrink-0">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Leaderboards</h3>
                      <p className="text-sm text-gray-400">Compete with friends, school, or globally</p>
                    </div>
                  </div>
                </div>
              </SwapCard>

              <SwapCard customClass="bg-black/90 border-white/20 p-6">
                <div className="flex flex-col h-full justify-center">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/10 rounded-lg flex-shrink-0">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Gamification</h3>
                      <p className="text-sm text-gray-400">Earn XP and climb through weekly ranks</p>
                    </div>
                  </div>
                </div>
              </SwapCard>

              <SwapCard customClass="bg-black/90 border-white/20 p-6">
                <div className="flex flex-col h-full justify-center">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/10 rounded-lg flex-shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Social Features</h3>
                      <p className="text-sm text-gray-400">See how locked in your friends are!</p>
                    </div>
                  </div>
                </div>
              </SwapCard>
            </CardSwap>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-4">The Ranking System</h2>
          <p className="text-gray-400 text-center mb-16 text-lg">Climb the ranks as you accumulate weekly focus time</p>

          {/* Roadmap */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-white/20 via-white/40 to-white/20 -translate-x-1/2 hidden md:block" />

            {ranks.map((rank, index) => (
              <div
                key={rank.name}
                className={`relative flex items-center gap-8 mb-16 last:mb-0 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Content card */}
                <div className={`flex-1 ${index % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                  <div
                    className={`bg-black/60 border border-white/20 rounded-2xl p-6 backdrop-blur-sm hover:border-white/40 transition-all duration-300 hover:scale-[1.02] inline-block ${
                      index % 2 === 0 ? "md:ml-auto" : "md:mr-auto"
                    }`}
                  >
                    <div className={`flex items-center gap-4 mb-3 ${index % 2 === 0 ? "md:flex-row-reverse" : ""}`}>
                      <span className="text-sm font-medium text-gray-400 bg-white/10 px-3 py-1 rounded-full">
                        {rank.hours}
                      </span>
                      <h3 className="text-2xl font-bold text-white">{rank.name}</h3>
                    </div>
                    <p className="text-gray-400 max-w-xs">{rank.description}</p>
                  </div>
                </div>

                {/* Center node with image */}
                <div className="relative z-10 flex-shrink-0">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-black border-4 border-white/30 overflow-hidden shadow-2xl shadow-white/10">
                    <Image
                      src={rank.image || "/placeholder.svg"}
                      alt={rank.name}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Level number */}
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                </div>

                {/* Spacer for alternating layout */}
                <div className="flex-1 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About the Developer */}
      <section className="relative z-10 py-20 md:py-32 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">About the Developer</h2>

          <div className="bg-black/60 border border-white/20 rounded-3xl p-8 md:p-12 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
              {/* Developer Photo */}
              <div className="relative">
                <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
                  <Image
                    src="/images/image.png"
                    alt="Krystian Kozieja"
                    width={224}
                    height={224}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div className="absolute -inset-2 rounded-2xl border border-white/10 -z-10" />
                <div className="absolute -inset-4 rounded-3xl border border-white/5 -z-20" />
              </div>

              {/* Bio */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Krystian Kozieja</h3>
                <p className="text-gray-400 mb-6">Computer Engineering Student @UIUC</p>

                <p className="text-gray-300 mb-6 leading-relaxed">
                  Hi! I built DYESB? to help students track their focus time and to grow as learniners. As
                  someone who struggled with "being so busy all the time", I wanted to create a tool that helps 
                  me to see how much work I and others actually do. The goal is to become a better more efficiant learner,
                  spending less time on styding and more time doing other great things with the precious and little time we have.
                  When I am not programming, you can find me lifting, gaming, or washing windows. :)
                </p>

                <div className="flex items-center justify-center md:justify-start gap-4">
                  <a
                    href="https://github.com/KrystianKoziejaWrk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Github className="w-5 h-5 text-white" />
                  </a>
                  <a
                    href="https://www.linkedin.com/in/krystian-kozieja-6116ab329/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Linkedin className="w-5 h-5 text-white" />
                  </a>
                  <a
                    href="mailto:krystian@example.com"
                    className="p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Mail className="w-5 h-5 text-white" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500">
          <p>DYESB? 2025</p>
        </div>
      </footer>
    </div>
  )
}
