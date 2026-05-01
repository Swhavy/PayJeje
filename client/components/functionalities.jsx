import { useEffect, useState } from "react";

export const interval = () => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000); // update every minute
    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  const timeAgo = (timestamp, now) => {
    const diffMs = now - timestamp.toDate();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return `${diffHours} hour ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return { timeAgo, now };
};
