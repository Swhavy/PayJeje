import { useRef, useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";

import { addUserCred, changeUserPhoto } from "@/Features/userSlice";
import { useDispatch, useSelector } from "react-redux";
import { db, auth, functions } from "@/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  Phone,
  Bell,
  Shield,
  CreditCard,
  Globe,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  Save,
  Camera,
  MapPin,
  Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSetting } from "@/components/customHook";
import { toast } from "sonner";
import { httpsCallable } from "firebase/functions";
import PasswordResetModal from "@/components/confirmPasswordModal";
import { setDoc, doc } from "firebase/firestore";

export default function SettingsPage() {
  const fileInputRef = useRef(null);
  const { setContext, updateDB } = useSetting();
  const [credentialSet, setCredentialSet] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [prefButton, setPrefButton] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatePasswordVisibilty, setUpdatePasswordVisibility] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const userData = useSelector((state) => state.user.user);
  const { userPhoto, uid } = userData;
  const dispatch = useDispatch();
  //call function to update referrer's referrals doc data for this particular user
  const userDPUpdate = httpsCallable(functions, "userDPUpdate");

  const preferenceUpdate = useCallback(
    async (notification, uid) => {
      setPrefButton(true);
      try {
        const res = await setDoc(
          doc(db, "users", uid, "preferences", uid),
          { ...notification },
          { merge: true },
        );
        toast.success("Notification preferences updated!");
        console.log("preference update", res);
      } catch (err) {
        toast.error("An error occurred while updating preferences");
        console.log("preference update error", err);
      } finally {
        setPrefButton(false);
      }
    },
    [uid],
  );

  useEffect(() => {
    const unsubScribe = onAuthStateChanged(auth, (user) => {
      const credentialProvider = user?.providerData[0]?.providerId;
      if (credentialProvider === "password") setUpdatePasswordVisibility(true);
      else setUpdatePasswordVisibility(false);
    });
    return () => unsubScribe();
  }, []);

  const handlePasswordUpdate = async (currentPassword, newPassword) => {
    console.log(`current: ${currentPassword} 
      new: ${newPassword}`);
    const User = auth?.currentUser;
    if (newPassword !== credentialSet.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }
    setButtonLoading(true);
    try {
      const userCredential = EmailAuthProvider.credential(
        profile.email,
        currentPassword,
      );
      const reauthResult = await reauthenticateWithCredential(
        User,
        userCredential,
      );
      const res = await firebaseUpdatePassword(User, newPassword);
      toast.success("Password Successfully Reset");
    } catch (err) {
      if (err.code === "auth/wrong-password") {
        toast.error("Current password is incorrect");
      } else {
        toast.error("Something went wrong, please try again later");
      }
    } finally {
      setButtonLoading(false);
    }
  };

  //controlled Input
  const controlledInput = (e) => {
    const { name, value } = e.target;
    setCredentialSet((prev) => ({ ...prev, [name]: value }));
  };

  //Programatically click an input field
  const handleButtonClick = () => {
    fileInputRef.current.click(); // Programmatically click the hidden input
  };

  const [profile, setProfile] = useState({
    firstName: userData ? userData.firstName : "John",
    lastName: userData ? userData.lastName : "Doe",
    email: userData ? userData.userEmail : "john.doe@example.com",
    phone: userData ? userData.userPhone : "+234 801 234 5678",
    dateOfBirth: "1990-01-15",
    location: userData ? userData.userState : "Lagos, Nigeria",
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    marketing: true,
    surveys: true,
    rewards: true,
  });

  const [security, setSecurity] = useState({
    twoFactor: false,
    loginAlerts: true,
    sessionTimeout: "30min",
  });

  const [uploading, setUploading] = useState(false);

  const [preferences, setPreferences] = useState({
    language: "en",
    currency: "NGN",
    timezone: "Africa/Lagos",
    theme: "system",
  });

  const handleSaveProfile = () => {
    console.log("Saving profile:", profile);
    toast.success("Profile updated successfully!");
  };

  const handleSaveNotifications = async () => {
    await preferenceUpdate(notifications, uid);
  };

  const handleSaveSecurity = () => {
    console.log("Saving security:", security);
    alert("Security settings updated!");
  };

  const handleSavePreferences = () => {
    console.log("Saving preferences:", preferences);
    alert("Preferences updated!");
  };

  const uploadCloudinary = async (file) => {
    setUploading(true);
    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dfbcveamw/image/upload",
        {
          method: "POST",
          body: file,
        },
      );
      const result = await res.json();
      //stores the users profile pic in the DB
      const call = await userDPUpdate({ uid: userData.uid, DP: result.url });
      console.log("call", call);
      if (call.data?.status === "success") {
        updateDB("userPhoto", result.url);
        dispatch(addUserCred({ userPhoto: result.url }));
        setUploading(false);
        console.log("upload to cloudibary", result);
        return toast.success("photo upload successful");
      } else {
        toast.error(call.data.message);
      }
    } catch (error) {
      setUploading(false);
      toast.error("An error occurred while uploading the image");
      console.log("cloudinary error", error);
    }
  };

  //handles pic file upload
  const handlePic = (e) => {
    const pic = e.target.files[0];
    const max = 2 * 1024 * 1024;

    if (pic) {
      if (!pic.type.startsWith("image/")) {
        toast.error("Please Select a valid Image File e.g PNG, GIF, JPEG etc.");
        return;
      } else if (pic.size > max) {
        toast.error("Please Upload An Image That Is Not Above 2MB");
        return;
      } else {
        //setUserImage(URL.createObjectURL(pic));
        //setUserPic(!userPic);
        const form = new FormData();
        form.append("file", pic);
        form.append("upload_preset", "first upload");
        form.append("cloud_name", "dfbcveamw");
        uploadCloudinary(form);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Account Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your account preferences and security
            </p>
          </div>
          <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 w-fit">
            <Shield className="h-4 w-4 mr-2" />
            Verified Account
          </Badge>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-muted">
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-background"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-background"
            >
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="data-[state=active]:bg-background"
            >
              Security
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="data-[state=active]:bg-background"
            >
              Preferences
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Profile Information
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Update your personal information and profile details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center gap-6">
                  <div className="relative w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    {uploading && (
                      <div
                        className="absolute z-50 m-auto inset-0 w-6 h-6 rounded-full animate-spin 
                  border-4 border-t-[#bab7b7] border-r-[#cecccc] border-b-[#ebe9e9]
                  [mask-image:conic-gradient(black_0deg,black_180deg,transparent_180deg)] 
                  [mask-repeat:no-repeat] [mask-position:center] [mask-size:cover]"
                      ></div>
                    )}
                    {userPhoto ? (
                      <img
                        src={userPhoto}
                        className="h-full w-full rounded-full"
                      />
                    ) : (
                      <User className="h-10 w-10 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      className="border-border text-foreground hover:bg-muted bg-transparent"
                      onClick={handleButtonClick}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePic}
                        accept="image/*"
                        className="hidden"
                      />
                      <Camera className="h-4 w-4 mr-2" />
                      Change Photo
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      JPG, PNG or GIF. Max size 2MB.
                    </p>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-foreground">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={profile.firstName}
                      onChange={(e) =>
                        setProfile({ ...profile, firstName: e.target.value })
                      }
                      readOnly
                      className="bg-background border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-foreground">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={profile.lastName}
                      onChange={(e) =>
                        setProfile({ ...profile, lastName: e.target.value })
                      }
                      readOnly
                      className="bg-background border-border text-foreground"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) =>
                          setProfile({ ...profile, email: e.target.value })
                        }
                        readOnly
                        className="pl-10 bg-background border-border text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-foreground">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="phone"
                        value={profile.phone}
                        onChange={(e) =>
                          setProfile({ ...profile, phone: e.target.value })
                        }
                        readOnly
                        className="pl-10 bg-background border-border text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth" className="text-foreground">
                      Date of Birth
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={profile.dateOfBirth}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            dateOfBirth: e.target.value,
                          })
                        }
                        className="pl-10 bg-background border-border text-foreground"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-foreground">
                      Location
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="location"
                        value={profile.location}
                        onChange={(e) =>
                          setProfile({ ...profile, location: e.target.value })
                        }
                        readOnly
                        className="pl-10 bg-background border-border text-foreground"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveProfile}
                    className="bg-green-900 hover:bg-green-900 text-white cursor-not-allowed"
                    disabled={true}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Change Password */}
            {updatePasswordVisibilty && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Change Password
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="currentPassword"
                      className="text-foreground"
                    >
                      Current Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        value={credentialSet.currentPassword}
                        onChange={controlledInput}
                        type={showCurrentPassword ? "text" : "password"}
                        className="pr-10 bg-background border-border text-foreground"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-foreground">
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        name="newPassword"
                        value={credentialSet.newPassword}
                        type={showNewPassword ? "text" : "password"}
                        onChange={controlledInput}
                        className="pr-10 bg-background border-border text-foreground"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-foreground"
                    >
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        value={credentialSet.confirmPassword}
                        type={showConfirmPassword ? "text" : "password"}
                        onChange={controlledInput}
                        className="pr-10 bg-background border-border text-foreground"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        setIsModalOpen(true);
                      }}
                      disabled={
                        buttonLoading ||
                        !credentialSet.currentPassword ||
                        !credentialSet.newPassword ||
                        !credentialSet.confirmPassword
                      }
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Update Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Notification Preferences
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Choose how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <Label className="text-foreground font-medium">
                          Email Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={async (checked) => {
                        setNotifications((prev) => ({
                          ...prev,
                          email: checked,
                        }));
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div>
                        <Label className="text-foreground font-medium">
                          Push Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive push notifications on your device
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) => {
                        setNotifications((prev) => ({
                          ...prev,
                          push: checked,
                        }));
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <div>
                        <Label className="text-foreground font-medium">
                          SMS Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive important updates via SMS
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.sms}
                      onCheckedChange={(checked) => {
                        setNotifications((prev) => ({
                          ...prev,
                          sms: checked,
                        }));
                      }}
                    />
                  </div>
                </div>

                <div className="border-t border-border pt-6">
                  <h4 className="font-medium text-foreground mb-4">
                    Notification Types
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-foreground">
                          Marketing & Promotions
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Special offers and promotional content
                        </p>
                      </div>
                      <Switch
                        checked={notifications.marketing}
                        onCheckedChange={(checked) => {
                          setNotifications((prev) => ({
                            ...prev,
                            marketing: checked,
                          }));
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-foreground">
                          Survey Invitations
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          New survey opportunities
                        </p>
                      </div>
                      <Switch
                        checked={notifications.surveys}
                        onCheckedChange={(checked) => {
                          setNotifications((prev) => ({
                            ...prev,
                            surveys: checked,
                          }));
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-foreground">
                          Rewards & Points
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Point earnings and reward updates
                        </p>
                      </div>
                      <Switch
                        checked={notifications.rewards}
                        onCheckedChange={(checked) => {
                          setNotifications((prev) => ({
                            ...prev,
                            rewards: checked,
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveNotifications}
                    disabled={prefButton}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Security Settings
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Manage your account security and privacy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div>
                        <Label className="text-foreground font-medium">
                          Two-Factor Authentication
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={security.twoFactor}
                      onCheckedChange={(checked) =>
                        setSecurity((prev) => ({ ...prev, twoFactor: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <Label className="text-foreground font-medium">
                          Login Alerts
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified of new login attempts
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={security.loginAlerts}
                      onCheckedChange={(checked) =>
                        setSecurity((prev) => ({
                          ...prev,
                          loginAlerts: checked,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Session Timeout</Label>
                  <Select
                    value={security.sessionTimeout}
                    onValueChange={(value) =>
                      setSecurity({ ...security, sessionTimeout: value })
                    }
                  >
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border">
                      <SelectItem
                        value="15min"
                        className="text-foreground hover:bg-muted"
                      >
                        15 minutes
                      </SelectItem>
                      <SelectItem
                        value="30min"
                        className="text-foreground hover:bg-muted"
                      >
                        30 minutes
                      </SelectItem>
                      <SelectItem
                        value="1hour"
                        className="text-foreground hover:bg-muted"
                      >
                        1 hour
                      </SelectItem>
                      <SelectItem
                        value="never"
                        className="text-foreground hover:bg-muted"
                      >
                        Never
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Automatically log out after this period of inactivity
                  </p>
                </div>

                <div className="border-t border-border pt-6">
                  <h4 className="font-medium text-foreground mb-4">
                    Privacy Controls
                  </h4>
                  <div className="space-y-3">
                    <Link to="/settings/DataPreference">
                      <Button
                        variant="outline"
                        className="w-full justify-start border-border text-foreground hover:bg-muted bg-transparent"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Data Preferences
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-border text-foreground hover:bg-muted bg-transparent"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Privacy Settings
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-border text-foreground hover:bg-muted bg-transparent"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Payment Security
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveSecurity}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Save Security Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">
                  App Preferences
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Customize your app experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-foreground">Language</Label>
                    <Select
                      value={preferences.language}
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, language: value })
                      }
                    >
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border">
                        <SelectItem
                          value="en"
                          className="text-foreground hover:bg-muted"
                        >
                          English
                        </SelectItem>
                        <SelectItem
                          value="yo"
                          className="text-foreground hover:bg-muted"
                        >
                          Yoruba
                        </SelectItem>
                        <SelectItem
                          value="ig"
                          className="text-foreground hover:bg-muted"
                        >
                          Igbo
                        </SelectItem>
                        <SelectItem
                          value="ha"
                          className="text-foreground hover:bg-muted"
                        >
                          Hausa
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Currency</Label>
                    <Select
                      value={preferences.currency}
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, currency: value })
                      }
                    >
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border">
                        <SelectItem
                          value="NGN"
                          className="text-foreground hover:bg-muted"
                        >
                          Nigerian Naira (₦)
                        </SelectItem>
                        <SelectItem
                          value="USD"
                          className="text-foreground hover:bg-muted"
                        >
                          US Dollar ($)
                        </SelectItem>
                        <SelectItem
                          value="EUR"
                          className="text-foreground hover:bg-muted"
                        >
                          Euro (€)
                        </SelectItem>
                        <SelectItem
                          value="GBP"
                          className="text-foreground hover:bg-muted"
                        >
                          British Pound (£)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Timezone</Label>
                    <Select
                      value={preferences.timezone}
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, timezone: value })
                      }
                    >
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border">
                        <SelectItem
                          value="Africa/Lagos"
                          className="text-foreground hover:bg-muted"
                        >
                          Lagos (WAT)
                        </SelectItem>
                        <SelectItem
                          value="Africa/Abuja"
                          className="text-foreground hover:bg-muted"
                        >
                          Abuja (WAT)
                        </SelectItem>
                        <SelectItem
                          value="UTC"
                          className="text-foreground hover:bg-muted"
                        >
                          UTC
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-foreground">Theme</Label>
                    <Select
                      value={preferences.theme}
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, theme: value })
                      }
                    >
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border">
                        <SelectItem
                          value="light"
                          className="text-foreground hover:bg-muted"
                        >
                          Light
                        </SelectItem>
                        <SelectItem
                          value="dark"
                          className="text-foreground hover:bg-muted"
                        >
                          Dark
                        </SelectItem>
                        <SelectItem
                          value="system"
                          className="text-foreground hover:bg-muted"
                        >
                          System
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSavePreferences}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        {/* Password Reset Modal */}
        <PasswordResetModal
          isOpen={isModalOpen}
          onConfirm={() =>
            handlePasswordUpdate(
              credentialSet.currentPassword,
              credentialSet.newPassword,
            )
          }
          onCancel={() => setIsModalOpen(false)}
          userEmail={profile.email}
        />
      </div>
    </DashboardLayout>
  );
}
