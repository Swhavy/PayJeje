"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "./ui/card"
import { Button } from "./ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

const topEarners = [
  {
    id: 1,
    name: "Alice Johnson",
    earnings: "₦15,000",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 2,
    name: "Bob Williams",
    earnings: "₦14,500",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 3,
    name: "Charlie Brown",
    earnings: "₦14,000",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 4,
    name: "Diana Prince",
    earnings: "₦13,800",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 5,
    name: "Eve Adams",
    earnings: "₦13,500",
    avatar: "/placeholder.svg?height=40&width=40",
  },
  {
    id: 6,
    name: "Frank White",
    earnings: "₦13,200",
    avatar: "/placeholder.svg?height=40&width=40",
  },
]

const TopEarnersCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(3)
  const autoPlayRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(1)
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(2)
      } else {
        setItemsPerPage(3)
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const maxIndex = Math.max(0, topEarners.length - itemsPerPage)

  useEffect(() => {
    if (isHovering) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
      return
    }

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex >= maxIndex ? 0 : prevIndex + 1))
    }, 4000)

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current)
    }
  }, [isHovering, maxIndex])

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex >= maxIndex ? 0 : prevIndex + 1))
  }

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? maxIndex : prevIndex - 1))
  }

  const goToSlide = (index) => {
    setCurrentIndex(index)
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Top Earners</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Leading performers with the highest earnings</p>
      </div>

      <div
        className="relative w-full overflow-hidden"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        ref={containerRef}
      >
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevSlide}
            className="hidden sm:flex h-9 w-9 flex-shrink-0 transition-opacity opacity-60 hover:opacity-100"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 overflow-hidden">
            <div
              className="flex gap-3 sm:gap-4 transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`,
              }}
            >
              {topEarners.map((earner) => (
                <div key={earner.id} className="flex-shrink-0" style={{ flexBasis: `${100 / itemsPerPage}%` }}>
                  <Card className="h-full border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-colors duration-300">
                    <CardContent className="flex flex-col items-center justify-center p-4 sm:p-5 text-center h-full">
                      <Avatar className="mb-3 h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-primary/20">
                        <AvatarImage src={earner.avatar || "/placeholder.svg"} alt={earner.name} />
                        <AvatarFallback>{earner.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold text-foreground text-sm sm:text-base truncate w-full">
                        {earner.name}
                      </h3>
                      <p className="text-xs sm:text-sm font-medium text-primary mt-1">{earner.earnings}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={nextSlide}
            className="hidden sm:flex h-9 w-9 flex-shrink-0 transition-opacity opacity-60 hover:opacity-100"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex justify-center gap-2 mt-4 sm:mt-5">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-primary w-6 sm:w-8 h-2"
                  : "bg-muted-foreground/30 w-2 h-2 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Slide ${index + 1}`}
              aria-current={index === currentIndex}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default TopEarnersCarousel
