import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReceiptStatusPill } from "@/components/receipts/ReceiptParts";
import { formatPlanPrice, formatPoints } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Gift,
  Star,
  Clock,
  Search,
  ShoppingBag,
  Tv,
  Music,
  Smartphone,
  Gamepad2,
  Car,
} from "lucide-react";

const brandIcons = {
  amazon: ShoppingBag,
  netflix: Tv,
  spotify: Music,
  "google-play": Smartphone,
  steam: Gamepad2,
  uber: Car,
};

export default function GiftCardsPage() {
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const giftCards = [
    {
      id: "amazon",
      name: "Amazon",
      logo: "🛒",
      description: "Shop millions of products worldwide",
      pointsRate: 1,
      amounts: [1000, 2000, 5000, 10000, 25000],
      category: "Shopping",
      popular: true,
    },
    {
      id: "netflix",
      name: "Netflix",
      logo: "🎬",
      description: "Stream movies and TV shows",
      pointsRate: 1.1,
      amounts: [2500, 5000, 10000],
      category: "Entertainment",
      popular: true,
    },
    {
      id: "spotify",
      name: "Spotify",
      logo: "🎵",
      description: "Music streaming service",
      pointsRate: 1,
      amounts: [1500, 3000, 6000],
      category: "Entertainment",
      popular: false,
    },
    {
      id: "google-play",
      name: "Google Play",
      logo: "📱",
      description: "Apps, games, and digital content",
      pointsRate: 1,
      amounts: [1000, 2500, 5000, 10000],
      category: "Digital",
      popular: true,
    },
    {
      id: "steam",
      name: "Steam",
      logo: "🎮",
      description: "PC gaming platform",
      pointsRate: 1.2,
      amounts: [2000, 5000, 10000, 20000],
      category: "Gaming",
      popular: false,
    },
    {
      id: "uber",
      name: "Uber",
      logo: "🚗",
      description: "Ride sharing service",
      pointsRate: 1,
      amounts: [2000, 5000, 10000],
      category: "Transport",
      popular: false,
    },
  ];

  const categories = [
    "All",
    "Shopping",
    "Entertainment",
    "Digital",
    "Gaming",
    "Transport",
  ];
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredCards = giftCards.filter((card) => {
    const matchesSearch = card.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || card.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const recentPurchases = [
    {
      id: 1,
      card: "Amazon",
      amount: "₦5,000",
      points: "5,000",
      status: "Delivered",
      time: "2 hours ago",
    },
    {
      id: 2,
      card: "Netflix",
      amount: "₦2,500",
      points: "2,750",
      status: "Delivered",
      time: "1 day ago",
    },
    {
      id: 3,
      card: "Google Play",
      amount: "₦1,000",
      points: "1,000",
      status: "Processing",
      time: "2 days ago",
    },
  ];

  const handlePurchase = async () => {
    if (!selectedCard || !selectedAmount) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSelectedCard(null);
      setSelectedAmount("");
    }, 2000);
  };

  const selectedCardData = giftCards.find((card) => card.id === selectedCard);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="pw-page-title">Gift Cards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Redeem your points for gift cards from popular brands
          </p>
        </div>

        {/* Points Balance Banner — Lush Emerald Hero Glass */}
        <div className="pw-glass-hero p-4 sm:p-5">
          <div className="pw-wallet-hero-card p-5 sm:p-6 flex items-center justify-between gap-4">
            <div className="relative z-10 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/95 block">
                AVAILABLE POINTS
              </span>
              <div className="pw-num text-3xl sm:text-4xl font-extrabold text-white">
                {formatPoints(2450)}
              </div>
              <p className="text-caption text-white/95 pt-0.5">
                ≈ {formatPlanPrice(2450)} gift card value
              </p>
            </div>
            <div className="relative z-10 h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 inline-flex items-center justify-center text-white shrink-0">
              <Gift className="h-7 w-7" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Gift Cards Catalog */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <CardTitle>Available Gift Cards</CardTitle>
                    <CardDescription>
                      Choose from our selection of popular gift cards
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                    <Input
                      type="search"
                      placeholder="Search cards..."
                      aria-label="Search gift cards"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-2 pt-3">
                  {categories.map((category) => {
                    const active = selectedCategory === category;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => setSelectedCategory(category)}
                        className={cn(
                          "pw-pressable min-h-10 px-3.5 rounded-pill border text-xs font-bold transition-all",
                          active
                            ? "bg-brand-500 border-brand-500 text-brand-foreground shadow-sm"
                            : "pw-panel text-muted-foreground hover:text-foreground hover:border-brand-400/35",
                        )}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {filteredCards.map((card) => {
                    const BrandIcon = brandIcons[card.id] || Gift;
                    const isSelected = selectedCard === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setSelectedCard(card.id)}
                        className={cn(
                          "pw-pressable w-full text-left p-4 rounded-panel border transition-all flex flex-col justify-between gap-3",
                          isSelected
                            ? "border-brand-400 bg-brand-tint ring-1 ring-brand-400/35 shadow-[0_12px_28px_-14px_hsl(var(--brand-400)/0.5)]"
                            : "pw-panel hover:border-brand-400/40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn("h-10 w-10", isSelected ? "pw-tile" : "pw-tile-neutral")}>
                              <BrandIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-foreground truncate">
                                {card.name}
                              </h3>
                              <p className="text-caption text-muted-foreground truncate">
                                {card.category}
                              </p>
                            </div>
                          </div>
                          {card.popular && (
                            <span className="pw-pill-gold px-2 py-0.5 text-[10px] shrink-0">
                              <Star className="h-3 w-3" />
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-caption text-muted-foreground">
                          {card.description}
                        </p>
                        <div className="flex justify-between items-center pt-2 border-t border-border/60">
                          <span className="text-caption text-muted-foreground">
                            Rate: {card.pointsRate}x pts
                          </span>
                          <span className="pw-num text-xs font-extrabold text-brand-400">
                            From {formatPlanPrice(card.amounts[0])}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Purchase Panel */}
          <div className="space-y-6 lg:sticky lg:top-20">
            {selectedCard ? (
              <Card>
                <CardHeader>
                  <CardTitle>Purchase Gift Card</CardTitle>
                  <CardDescription>{selectedCardData?.name} Gift Card</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="pw-panel p-4 text-center space-y-2">
                    {(() => {
                      const ActiveIcon = brandIcons[selectedCardData?.id] || Gift;
                      return (
                        <div className="pw-tile h-12 w-12 mx-auto">
                          <ActiveIcon className="h-6 w-6" />
                        </div>
                      );
                    })()}
                    <h3 className="text-sm font-bold text-foreground">
                      {selectedCardData?.name}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <Label className="pw-label block">Select Amount</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedCardData?.amounts.map((amount) => {
                        const active = selectedAmount === amount.toString();
                        return (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setSelectedAmount(amount.toString())}
                            className={cn(
                              "pw-pressable min-h-10 rounded-panel border pw-num text-xs font-bold transition-all",
                              active
                                ? "bg-brand-500 border-brand-500 text-brand-foreground"
                                : "pw-panel text-foreground hover:border-brand-400/40",
                            )}
                          >
                            {formatPlanPrice(amount)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedAmount && (
                    <div className="pw-panel p-3.5 space-y-2 text-caption">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Card Value</span>
                        <span className="pw-num font-bold text-foreground">
                          {formatPlanPrice(selectedAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Points Required</span>
                        <span className="pw-num font-bold text-foreground">
                          {(
                            Number.parseInt(selectedAmount) *
                            (selectedCardData?.pointsRate || 1)
                          ).toLocaleString("en-NG")}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border/60">
                        <span className="text-muted-foreground">Remaining</span>
                        <span className="pw-num font-bold text-brand-400">
                          {(
                            2450 -
                            Number.parseInt(selectedAmount) *
                              (selectedCardData?.pointsRate || 1)
                          ).toLocaleString("en-NG")}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handlePurchase}
                    disabled={
                      !selectedAmount ||
                      isLoading ||
                      Number.parseInt(selectedAmount) *
                        (selectedCardData?.pointsRate || 1) >
                        2450
                    }
                    className="w-full"
                  >
                    {isLoading ? "Processing..." : "Purchase Gift Card"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center space-y-2">
                  <div className="pw-tile-neutral h-12 w-12 mx-auto">
                    <Gift className="h-5 w-5" />
                  </div>
                  <h3 className="text-card-title text-foreground">
                    Select a Gift Card
                  </h3>
                  <p className="text-caption text-muted-foreground">
                    Choose a gift card from the catalog to get started
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Recent Purchases */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Recent Purchases</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {recentPurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="pw-panel flex items-center justify-between gap-2 p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-foreground truncate">
                        {purchase.card}
                      </div>
                      <div className="pw-num text-caption text-muted-foreground">
                        {purchase.amount} · {purchase.time}
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <div className="pw-num text-xs font-bold text-brand-400">
                        -{purchase.points} pts
                      </div>
                      <ReceiptStatusPill
                        status={purchase.status === "Delivered" ? "success" : "pending"}
                        label={purchase.status.toUpperCase()}
                        className="text-[9px] px-2 py-0.5"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
