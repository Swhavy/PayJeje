import { useEffect, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Copy,
  Share2,
  Mail,
  MessageCircle,
  Gift,
  Star,
  Activity,
  CheckCircle,
  Clock,
  Sparkles,
  Gem,
  Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import referralsSnapshot from "@/components/referralsSnapshot";

export default function ReferralsPage() {
  const reflink = useSelector((state) => state.user.user);
  const [activeRefs, setActiveRefs] = useState(new Set());
  const [refs, setRefs] = useState(null);
  const { activeRefIds, referrals } = referralsSnapshot();
  const ReferralLink = reflink?.referralCode ? reflink.referralCode : null;
  const [referralLink] = useState(
    `http://localhost:8080/auth/register/${ReferralLink}`,
  );
  const [emailInvite, setEmailInvite] = useState("");

  console.log("details from the referral page", activeRefIds);

  useEffect(() => {
    setActiveRefs(new Set(activeRefIds));
    setRefs(referrals);
    console.log("active referrals from the referral page", activeRefIds);
  }, [activeRefIds, referrals]);

  const referralStats = {
    totalReferrals: refs ? refs.length : 0,
    activeReferrals: activeRefs ? activeRefs.size : 0,
    totalEarned: refs ? ((referrals.length * 20) / 100).toFixed(1) : 0,
    pendingRewards: 0,
  };

  const rewardTiers = [
    {
      tier: "Bronze",
      referrals: "1-5",
      bonus: "₦100",
      perks: ["Basic rewards", "Standard support"],
      current: false,
    },
    {
      tier: "Silver",
      referrals: "6-15",
      bonus: "₦150",
      perks: ["Enhanced rewards", "Priority support", "Exclusive surveys"],
      current: true,
    },
    {
      tier: "Gold",
      referrals: "16-30",
      bonus: "₦200",
      perks: [
        "Premium rewards",
        "VIP support",
        "Early access",
        "Monthly bonus",
      ],
      current: false,
    },
    {
      tier: "Platinum",
      referrals: "31+",
      bonus: "₦300",
      perks: [
        "Maximum rewards",
        "Dedicated manager",
        "Custom offers",
        "Quarterly bonus",
      ],
      current: false,
    },
  ];

  const referralHistory = [
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah@email.com",
      joinDate: "2024-01-15",
      status: "active",
      earned: 300,
      avatar: "👩‍💼",
    },
    {
      id: 2,
      name: "Michael Chen",
      email: "michael@email.com",
      joinDate: "2024-01-12",
      status: "active",
      earned: 450,
      avatar: "👨‍💻",
    },
    {
      id: 3,
      name: "Aisha Okafor",
      email: "aisha@email.com",
      joinDate: "2024-01-10",
      status: "pending",
      earned: 0,
      avatar: "👩‍🎓",
    },
    {
      id: 4,
      name: "David Wilson",
      email: "david@email.com",
      joinDate: "2024-01-08",
      status: "active",
      earned: 600,
      avatar: "👨‍🔬",
    },
    {
      id: 5,
      name: "Emma Davis",
      email: "emma@email.com",
      joinDate: "2024-01-05",
      status: "active",
      earned: 380,
      avatar: "👩‍🏫",
    },
  ];

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied to clipboard!");
  };

  const shareViaEmail = () => {
    const subject = "Join Paywaka and Start Earning!";
    const body = `Hi there!\n\nI've been using Paywaka to earn money by completing surveys and paying bills. It's amazing!\n\nJoin using my referral link and we both get bonus points: ${referralLink}\n\nHappy earning!`;
    window.open(
      `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        body,
      )}`,
    );
  };

  const shareViaWhatsApp = () => {
    const message = `🎉 Join me on Paywaka and start earning money today!\n\n💰 Complete surveys, pay bills, and earn points\n🎁 Use my referral link for bonus points: ${referralLink}\n\nLet's earn together! 💪`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
  };

  const sendEmailInvite = () => {
    if (!emailInvite) {
      toast.error("Please enter an email address");
      return;
    }
    // Handle email invite logic here
    console.log("Sending invite to:", emailInvite);
    toast.success(`Invitation sent to ${emailInvite}!`);
    setEmailInvite("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Referral Program
            </h1>
            <p className="text-muted-foreground mt-1">
              Invite friends and earn rewards together
            </p>
          </div>
          <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 w-fit">
            {refs?.length >= 30 ? (
              <>
                {" "}
                <Gem /> Referral Pro
              </>
            ) : refs?.length >= 15 ? (
              <>
                {" "}
                <Rocket /> Referral Star
              </>
            ) : refs?.length >= 1 ? (
              <>
                {" "}
                <Activity /> Hustle Mode{" "}
              </>
            ) : (
              <>
                {" "}
                <Sparkles className="text-yellow-500" /> Let's Grow
              </>
            )}
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="bg-card border-border">
            <CardContent className="p-4 sm:p-6 sm:px-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Referrals
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {referralStats.totalReferrals}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 sm:p-6 sm:px-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Referrals
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {referralStats.activeReferrals}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 sm:p-6 sm:px-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Earned
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    ₦{referralStats.totalEarned.toLocaleString()}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                  <Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4 sm:p-6 sm:px-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pending Rewards
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    ₦{referralStats.pendingRewards.toLocaleString()}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="invite" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-muted">
            <TabsTrigger
              value="invite"
              className="data-[state=active]:bg-background"
            >
              Invite Friends
            </TabsTrigger>
            {/*  <TabsTrigger
              value="rewards"
              className="data-[state=active]:bg-background"
            >
              Reward Tiers
            </TabsTrigger> */}
            <TabsTrigger
              value="history"
              className="data-[state=active]:bg-background"
            >
              My Referrals
            </TabsTrigger>
          </TabsList>

          {/* Invite Tab */}
          <TabsContent value="invite" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Referral Link */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Share2 className="h-5 w-5" />
                    Your Referral Link
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Share this link with friends to earn rewards
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={referralLink}
                      readOnly
                      className="bg-muted border-border text-foreground"
                    />
                    <Button
                      onClick={copyReferralLink}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      onClick={shareViaEmail}
                      variant="outline"
                      className="border-border text-foreground hover:bg-muted bg-transparent"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Share via Email
                    </Button>
                    <Button
                      onClick={shareViaWhatsApp}
                      variant="outline"
                      className="border-border text-foreground hover:bg-muted bg-transparent"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Share on WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Email Invite */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Send Email Invite
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Invite friends directly via email
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">
                      Friend's Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="friend@example.com"
                      value={emailInvite}
                      onChange={(e) => setEmailInvite(e.target.value)}
                      className="bg-background border-border text-foreground"
                    />
                  </div>
                  <Button
                    onClick={sendEmailInvite}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invitation
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* How It Works */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">
                  How Referrals Work
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Share2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">
                      1. Share Your Link
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Share your unique referral link with friends and family
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">
                      2. Friends Join
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your friends sign up using your referral link
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Gift className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">
                      3. Earn Rewards
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Both you and your friend receive bonus points
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          {/* <TabsContent value="rewards" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Referral Reward Tiers
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Unlock higher rewards as you refer more friends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {rewardTiers.map((tier, index) => (
                    <Card
                      key={index}
                      className={`border-2 ${
                        tier.current
                          ? "border-green-500 bg-green-50 dark:bg-green-950"
                          : "border-border bg-card"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="text-center mb-4">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                              tier.current
                                ? "bg-green-600 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Trophy className="h-6 w-6" />
                          </div>
                          <h3 className="font-bold text-foreground">
                            {tier.tier}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {tier.referrals} referrals
                          </p>
                        </div>

                        <div className="space-y-3">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {tier.bonus}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              per referral
                            </p>
                          </div>

                          <div className="space-y-1">
                            {tier.perks.map((perk, perkIndex) => (
                              <div
                                key={perkIndex}
                                className="flex items-center gap-2"
                              >
                                <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                                <span className="text-xs text-muted-foreground">
                                  {perk}
                                </span>
                              </div>
                            ))}
                          </div>

                          {tier.current && (
                            <Badge className="w-full justify-center bg-green-600 text-white">
                              Current Tier
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">My Referrals</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Track your referred friends and earnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {refs &&
                    refs.map((referral) => (
                      <div
                        key={referral.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-2xl">
                            {referral?.dp ? (
                              <img
                                src={referral?.dp}
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              "🟢"
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">
                              {referral?.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {referral?.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Joined:{" "}
                              {referral?.referredOn
                                ?.toDate()
                                ?.toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col justify-center items-center">
                          <p className="font-semibold text-green-600 dark:text-green-400">
                            ₦{referral.points.toLocaleString()}
                          </p>
                          <Badge
                            variant={
                              activeRefs.has(
                                referral.id,
                              ) /* referral.status === "active" */
                                ? "default"
                                : "secondary"
                            }
                            className={
                              activeRefs.has(
                                referral.id,
                              ) /* referral.status === "active" */
                                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                : "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200"
                            }
                          >
                            {activeRefs.has(
                              referral.id,
                            ) /* referral.status === "active" */ ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
