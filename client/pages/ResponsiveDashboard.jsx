import React, { useEffect, useState } from "react";
import MobileDashboard from "../components/MobileDashboard";
import DashboardPage from "../components/Dashboard";

export default function ResponsiveDashboard() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isMobile) {
    return <MobileDashboard />;
  }

  return <DashboardPage />;
}
