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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Download,
  Trash2,
  Settings,
  Info,
  Lock,
  Globe,
  Users,
  BarChart3,
  FileText,
  AlertTriangle,
} from "lucide-react";

export default function DataPreferencesPage() {
  const [privacyLevel, setPrivacyLevel] = useState("balanced");
  const [dataSharing, setDataSharing] = useState({
    analytics: true,
    marketing: false,
    thirdParty: false,
    research: true,
  });
  const [dataRetention, setDataRetention] = useState("2years");

  const privacyLevels = [
    {
      id: "minimal",
      name: "Minimal",
      description: "Only essential data collection",
      icon: Lock,
      color: "text-red-600 dark:text-red-400",
    },
    {
      id: "balanced",
      name: "Balanced",
      description: "Moderate data collection for better experience",
      icon: Shield,
      color: "text-yellow-600 dark:text-yellow-400",
    },
    {
      id: "full",
      name: "Full Experience",
      description: "Complete data collection for personalized features",
      icon: Globe,
      color: "text-green-600 dark:text-green-400",
    },
  ];

  const dataCategories = [
    {
      name: "Profile Information",
      description: "Name, email, phone number",
      size: "2.3 KB",
      lastUpdated: "2024-01-15",
      canDelete: false,
    },
    {
      name: "Transaction History",
      description: "Payment records and bill history",
      size: "45.7 KB",
      lastUpdated: "2024-01-15",
      canDelete: false,
    },
    {
      name: "Survey Responses",
      description: "Your answers to surveys and questionnaires",
      size: "12.4 KB",
      lastUpdated: "2024-01-14",
      canDelete: true,
    },
    {
      name: "Usage Analytics",
      description: "App usage patterns and preferences",
      size: "8.9 KB",
      lastUpdated: "2024-01-15",
      canDelete: true,
    },
    {
      name: "Device Information",
      description: "Device type, OS version, app version",
      size: "1.2 KB",
      lastUpdated: "2024-01-10",
      canDelete: true,
    },
  ];

  const handleSavePreferences = () => {
    // Handle saving preferences
    console.log("Saving preferences:", {
      privacyLevel,
      dataSharing,
      dataRetention,
    });
    alert("Data preferences saved successfully!");
  };

  const handleExportData = () => {
    // Handle data export
    console.log("Exporting user data...");
    alert(
      "Data export request submitted. You'll receive an email with your data within 24 hours.",
    );
  };

  const handleDeleteData = () => {
    // Handle data deletion
    console.log("Deleting data category:", category);
    alert(`${category} data deletion request submitted.`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Data Preferences
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage how your data is collected and used
            </p>
          </div>
          <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 w-fit">
            <Shield className="h-4 w-4 mr-2" />
            GDPR Compliant
          </Badge>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="privacy" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-muted">
            <TabsTrigger
              value="privacy"
              className="data-[state=active]:bg-background"
            >
              Privacy
            </TabsTrigger>
            <TabsTrigger
              value="sharing"
              className="data-[state=active]:bg-background"
            >
              Data Sharing
            </TabsTrigger>
            <TabsTrigger
              value="retention"
              className="data-[state=active]:bg-background"
            >
              Retention
            </TabsTrigger>
            <TabsTrigger
              value="rights"
              className="data-[state=active]:bg-background"
            >
              Your Rights
            </TabsTrigger>
          </TabsList>

          {/* Privacy Level Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Privacy Level</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Choose how much data you're comfortable sharing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {privacyLevels.map((level) => (
                  <div
                    key={level.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      privacyLevel === level.id
                        ? "border-green-500 bg-green-50 dark:bg-green-950"
                        : "border-border bg-muted/50 hover:bg-muted"
                    }`}
                    onClick={() => setPrivacyLevel(level.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          privacyLevel === level.id
                            ? "bg-green-600 text-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <level.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {level.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {level.description}
                        </p>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${
                          privacyLevel === level.id
                            ? "border-green-500 bg-green-500"
                            : "border-muted-foreground"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Sharing Tab */}
          <TabsContent value="sharing" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Data Sharing Preferences
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Control how your data is shared with different services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <Label className="text-foreground font-medium">
                          Analytics & Performance
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Help us improve the app with usage analytics
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="analytics"
                      checked={dataSharing.analytics}
                      onCheckedChange={(checked) =>
                        setDataSharing((prev) => ({
                          ...prev,
                          analytics: checked,
                        }))
                      }
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-700"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div>
                        <Label className="text-foreground font-medium">
                          Marketing Communications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive personalized offers and promotions
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="marketing"
                      checked={dataSharing.marketing}
                      onCheckedChange={(checked) =>
                        setDataSharing((prev) => ({
                          ...prev,
                          marketing: checked,
                        }))
                      }
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-700"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <div>
                        <Label className="text-foreground font-medium">
                          Third-Party Services
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Share data with trusted partners for enhanced features
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="third-party"
                      checked={dataSharing.thirdParty}
                      onCheckedChange={(checked) =>
                        setDataSharing((prev) => ({
                          ...prev,
                          thirdParty: checked,
                        }))
                      }
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-700"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      <div>
                        <Label className="text-foreground font-medium">
                          Research & Development
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Contribute to product research and new feature
                          development
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="research"
                      checked={dataSharing.research}
                      onCheckedChange={(checked) =>
                        setDataSharing((prev) => ({
                          ...prev,
                          research: checked,
                        }))
                      }
                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300 dark:data-[state=unchecked]:bg-gray-700"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Retention Tab */}
          <TabsContent value="retention" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Data Retention
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Choose how long we keep your data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-foreground">
                    Data Retention Period
                  </Label>
                  <Select
                    value={dataRetention}
                    onValueChange={setDataRetention}
                  >
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border w-[40rem] ">
                      <SelectItem
                        value="1year"
                        className="text-foreground hover:bg-muted"
                      >
                        1 Year
                      </SelectItem>
                      <SelectItem
                        value="2years"
                        className="text-foreground hover:bg-muted"
                      >
                        2 Years (Recommended)
                      </SelectItem>
                      <SelectItem
                        value="5years"
                        className="text-foreground hover:bg-muted"
                      >
                        5 Years
                      </SelectItem>
                      <SelectItem
                        value="indefinite"
                        className="text-foreground hover:bg-muted"
                      >
                        Until Account Deletion
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Data will be automatically deleted after this period, except
                    where required by law
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100">
                        Important Note
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                        Some data may be retained longer for legal compliance,
                        security, or fraud prevention purposes. Essential
                        account data is kept until account deletion.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">
                    Your Data Breakdown
                  </h4>
                  {dataCategories.map((category, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div>
                        <h5 className="font-medium text-foreground">
                          {category.name}
                        </h5>
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Size: {category.size} • Last updated:{" "}
                          {category.lastUpdated}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {category.canDelete ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteData(category.name)}
                            className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          >
                            Required
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Your Rights Tab */}
          <TabsContent value="rights" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Your Data Rights
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Exercise your rights regarding your personal data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-muted/50 border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Download className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h4 className="font-medium text-foreground">
                          Export Your Data
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Download a copy of all your personal data in a portable
                        format
                      </p>
                      <Button
                        onClick={handleExportData}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-foreground"
                      >
                        Request Data Export
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/50 border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <h4 className="font-medium text-foreground">
                          Delete Account
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Permanently delete your account and all associated data
                      </p>
                      <Button
                        variant="destructive"
                        className="w-full hover:bg-blue-700 transition-colors duration-700 ease-in-out border-2 text-foreground"
                      >
                        Delete Account
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                        Data Processing Rights
                      </h4>
                      <div className="text-sm text-yellow-800 dark:text-yellow-200 mt-2 space-y-1">
                        <p>• Right to access your personal data</p>
                        <p>• Right to rectify inaccurate data</p>
                        <p>
                          • Right to erase your data (right to be forgotten)
                        </p>
                        <p>• Right to restrict processing</p>
                        <p>• Right to data portability</p>
                        <p>• Right to object to processing</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Have questions about your data rights or need assistance?
                  </p>
                  <Button
                    variant="outline"
                    className="border-border text-foreground hover:bg-muted bg-transparent"
                  >
                    Contact Privacy Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSavePreferences}
            className="bg-green-600 hover:bg-green-700 text-foreground"
          >
            <Settings className="h-4 w-4 mr-2" />
            Save Preferences
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
