import React, { useEffect, useState, useRef } from "react";
import ScrollFadeUp from "./ScrollFadeUp";

export default function Stats() {
  const containerRef = useRef(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Stats values in state
  const [users, setUsers] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [rating, setRating] = useState(0);
  const [uptime, setUptime] = useState(90); // Start closer for smoother uptime visual

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.01 },
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const duration = 2000; // 2 seconds duration
    let startTimestamp = null;

    const animate = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);

      // Easing function - easeOutQuad
      const easeProgress = progress * (2 - progress);

      setUsers(Math.floor(easeProgress * 50000));
      setProcessed(Math.floor(easeProgress * 2)); // 2 Billion
      setRating(parseFloat((easeProgress * 4.8).toFixed(1)));
      setUptime(parseFloat((90 + easeProgress * 9.9).toFixed(1)));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Set exact targets at end
        setUsers(50000);
        setProcessed(2);
        setRating(4.8);
        setUptime(99.9);
      }
    };

    requestAnimationFrame(animate);
  }, [hasStarted]);

  return (
    <section
      ref={containerRef}
      className="relative bg-card border-b border-[#1d3a6a]/30 py-20 overflow-hidden"
    >
      {/* Centered Ambient Green Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#00c96e]/5 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <ScrollFadeUp>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 items-center">
            {/* Stat 1 */}
            <div className="flex flex-col items-center text-center lg:px-6 relative group">
              <span className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-[#00c96e] mb-2 tracking-tight transition-transform duration-300 group-hover:scale-105 block">
                {users.toLocaleString()}+
              </span>
              <span className="text-sm font-semibold tracking-wider text-[#7a9cc8] uppercase">
                Active Users
              </span>
              {/* Divider right for desktop */}
              <div className="hidden lg:block absolute right-0 top-1/4 bottom-1/4 w-px bg-[#1d3a6a]/40" />
            </div>

            {/* Stat 2 */}
            <div className="flex flex-col items-center text-center lg:px-6 relative group">
              <span className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-[#00c96e] mb-2 tracking-tight transition-transform duration-300 group-hover:scale-105 block">
                ₦{processed}B+
              </span>
              <span className="text-sm font-semibold tracking-wider text-[#7a9cc8] uppercase">
                Processed Volume
              </span>
              {/* Divider right for desktop */}
              <div className="hidden lg:block absolute right-0 top-1/4 bottom-1/4 w-px bg-[#1d3a6a]/40" />
            </div>

            {/* Stat 3 */}
            <div className="flex flex-col items-center text-center lg:px-6 relative group">
              <span className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-[#00c96e] mb-2 tracking-tight transition-transform duration-300 group-hover:scale-105 block">
                {rating.toFixed(1)}★
              </span>
              <span className="text-sm font-semibold tracking-wider text-[#7a9cc8] uppercase">
                App Store Rating
              </span>
              {/* Divider right for desktop */}
              <div className="hidden lg:block absolute right-0 top-1/4 bottom-1/4 w-px bg-[#1d3a6a]/40" />
            </div>

            {/* Stat 4 */}
            <div className="flex flex-col items-center text-center lg:px-6 group">
              <span className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl text-[#00c96e] mb-2 tracking-tight transition-transform duration-300 group-hover:scale-105 block">
                {uptime.toFixed(1)}%
              </span>
              <span className="text-sm font-semibold tracking-wider text-[#7a9cc8] uppercase">
                Uptime SLA
              </span>
            </div>
          </div>
        </ScrollFadeUp>
      </div>
    </section>
  );
}
