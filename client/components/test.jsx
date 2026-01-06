import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

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
];

const TopEarnersCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef(null);

  const itemsPerPage = 3; // Show 3 items at a time

  const nextSlide = () => {
    setCurrentIndex((prevIndex) =>
      Math.min(prevIndex + 1, topEarners.length - itemsPerPage),
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  useEffect(() => {
    if (carouselRef.current) {
      const itemWidth = carouselRef.current.children[0]?.clientWidth || 0;
      carouselRef.current.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
    }
  }, [currentIndex]);

  return (
    <div className="relative w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSlide}
          disabled={currentIndex === 0}
          className="z-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 overflow-hidden">
          <div
            ref={carouselRef}
            className="flex transition-transform duration-300 ease-in-out"
            style={{
              transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`,
            }}
          >
            {topEarners.map((earner) => (
              <div
                key={earner.id}
                className="w-full flex-shrink-0 px-2"
                style={{ flexBasis: `${100 / itemsPerPage}%` }}
              >
                <Card className="h-full">
                  <CardContent className="flex flex-col items-center p-4 text-center">
                    <Avatar className="mb-2 h-12 w-12">
                      <AvatarImage
                        src={earner.avatar || "/placeholder.svg"}
                        alt={earner.name}
                      />
                      <AvatarFallback>{earner.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold text-foreground text-sm truncate w-full">
                      {earner.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {earner.earnings}
                    </p>
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
          disabled={currentIndex >= topEarners.length - itemsPerPage}
          className="z-10"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default TopEarnersCarousel;
