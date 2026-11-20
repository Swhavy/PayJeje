import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReceiptStrip } from "@/components/receipts/ReceiptParts";
import {
  Star,
  Users,
  Zap,
  CheckCircle,
  Play,
  Sparkles,
} from "lucide-react";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import CheckInCalendar from "../components/CheckinModal";
import { useBillsStat } from "../components/useTransactionFetch";
import { formatNaira, formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function EarnPage() {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { pointsData } = useBillsStat();
  const userPoints = useSelector((state) => state.user.user.points);
  const [points, setPoints] = useState(userPoints ? userPoints : 0);
  const navigate = useNavigate();

  useEffect(() => {
    setPoints(userPoints ? userPoints : 0);
  }, [userPoints]);

  const earningSources = [
    {
      title: "Complete Surveys",
      description: "Share your opinions and earn points",
      points: "50–200 points",
      time: "5–15 mins",
      icon: Star,
      neutral: true,
      available: 12,
      hidden: true,
    },
    {
      title: "Watch Videos",
      description: "Watch short promotional videos",
      points: "10–50 points",
      time: "1–3 mins",
      icon: Play,
      neutral: true,
      available: 25,
      hidden: true,
    },
    {
      title: "Refer Friends",
      description: "Invite friends and earn together",
      points: "20 points",
      time: "Instant",
      icon: Users,
      neutral: false,
      available: "Unlimited",
      hidden: false,
    },
    {
      title: "Daily Check-in",
      description: "Log in daily to earn bonus points",
      points: "1 point",
      time: "Instant",
      icon: CheckCircle,
      neutral: true,
      available: 1,
      hidden: false,
    },
  ];

  const weeklyPoints = Number(pointsData?.amount || 0);
  const nairaEquivalent = (Math.round(Number(points || 0) * 20) / 100);

  return (
    <>
      <CheckInCalendar
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
      />
      <DashboardLayout>
        <div className="space-y-6">
          {/* Unified Page Header */}
          <div>
            <h1 className="pw-page-title">Earn Points</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Complete activities and referrals to build your PayWaka points balance.
            </p>
          </div>

          {/* Flagship Glass Points Balance Hero */}
          <div className="pw-glass-hero max-w-2xl p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="pw-label block">YOUR POINTS BALANCE</span>
              <div className="pw-num text-2xl sm:text-3xl font-extrabold text-foreground whitespace-nowrap">
                {formatPoints(points)}
              </div>
              <p className="pw-num text-caption text-brand-400 font-semibold">
                ≈ {formatNaira(nairaEquivalent)}
              </p>
            </div>

            <div className="pw-panel p-3.5 text-right space-y-1.5 shrink-0">
              <span className="pw-label block">THIS WEEK</span>
              <div className="pw-num text-xl font-extrabold text-foreground">
                {weeklyPoints === 0 ? "0" : `+${weeklyPoints}`}
              </div>
              <span
                className={cn(
                  weeklyPoints >= 50 ? "pw-chip-brand" : "pw-pill-gold px-2.5 py-0.5 text-caption",
                )}
              >
                {weeklyPoints >= 50 ? (
                  <>
                    <Zap className="h-3 w-3" />
                    <span>On fire</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    <span>Keep going</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Ways to Earn */}
          <section className="space-y-3">
            <h2 className="pw-section-title">Ways to Earn</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {earningSources
                .filter((s) => !s.hidden)
                .map((source) => {
                  const Icon = source.icon;
                  return (
                    <Card key={source.title} className="flex flex-col justify-between">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className={cn(
                              "h-10 w-10",
                              source.neutral ? "pw-tile-neutral" : "pw-tile",
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="pw-chip">
                            {source.available === "Unlimited"
                              ? "Unlimited"
                              : `${source.available} available`}
                          </span>
                        </div>
                        <CardTitle className="pt-2">{source.title}</CardTitle>
                        <CardDescription>{source.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="pw-panel p-3 space-y-2 text-caption">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Reward</span>
                            <span className="font-bold text-brand-400">
                              {source.points}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Timing</span>
                            <span className="font-semibold text-foreground">
                              {source.time}
                            </span>
                          </div>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => {
                            if (source.title === "Refer Friends") {
                              navigate("/referrals");
                            } else if (source.title === "Daily Check-in") {
                              setIsCalendarOpen(true);
                            }
                          }}
                        >
                          Start Earning
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </section>
        </div>
      </DashboardLayout>
    </>
  );
}
