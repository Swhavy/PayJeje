import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Clock, Gift, Users, Zap, CheckCircle, Play } from "lucide-react";

export default function EarnPage() {
  const earningSources = [
    {
      title: "Complete Surveys",
      description: "Share your opinions and earn points",
      points: "50-200 points",
      time: "5-15 mins",
      icon: Star,
      color: "bg-yellow-500",
      available: 12,
    },
    {
      title: "Watch Videos",
      description: "Watch short promotional videos",
      points: "10-50 points",
      time: "1-3 mins",
      icon: Play,
      color: "bg-red-500",
      available: 25,
    },
    {
      title: "Refer Friends",
      description: "Invite friends and earn together",
      points: "500 points",
      time: "Instant",
      icon: Users,
      color: "bg-blue-500",
      available: "Unlimited",
    },
    {
      title: "Daily Check-in",
      description: "Login daily to earn bonus points",
      points: "25 points",
      time: "1 min",
      icon: CheckCircle,
      color: "bg-green-500",
      available: 1,
    },
  ];

  const dailyTasks = [
    {
      task: "Complete 3 surveys",
      progress: 2,
      total: 3,
      points: 150,
      completed: false,
    },
    {
      task: "Watch 5 videos",
      progress: 5,
      total: 5,
      points: 100,
      completed: true,
    },
    {
      task: "Refer 1 friend",
      progress: 0,
      total: 1,
      points: 500,
      completed: false,
    },
    {
      task: "Daily check-in",
      progress: 1,
      total: 1,
      points: 25,
      completed: true,
    },
  ];

  const achievements = [
    {
      title: "First Survey",
      description: "Complete your first survey",
      points: 50,
      unlocked: true,
    },
    {
      title: "Video Watcher",
      description: "Watch 100 videos",
      points: 200,
      unlocked: true,
    },
    {
      title: "Social Butterfly",
      description: "Refer 10 friends",
      points: 1000,
      unlocked: false,
    },
    {
      title: "Streak Master",
      description: "30-day login streak",
      points: 500,
      unlocked: false,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Earn Points</h1>
          <p className="text-muted-foreground">
            Complete tasks and activities to earn points and rewards
          </p>
        </div>

        {/* Current Points */}
        <Card className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-2">
                  Your Points Balance
                </h2>
                <div className="text-3xl font-bold">2,450 Points</div>
                <p className="text-green-100 mt-2">≈ ₦2,450.00</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-green-100 mb-2">This Week</div>
                <div className="text-xl font-bold">+320</div>
                <Badge className="bg-white/20 text-white border-white/30 mt-2">
                  <Zap className="h-3 w-3 mr-1" />
                  On Fire!
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earning Sources */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Ways to Earn
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {earningSources.map((source, index) => (
              <Card
                key={index}
                className="bg-card border-border hover:shadow-lg transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${source.color}`}>
                      <source.icon className="h-5 w-5 text-white" />
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-muted text-muted-foreground"
                    >
                      {source.available === "Unlimited"
                        ? `${source.available}`
                        : `${source.available} available`}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-foreground">
                    {source.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {source.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reward:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {source.points}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="text-foreground">{source.time}</span>
                    </div>
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                      Start Earning
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Daily Tasks and Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Tasks */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Daily Tasks
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Complete these tasks to earn bonus points
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dailyTasks.map((task, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm ${
                        task.completed
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {task.task}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        +{task.points}
                      </span>
                      {task.completed && (
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(task.progress / task.total) * 100}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground">
                      {task.progress}/{task.total}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Gift className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Achievements
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Unlock special rewards and badges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {achievements.map((achievement, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    achievement.unlocked
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-muted/50 border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4
                        className={`font-medium ${
                          achievement.unlocked
                            ? "text-green-700 dark:text-green-300"
                            : "text-foreground"
                        }`}
                      >
                        {achievement.title}
                      </h4>
                      <p
                        className={`text-sm ${
                          achievement.unlocked
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {achievement.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-semibold ${
                          achievement.unlocked
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        +{achievement.points}
                      </div>
                      {achievement.unlocked && (
                        <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 mt-1">
                          Unlocked
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
