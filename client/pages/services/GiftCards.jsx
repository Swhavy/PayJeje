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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Star, Clock, Search } from "lucide-react";

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
      <div className="space-y-6 cursor-default">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gift Cards</h1>
          <p className="text-muted-foreground">
            Redeem your points for gift cards from popular brands
          </p>
        </div>

        {/* Points Balance */}
        <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-foreground border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-2">Available Points</h2>
                <div className="text-3xl font-bold">2,450 Points</div>
                <p className="text-purple-100 mt-2">≈ ₦2,450 gift card value</p>
              </div>
              <Gift className="h-12 w-12 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Gift Cards Catalog */}
          <div className="lg:col-span-3">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">
                      Available Gift Cards
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Choose from our selection of popular gift cards
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search cards..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-48 bg-background border-border text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={
                        selectedCategory === category ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className={
                        selectedCategory === category
                          ? "bg-purple-600 hover:bg-purple-700 text-foreground"
                          : "border-border text-foreground hover:bg-muted"
                      }
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredCards.map((card) => (
                    <Card
                      key={card.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedCard === card.id
                          ? "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          : "bg-card border-border hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedCard(card.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{card.logo}</span>
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {card.name}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {card.category}
                              </p>
                            </div>
                          </div>
                          {card.popular && (
                            <Badge className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                              <Star className="h-3 w-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {card.description}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">
                            Rate: {card.pointsRate}x points
                          </span>
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            From ₦{card.amounts[0].toLocaleString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Purchase Panel */}
          <div className="space-y-6">
            {selectedCard ? (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Purchase Gift Card
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {selectedCardData?.name} Gift Card
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <span className="text-3xl">{selectedCardData?.logo}</span>
                    <h3 className="font-semibold text-foreground mt-2">
                      {selectedCardData?.name}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Select Amount</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedCardData?.amounts.map((amount) => (
                        <Button
                          key={amount}
                          variant={
                            selectedAmount === amount.toString()
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => setSelectedAmount(amount.toString())}
                          className={
                            selectedAmount === amount.toString()
                              ? "bg-purple-600 hover:bg-purple-700 text-foreground"
                              : "border-border text-foreground hover:bg-muted"
                          }
                        >
                          ₦{amount.toLocaleString()}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {selectedAmount && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Card Value:
                        </span>
                        <span className="text-foreground font-medium">
                          ₦{Number.parseInt(selectedAmount).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Points Required:
                        </span>
                        <span className="text-foreground font-medium">
                          {(
                            Number.parseInt(selectedAmount) *
                            (selectedCardData?.pointsRate || 1)
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Remaining Points:
                        </span>
                        <span className="text-foreground font-medium">
                          {(
                            2450 -
                            Number.parseInt(selectedAmount) *
                              (selectedCardData?.pointsRate || 1)
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handlePurchase}
                    disabled={
                      !selectedAmount ||
                      isLoading ||
                      Number.parseInt(selectedAmount) *
                        (selectedCardData?.pointsRate || 1) >
                        2450
                    }
                    className="w-full bg-purple-600 hover:bg-purple-700 text-foreground"
                  >
                    {isLoading ? "Processing..." : "Purchase Gift Card"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                  <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">
                    Select a Gift Card
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a gift card from the catalog to get started
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Recent Purchases */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4" />
                  Recent Purchases
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-2">
                {recentPurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {purchase.card}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {purchase.amount}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {purchase.time}
                      </div>
                    </div>
                    <div className="text-right flex flex-col gap-2">
                      <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        -{purchase.points} pts
                      </div>
                      <div className="-mr-[.25rem]">
                        <Badge
                          className={
                            purchase.status === "Delivered"
                              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                              : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                          }
                        >
                          {purchase.status}
                        </Badge>
                      </div>
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
