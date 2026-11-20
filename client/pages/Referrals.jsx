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
import { ReceiptStatusPill } from "@/components/receipts/ReceiptParts";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

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
      <div className="space-y-6">
        {/* Unified Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="pw-page-title">Referral Program</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Invite friends and earn rewards together
            </p>
          </div>
          <span className="pw-chip-brand w-fit">
            {refs?.length >= 30 ? (
              <>
                <Gem className="h-3.5 w-3.5" />
                <span>Referral Pro</span>
              </>
            ) : refs?.length >= 15 ? (
              <>
                <Rocket className="h-3.5 w-3.5" />
                <span>Referral Star</span>
              </>
            ) : refs?.length >= 1 ? (
              <>
                <Activity className="h-3.5 w-3.5" />
                <span>Active Referrer</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-warning" />
                <span>Ready to Grow</span>
              </>
            )}
          </span>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="pw-label">Referrals</p>
                <p className="pw-num text-xl sm:text-2xl font-extrabold text-foreground">
                  {referralStats.totalReferrals}
                </p>
              </div>
              <div className="pw-tile-neutral h-10 w-10 shrink-0">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="pw-label">Active</p>
                <p className="pw-num text-xl sm:text-2xl font-extrabold text-foreground">
                  {referralStats.activeReferrals}
                </p>
              </div>
              <div className="pw-tile h-10 w-10 shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="pw-label">Earned</p>
                <p className="pw-num text-xl sm:text-2xl font-extrabold text-foreground truncate">
                  {formatNaira(referralStats.totalEarned)}
                </p>
              </div>
              <div className="pw-tile-gold h-10 w-10 shrink-0">
                <Star className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="pw-label">Pending</p>
                <p className="pw-num text-xl sm:text-2xl font-extrabold text-foreground truncate">
                  {formatNaira(referralStats.pendingRewards)}
                </p>
              </div>
              <div className="pw-tile-neutral h-10 w-10 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="invite" className="space-y-6">
          <TabsList className="pw-segmented grid w-full max-w-md grid-cols-2 h-auto">
            <TabsTrigger
              value="invite"
              className="min-h-10 rounded-pill text-sm font-semibold data-[state=active]:bg-brand-tint data-[state=active]:text-brand-400 data-[state=active]:shadow-sm"
            >
              Invite Friends
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="min-h-10 rounded-pill text-sm font-semibold data-[state=active]:bg-brand-tint data-[state=active]:text-brand-400 data-[state=active]:shadow-sm"
            >
              My Referrals
            </TabsTrigger>
          </TabsList>

          {/* Invite Tab */}
          <TabsContent value="invite" className="space-y-5 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Referral Link Hero */}
              <div className="pw-glass-hero p-4 sm:p-5 space-y-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-card-title text-foreground">
                    <Share2 className="h-4.5 w-4.5 text-brand-400" />
                    <span>Your Referral Link</span>
                  </div>
                  <p className="text-caption text-muted-foreground">
                    Share this link with friends to earn rewards together
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={referralLink}
                    readOnly
                    aria-label="Referral link"
                    className="pw-code text-xs h-10"
                  />
                  <Button
                    type="button"
                    onClick={copyReferralLink}
                    aria-label="Copy referral link"
                    className="shrink-0 h-10"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    type="button"
                    onClick={shareViaEmail}
                    variant="outline"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Share via Email</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={shareViaWhatsApp}
                    variant="outline"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Share on WhatsApp</span>
                  </Button>
                </div>
              </div>

              {/* Email Invite */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-brand-400" />
                    <span>Send Email Invite</span>
                  </CardTitle>
                  <CardDescription>
                    Invite friends directly via email
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="pw-label block">
                      Friend&apos;s Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="friend@example.com"
                      value={emailInvite}
                      onChange={(e) => setEmailInvite(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={sendEmailInvite}
                    className="w-full"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Send Invitation</span>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle>How Referrals Work</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="pw-panel p-4 text-center space-y-2.5">
                    <div className="pw-tile h-12 w-12 mx-auto">
                      <Share2 className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">
                      1. Share Your Link
                    </h3>
                    <p className="text-caption text-muted-foreground">
                      Share your unique referral link with friends and family
                    </p>
                  </div>
                  <div className="pw-panel p-4 text-center space-y-2.5">
                    <div className="pw-tile-neutral h-12 w-12 mx-auto">
                      <Users className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">
                      2. Friends Join
                    </h3>
                    <p className="text-caption text-muted-foreground">
                      Your friends sign up using your referral link
                    </p>
                  </div>
                  <div className="pw-panel p-4 text-center space-y-2.5">
                    <div className="pw-tile-gold h-12 w-12 mx-auto">
                      <Gift className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">
                      3. Earn Rewards
                    </h3>
                    <p className="text-caption text-muted-foreground">
                      Both you and your friend receive bonus points
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6 mt-0">
            <Card>
              <CardHeader>
                <CardTitle>My Referrals</CardTitle>
                <CardDescription>
                  Track your referred friends and earnings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {refs && refs.length > 0 ? (
                  refs.map((referral) => {
                    const isRefActive = activeRefs.has(referral.id);
                    return (
                      <div
                        key={referral.id}
                        className="pw-panel flex items-center justify-between gap-3 p-3.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-pill border border-border bg-brand-tint overflow-hidden flex items-center justify-center shrink-0">
                            {referral?.dp ? (
                              <img
                                src={referral?.dp}
                                alt={referral?.name || "Referral"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-extrabold text-brand-400">
                                {(referral?.name || "PW").slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-foreground truncate">
                              {referral?.name || "PayWaka Member"}
                            </h4>
                            <p className="text-caption text-muted-foreground truncate">
                              {referral?.email}
                            </p>
                            {referral?.referredOn?.toDate && (
                              <p className="text-[11px] text-muted-foreground">
                                Joined: {referral.referredOn.toDate().toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <p className="pw-num text-sm font-extrabold text-brand-400">
                            {formatNaira(referral.points || 0)}
                          </p>
                          <ReceiptStatusPill
                            status={isRefActive ? "success" : "pending"}
                            label={isRefActive ? "ACTIVE" : "PENDING"}
                            className="text-[9px] px-2 py-0.5"
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-caption text-muted-foreground text-center py-6">
                    No referrals yet. Share your link to start earning rewards.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
