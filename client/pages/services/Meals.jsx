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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Utensils, Clock, Star, Search } from "lucide-react";

export default function MealsPage() {
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [selectedMeal, setSelectedMeal] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isLoading, setIsLoading] = useState(false);

  const restaurants = [
    {
      id: "kfc",
      name: "KFC",
      logo: "🍗",
      rating: 4.5,
      deliveryTime: "25-35 mins",
      category: "Fast Food",
      popular: true,
      meals: [
        {
          id: "zinger-burger",
          name: "Zinger Burger",
          price: 2500,
          points: 2500,
        },
        {
          id: "chicken-bucket",
          name: "Family Bucket",
          price: 8000,
          points: 8000,
        },
        {
          id: "hot-wings",
          name: "Hot Wings (6pcs)",
          price: 3500,
          points: 3500,
        },
      ],
    },
    {
      id: "dominos",
      name: "Domino's Pizza",
      logo: "🍕",
      rating: 4.3,
      deliveryTime: "30-40 mins",
      category: "Pizza",
      popular: true,
      meals: [
        {
          id: "margherita",
          name: "Margherita Pizza",
          price: 4500,
          points: 4500,
        },
        { id: "pepperoni", name: "Pepperoni Pizza", price: 5500, points: 5500 },
        {
          id: "chicken-supreme",
          name: "Chicken Supreme",
          price: 6500,
          points: 6500,
        },
      ],
    },
    {
      id: "chicken-republic",
      name: "Chicken Republic",
      logo: "🐔",
      rating: 4.2,
      deliveryTime: "20-30 mins",
      category: "Fast Food",
      popular: false,
      meals: [
        { id: "refuel-max", name: "Refuel Max", price: 3200, points: 3200 },
        { id: "chicken-wrap", name: "Chicken Wrap", price: 2800, points: 2800 },
        {
          id: "family-feast",
          name: "Family Feast",
          price: 12000,
          points: 12000,
        },
      ],
    },
    {
      id: "coldstone",
      name: "Cold Stone",
      logo: "🍦",
      rating: 4.6,
      deliveryTime: "15-25 mins",
      category: "Dessert",
      popular: false,
      meals: [
        {
          id: "vanilla-ice-cream",
          name: "Vanilla Ice Cream",
          price: 2000,
          points: 2000,
        },
        {
          id: "chocolate-cake",
          name: "Chocolate Cake",
          price: 3500,
          points: 3500,
        },
        {
          id: "milkshake",
          name: "Strawberry Milkshake",
          price: 2500,
          points: 2500,
        },
      ],
    },
  ];

  const categories = [
    "All",
    "Fast Food",
    "Pizza",
    "Dessert",
    "Local",
    "International",
  ];

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const matchesSearch = restaurant.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || restaurant.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const recentOrders = [
    {
      id: 1,
      restaurant: "KFC",
      meal: "Zinger Burger",
      amount: "₦2,500",
      status: "Delivered",
      time: "2 hours ago",
    },
    {
      id: 2,
      restaurant: "Domino's",
      meal: "Pepperoni Pizza",
      amount: "₦5,500",
      status: "Delivered",
      time: "1 day ago",
    },
    {
      id: 3,
      restaurant: "Cold Stone",
      meal: "Vanilla Ice Cream",
      amount: "₦2,000",
      status: "Cancelled",
      time: "3 days ago",
    },
  ];

  const handleOrder = async () => {
    if (!selectedRestaurant || !selectedMeal) return;

    setIsLoading(true);
    // Simulate order
    setTimeout(() => {
      setIsLoading(false);
      // Show success message
    }, 2000);
  };

  const selectedRestaurantData = restaurants.find(
    (r) => r.id === selectedRestaurant,
  );
  const selectedMealData = selectedRestaurantData?.meals.find(
    (m) => m.id === selectedMeal,
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meal Coupons</h1>
          <p className="text-muted-foreground">
            Order delicious meals using your points
          </p>
        </div>

        {/* Points Balance */}
        <Card className="bg-gradient-to-r from-orange-600 to-red-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-2">Available Points</h2>
                <div className="text-3xl font-bold">2,450 Points</div>
                <p className="text-orange-100 mt-2">
                  Order your favorite meals
                </p>
              </div>
              <Utensils className="h-12 w-12 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Restaurant Selection */}
          <div className="lg:col-span-3">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <CardTitle className="text-foreground">
                      Available Restaurants
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Choose from our partner restaurants
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search restaurants..."
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
                      onClick={() => {
                        setSelectedCategory(category);
                      }}
                      className={
                        selectedCategory === category
                          ? "bg-orange-600 hover:bg-orange-700 text-white"
                          : "border-border text-foreground hover:bg-muted"
                      }
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {filteredRestaurants.map((restaurant) => (
                    <Card
                      key={restaurant.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedRestaurant === restaurant.id
                          ? "ring-2 ring-orange-500 bg-orange-50 dark:bg-orange-900/20"
                          : "bg-card border-border hover:bg-muted/50"
                      }`}
                      onClick={() => {
                        setSelectedRestaurant(restaurant.id);
                        setSelectedMeal("");
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{restaurant.logo}</span>
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {restaurant.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                  <span className="text-xs text-muted-foreground">
                                    {restaurant.rating}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  •
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {restaurant.deliveryTime}
                                </span>
                              </div>
                            </div>
                          </div>
                          {restaurant.popular && (
                            <Badge className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                              Popular
                            </Badge>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className="border-border text-muted-foreground"
                        >
                          {restaurant.category}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Meal Selection */}
                {selectedRestaurant && (
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                      Available Meals - {selectedRestaurantData?.name}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedRestaurantData?.meals.map((meal) => (
                        <Card
                          key={meal.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedMeal === meal.id
                              ? "ring-2 ring-orange-500 bg-orange-50 dark:bg-orange-900/20"
                              : "bg-card border-border hover:bg-muted/50"
                          }`}
                          onClick={() => setSelectedMeal(meal.id)}
                        >
                          <CardContent className="p-4">
                            <h4 className="font-medium text-foreground mb-2">
                              {meal.name}
                            </h4>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                {meal.points.toLocaleString()} points
                              </span>
                              <span className="font-semibold text-orange-600 dark:text-orange-400">
                                ₦{meal.price.toLocaleString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Panel */}
          <div className="space-y-6">
            {selectedMeal ? (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Place Order</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {selectedMealData?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <span className="text-3xl">
                      {selectedRestaurantData?.logo}
                    </span>
                    <h3 className="font-semibold text-foreground mt-2">
                      {selectedRestaurantData?.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedMealData?.name}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-foreground">
                      Quantity
                    </Label>
                    <Select value={quantity} onValueChange={setQuantity}>
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <SelectItem
                            key={num}
                            value={num.toString()}
                            className="text-foreground hover:bg-muted"
                          >
                            {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedMealData && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Meal Price:
                        </span>
                        <span className="text-foreground font-medium">
                          ₦
                          {(
                            selectedMealData.price * Number.parseInt(quantity)
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Points Required:
                        </span>
                        <span className="text-foreground font-medium">
                          {(
                            selectedMealData.points * Number.parseInt(quantity)
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Delivery Fee:
                        </span>
                        <span className="text-foreground font-medium">
                          ₦500
                        </span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border">
                        <span className="text-foreground">Total Points:</span>
                        <span className="text-foreground">
                          {(
                            selectedMealData.points *
                              Number.parseInt(quantity) +
                            500
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleOrder}
                    disabled={
                      !selectedMeal ||
                      isLoading ||
                      (selectedMealData
                        ? selectedMealData.points * Number.parseInt(quantity) +
                            500 >
                          2450
                        : false)
                    }
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {isLoading ? "Placing Order..." : "Place Order"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                  <Utensils className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">
                    Select a Meal
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a restaurant and meal to get started
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Recent Orders */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4" />
                  Recent Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-2">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {order.restaurant}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.meal}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.time}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-foreground">
                        {order.amount}
                      </div>
                      <div className="-mr-[.25rem]">
                        <Badge
                          className={
                            order.status === "Delivered"
                              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                              : order.status === "Cancelled"
                                ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                                : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                          }
                        >
                          {order.status}
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
