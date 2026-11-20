import { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";
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
  signOut,
} from "firebase/auth";
import { addUserCred, clearState } from "@/Features/userSlice";
import { useDispatch, useSelector } from "react-redux";
import { db, auth, functions } from "@/firebaseConfig";
import { Button } from "@/components/ui/button";
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
  Globe,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  Save,
  Camera,
  MapPin,
  Calendar,
  KeyRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSetting } from "@/components/customHook";
import { toast } from "sonner";
import { httpsCallable } from "firebase/functions";
import PasswordResetModal from "@/components/confirmPasswordModal";
import { setDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import TwoFactorSetupModal from "@/components/twoFactorSetup";
import Disable2FA from "@/components/disable2FA";
import ChangeTransactionPinModal from "@/components/ChangeTransactionPinModal";
import TransactionPinSetupModal from "@/components/TransactionPinSetupModal";
import ResetTransactionPinModal from "@/components/ResetTransactionPinModal";
import { ReceiptStatusPill } from "@/components/receipts/ReceiptParts";

export default function SettingsPage() {
  const { setTheme } = useTheme();
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [isSetupPinOpen, setIsSetupPinOpen] = useState(false);
  const [isResetPinOpen, setIsResetPinOpen] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { updateDB } = useSetting();
  const [credentialSet, setCredentialSet] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [twoFADisable, set2FADisable] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatePasswordVisibilty, setUpdatePasswordVisibility] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const userData = useSelector((state) => state.user.user);
  const { userPhoto, uid, twoFactor: twoFactorStatus } = userData;
  const dispatch = useDispatch();
  const userDPUpdate = httpsCallable(functions, "userDPUpdate");

  const [profile, setProfile] = useState({
    firstName: userData ? userData.firstName || userData.userName || "" : "",
    lastName: userData ? userData.lastName || "" : "",
    email: userData ? userData.userEmail || "" : "",
    phone: userData ? userData.userPhone || "" : "",
    dateOfBirth: "1998-06-15",
    location: userData ? userData.userState || "Lagos, Nigeria" : "Lagos, Nigeria",
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
    twoFactor: twoFactorStatus || false,
    loginAlerts: true,
    sessionTimeout: "15min",
  });

  const [uploading, setUploading] = useState(false);

  const [preferences, setPreferences] = useState({
    language: "en",
    currency: "NGN",
    timezone: "Africa/Lagos",
    theme: "system",
  });

  const [savedSettings, setSavedSettings] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const fetchSettings = async () => {
      try {
        const prefDocRef = doc(db, "users", uid, "preferences", uid);
        const prefSnap = await getDoc(prefDocRef);

        if (prefSnap.existsProp || prefSnap.exists?.()) {
          const snapData = prefSnap.data();
          const securityData = {
            twoFactor: snapData.twoFactor ?? false,
            loginAlerts: snapData.loginAlerts ?? false,
            sessionTimeout: snapData.sessionTimeout ?? "15min",
          };
          const notificationData = {
            email: snapData.email ?? true,
            push: snapData.push ?? true,
            sms: snapData.sms ?? false,
            marketing: snapData.marketing ?? true,
            surveys: snapData.surveys ?? true,
            rewards: snapData.rewards ?? true,
          };
          setSecurity(securityData);
          setNotifications(notificationData);
          setSavedSettings({ ...securityData, ...notificationData });
        }
      } catch (error) {
        console.warn("Unable to load user preferences:", error?.message || error);
      }
    };

    fetchSettings();
  }, [uid]);

  const hasSecurityChanges =
    savedSettings !== null &&
    (security.twoFactor !== savedSettings.twoFactor ||
      security.loginAlerts !== savedSettings.loginAlerts ||
      security.sessionTimeout !== savedSettings.sessionTimeout);

  const hasNotificationChanges =
    savedSettings !== null &&
    (notifications.email !== savedSettings.email ||
      notifications.push !== savedSettings.push ||
      notifications.sms !== savedSettings.sms ||
      notifications.marketing !== savedSettings.marketing ||
      notifications.surveys !== savedSettings.surveys ||
      notifications.rewards !== savedSettings.rewards);

  const handleUserPref = useCallback(
    async (notification) => {
      if (!notification && !hasSecurityChanges) return;
      if (notification && !hasNotificationChanges) return;
      setIsSaving(true);
      const data = notification ? { ...notifications } : { ...security };

      try {
        const prefDocRef = doc(db, "users", uid, "preferences", uid);
        await updateDoc(prefDocRef, data);
        await handleTimeoutChange(
          security.sessionTimeout,
          security.loginAlerts,
          security.twoFactor,
          notification,
        );
        setSavedSettings((prev) => ({ ...(prev || {}), ...data }));
        toast.success(
          notification
            ? "Notification settings saved."
            : "Security settings saved.",
        );
      } catch (error) {
        toast.error(
          notification
            ? "Failed to save notification settings. Please try again."
            : "Failed to save security settings. Please try again.",
        );
        console.error(error);
      } finally {
        setIsSaving(false);
      }
    },
    [security, notifications, hasSecurityChanges, hasNotificationChanges, uid],
  );

  const SignOut = () => {
    signOut(auth).then(() => {
      dispatch(clearState({}));
      navigate("/auth/Login");
    });
  };

  const handleTimeoutChange = async (minutes, loginAlert, twoFA, notification) => {
    let timeoutValue = minutes;
    switch (minutes) {
      case "15min":
        timeoutValue = 15;
        break;
      case "0.5min":
        timeoutValue = 0.5;
        break;
      case "30min":
        timeoutValue = 30;
        break;
      case "1hour":
        timeoutValue = 60;
        break;
      default:
        timeoutValue = null;
        break;
    }
    notification
      ? dispatch(
          addUserCred({
            emailNotifications: notifications.email,
            pushNotifications: notifications.push,
            smsNotifications: notifications.sms,
            marketingNotifications: notifications.marketing,
            surveyNotifications: notifications.surveys,
            rewardNotifications: notifications.rewards,
          }),
        )
      : dispatch(
          addUserCred({
            sessionTimeout: timeoutValue,
            loginAlerts: loginAlert,
            twoFactor: twoFA,
            emailNotifications: notifications.email,
            pushNotifications: notifications.push,
            smsNotifications: notifications.sms,
            marketingNotifications: notifications.marketing,
            surveyNotifications: notifications.surveys,
            rewardNotifications: notifications.rewards,
          }),
        );
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubScribe = onAuthStateChanged(auth, () => {
      setUpdatePasswordVisibility(true);
    });
    return () => unsubScribe();
  }, []);

  const handlePasswordUpdate = async (currentPassword, newPassword) => {
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
      await reauthenticateWithCredential(User, userCredential);
      await firebaseUpdatePassword(User, newPassword);
      toast.success("Password successfully updated");
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

  const controlledInput = (e) => {
    const { name, value } = e.target;
    setCredentialSet((prev) => ({ ...prev, [name]: value }));
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleSaveProfile = () => {
    toast.success("Profile updated successfully!");
  };

  const handleSavePreferences = () => {
    toast.success("App preferences updated!");
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
      const call = await userDPUpdate({ uid: userData.uid, DP: result.url });
      if (call.data?.status === "success") {
        updateDB("userPhoto", result.url);
        dispatch(addUserCred({ userPhoto: result.url }));
        setUploading(false);
        return toast.success("Photo upload successful");
      } else {
        toast.error(call.data?.message || "Cloudinary error");
      }
    } catch (error) {
      setUploading(false);
      const mockURL =
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face";
      dispatch(addUserCred({ userPhoto: mockURL }));
      toast.success("Photo updated successfully! (Mock Mode)");
      console.log("cloudinary upload bypassed or handled", error);
    }
  };

  const handlePic = (e) => {
    const pic = e.target.files[0];
    const max = 2 * 1024 * 1024;
    if (pic) {
      if (!pic.type.startsWith("image/")) {
        toast.error("Please select a valid image file (PNG, GIF, JPEG)");
        return;
      } else if (pic.size > max) {
        toast.error("Please upload an image under 2MB");
        return;
      } else {
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
      <div className="space-y-6 max-w-3xl">
        {/* Unified Page Header (no nested card wrapper) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="pw-page-title">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your profile, notifications, PIN, and security preferences.
            </p>
          </div>
          <span className="pw-chip-brand w-fit">
            <Shield className="h-3.5 w-3.5" />
            <span>Verified Account</span>
          </span>
        </div>

        {/* Sentence-case Apple Segmented Tabs */}
        <Tabs defaultValue="profile" className="space-y-5">
          <TabsList className="pw-segmented grid grid-cols-4 w-full h-auto gap-0.5 sm:gap-1">
            <TabsTrigger
              value="profile"
              className="min-h-9 px-1 sm:px-3 rounded-pill text-[11px] sm:text-xs font-semibold text-muted-foreground data-[state=active]:bg-brand-tint data-[state=active]:text-brand-400 data-[state=active]:shadow-sm whitespace-nowrap truncate"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="min-h-9 px-1 sm:px-3 rounded-pill text-[11px] sm:text-xs font-semibold text-muted-foreground data-[state=active]:bg-brand-tint data-[state=active]:text-brand-400 data-[state=active]:shadow-sm whitespace-nowrap truncate"
            >
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="min-h-9 px-1 sm:px-3 rounded-pill text-[11px] sm:text-xs font-semibold text-muted-foreground data-[state=active]:bg-brand-tint data-[state=active]:text-brand-400 data-[state=active]:shadow-sm whitespace-nowrap truncate"
            >
              Security
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="min-h-9 px-1 sm:px-3 rounded-pill text-[11px] sm:text-xs font-semibold text-muted-foreground data-[state=active]:bg-brand-tint data-[state=active]:text-brand-400 data-[state=active]:shadow-sm whitespace-nowrap truncate"
            >
              Preferences
            </TabsTrigger>
          </TabsList>

          {/* PROFILE TAB (single card level) */}
          <TabsContent value="profile" className="space-y-6 mt-0">
            <Card>
              <CardHeader className="border-b border-border pb-4">
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal details and profile photo
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-5">
                {/* Profile Photo Row (no nested card) */}
                <div className="flex items-center gap-4 pb-5 border-b border-border">
                  <div className="relative w-16 h-16 bg-brand-tint rounded-pill flex items-center justify-center border border-brand-400/25 shrink-0 overflow-hidden">
                    {uploading && (
                      <div className="absolute inset-0 z-10 m-auto w-6 h-6 rounded-full animate-spin border-2 border-brand-400 border-t-transparent" />
                    )}
                    {userPhoto ? (
                      <img
                        src={userPhoto}
                        className="h-full w-full object-cover"
                        alt="Profile photo"
                      />
                    ) : (
                      <User className="h-7 w-7 text-brand-400" />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleButtonClick}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePic}
                        accept="image/*"
                        className="hidden"
                      />
                      <Camera className="h-4 w-4 text-brand-400" />
                      <span>Change Photo</span>
                    </Button>
                    <p className="text-caption text-muted-foreground">
                      JPG, PNG, or GIF up to 2MB
                    </p>
                  </div>
                </div>

                {/* Form Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="pw-label block">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={profile.firstName}
                      onChange={(e) =>
                        setProfile({ ...profile, firstName: e.target.value })
                      }
                      readOnly
                      className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="pw-label block">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={profile.lastName}
                      onChange={(e) =>
                        setProfile({ ...profile, lastName: e.target.value })
                      }
                      readOnly
                      className="bg-muted/50 text-muted-foreground cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="pw-label block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) =>
                          setProfile({ ...profile, email: e.target.value })
                        }
                        readOnly
                        className="pl-10 bg-muted/50 text-muted-foreground cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="pw-label block">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        value={profile.phone}
                        onChange={(e) =>
                          setProfile({ ...profile, phone: e.target.value })
                        }
                        readOnly
                        className="pl-10 pw-num bg-muted/50 text-muted-foreground cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dateOfBirth" className="pw-label block">
                      Date of Birth
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={profile.dateOfBirth}
                        onChange={(e) =>
                          setProfile({ ...profile, dateOfBirth: e.target.value })
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="pw-label block">
                      Location
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                      <Input
                        id="location"
                        value={profile.location}
                        onChange={(e) =>
                          setProfile({ ...profile, location: e.target.value })
                        }
                        readOnly
                        className="pl-10 bg-muted/50 text-muted-foreground cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled
                    className="w-full sm:w-auto"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {updatePasswordVisibilty && (
              <Card>
                <CardHeader className="border-b border-border pb-4">
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div className="max-w-md space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="currentPassword" className="pw-label block">
                        Current Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          name="currentPassword"
                          value={credentialSet.currentPassword}
                          onChange={controlledInput}
                          type={showCurrentPassword ? "text" : "password"}
                          className="pr-12"
                        />
                        <button
                          type="button"
                          aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                          className="pw-tap absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground inline-flex items-center justify-center"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword" className="pw-label block">
                        New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          name="newPassword"
                          value={credentialSet.newPassword}
                          type={showNewPassword ? "text" : "password"}
                          onChange={controlledInput}
                          className="pr-12"
                        />
                        <button
                          type="button"
                          aria-label={showNewPassword ? "Hide password" : "Show password"}
                          className="pw-tap absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground inline-flex items-center justify-center"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="pw-label block">
                        Confirm New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          value={credentialSet.confirmPassword}
                          type={showConfirmPassword ? "text" : "password"}
                          onChange={controlledInput}
                          className="pr-12"
                        />
                        <button
                          type="button"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          className="pw-tap absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground inline-flex items-center justify-center"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      disabled={
                        buttonLoading ||
                        !credentialSet.currentPassword ||
                        !credentialSet.newPassword ||
                        !credentialSet.confirmPassword
                      }
                      className="w-full sm:w-auto"
                    >
                      <Lock className="h-4 w-4" />
                      <span>Update Password</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* NOTIFICATIONS TAB (single card level, flat divide-y rows) */}
          <TabsContent value="notifications" className="mt-0">
            <Card>
              <CardHeader className="border-b border-border pb-4">
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to receive PayWaka updates
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-5">
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between gap-3 py-3.5 first:pt-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="pw-tile-neutral h-9 w-9">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-sm font-bold text-foreground block">
                          Email Notifications
                        </Label>
                        <p className="text-caption text-muted-foreground truncate">
                          Receipts and account alerts via email
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({ ...prev, email: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="pw-tile h-9 w-9">
                        <Smartphone className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-sm font-bold text-foreground block">
                          Push Notifications
                        </Label>
                        <p className="text-caption text-muted-foreground truncate">
                          Instant alerts on your device
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({ ...prev, push: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="pw-tile-neutral h-9 w-9">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-sm font-bold text-foreground block">
                          SMS Notifications
                        </Label>
                        <p className="text-caption text-muted-foreground truncate">
                          Critical transaction alerts via SMS
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.sms}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({ ...prev, sms: checked }))
                      }
                    />
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <span className="pw-label block">NOTIFICATION TYPES</span>
                  <div className="divide-y divide-border">
                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Label className="text-sm font-semibold text-foreground block">
                          Marketing & Promotions
                        </Label>
                        <p className="text-caption text-muted-foreground">
                          Special offers and cashback promos
                        </p>
                      </div>
                      <Switch
                        checked={notifications.marketing}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({ ...prev, marketing: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Label className="text-sm font-semibold text-foreground block">
                          Survey Invitations
                        </Label>
                        <p className="text-caption text-muted-foreground">
                          New survey opportunities
                        </p>
                      </div>
                      <Switch
                        checked={notifications.surveys}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({ ...prev, surveys: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Label className="text-sm font-semibold text-foreground block">
                          Rewards & Points
                        </Label>
                        <p className="text-caption text-muted-foreground">
                          Point earnings and streak updates
                        </p>
                      </div>
                      <Switch
                        checked={notifications.rewards}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({ ...prev, rewards: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    onClick={() => handleUserPref(true)}
                    disabled={!hasNotificationChanges || isSaving}
                    className="w-full sm:w-auto"
                  >
                    <Bell className="h-4 w-4" />
                    <span>{isSaving ? "Saving..." : "Save Notification Settings"}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECURITY TAB (single card level, flat divide-y rows) */}
          <TabsContent value="security" className="mt-0">
            <Card>
              <CardHeader className="border-b border-border pb-4">
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage authentication, Transaction PIN, and session timeout
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-5">
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between gap-3 py-3.5 first:pt-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="pw-tile h-9 w-9">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-sm font-bold text-foreground block">
                          Two-Factor Authentication
                        </Label>
                        <p className="text-caption text-muted-foreground truncate">
                          Protect logins with an authenticator app
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={security.twoFactor}
                      onCheckedChange={(checked) => {
                        if (!checked) {
                          set2FADisable(true);
                        }
                        setSecurity((prev) => ({ ...prev, twoFactor: checked }));
                        setIs2FAModalOpen(checked);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="pw-tile-neutral h-9 w-9">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-sm font-bold text-foreground block">
                          Login Alerts
                        </Label>
                        <p className="text-caption text-muted-foreground truncate">
                          Get notified of new sign-ins
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={security.loginAlerts}
                      onCheckedChange={(checked) =>
                        setSecurity((prev) => ({ ...prev, loginAlerts: checked }))
                      }
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-panel bg-warning/10 border border-warning/25 text-warning inline-flex items-center justify-center shrink-0">
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-bold text-foreground block">
                            Transaction PIN
                          </Label>
                          {userData?.hasTransactionPin ? (
                            <ReceiptStatusPill status="success" label="ACTIVE" className="text-[9px] px-2 py-0.5" />
                          ) : (
                            <ReceiptStatusPill status="pending" label="NOT SET" className="text-[9px] px-2 py-0.5" />
                          )}
                        </div>
                        <p className="text-caption text-muted-foreground truncate">
                          4-digit PIN required to authorize purchases
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 sm:self-center self-end">
                      {userData?.hasTransactionPin ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsChangePinOpen(true)}
                          >
                            Change PIN
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsResetPinOpen(true)}
                          >
                            Reset PIN
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setIsSetupPinOpen(true)}
                        >
                          Create PIN
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-4 max-w-sm">
                  <Label className="pw-label block">Session Timeout</Label>
                  <Select
                    value={security.sessionTimeout}
                    onValueChange={(value) => {
                      setSecurity({ ...security, sessionTimeout: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timeout" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      <SelectItem value="15min" className="min-h-11">15 minutes</SelectItem>
                      <SelectItem value="30min" className="min-h-11">30 minutes</SelectItem>
                      <SelectItem value="0.5min" className="min-h-11">0.5 minutes</SelectItem>
                      <SelectItem value="1hour" className="min-h-11">1 hour</SelectItem>
                      <SelectItem value="never" className="min-h-11">Never</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-caption text-muted-foreground">
                    Automatically lock your session after inactivity
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    onClick={() => handleUserPref(false)}
                    disabled={!hasSecurityChanges || isSaving}
                    className="w-full sm:w-auto"
                  >
                    <Lock className="h-4 w-4" />
                    <span>{isSaving ? "Saving..." : "Save Security Settings"}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PREFERENCES TAB */}
          <TabsContent value="preferences" className="mt-0">
            <Card>
              <CardHeader className="border-b border-border pb-4">
                <CardTitle>App Preferences</CardTitle>
                <CardDescription>Customize language, currency, and theme</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="pw-label block">Language</Label>
                    <Select
                      value={preferences.language}
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, language: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="en" className="min-h-11">English</SelectItem>
                        <SelectItem value="yo" className="min-h-11">Yoruba</SelectItem>
                        <SelectItem value="ig" className="min-h-11">Igbo</SelectItem>
                        <SelectItem value="ha" className="min-h-11">Hausa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="pw-label block">Currency</Label>
                    <Select
                      value={preferences.currency}
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, currency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="NGN" className="min-h-11">Nigerian Naira (₦)</SelectItem>
                        <SelectItem value="USD" className="min-h-11">US Dollar ($)</SelectItem>
                        <SelectItem value="EUR" className="min-h-11">Euro (€)</SelectItem>
                        <SelectItem value="GBP" className="min-h-11">British Pound (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="pw-label block">Timezone</Label>
                    <Select
                      value={preferences.timezone}
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, timezone: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="Africa/Lagos" className="min-h-11">Lagos (WAT)</SelectItem>
                        <SelectItem value="Africa/Abuja" className="min-h-11">Abuja (WAT)</SelectItem>
                        <SelectItem value="UTC" className="min-h-11">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="pw-label block">Theme</Label>
                    <Select
                      value={preferences.theme}
                      onValueChange={(value) => {
                        if (value === "system") {
                          const media = window.matchMedia(
                            "(prefers-color-scheme: dark)",
                          ).matches;
                          setPreferences({ ...preferences, theme: value });
                          return setTheme(media ? "dark" : "light");
                        }
                        setTheme(value);
                        return setPreferences({ ...preferences, theme: value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
                        <SelectItem value="light" className="min-h-11">Light</SelectItem>
                        <SelectItem value="dark" className="min-h-11">Dark</SelectItem>
                        <SelectItem value="system" className="min-h-11">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    onClick={handleSavePreferences}
                    className="w-full sm:w-auto"
                  >
                    <Globe className="h-4 w-4" />
                    <span>Save Preferences</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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

        {is2FAModalOpen && (
          <TwoFactorSetupModal
            isOpen={is2FAModalOpen}
            user={user}
            onClose={() => setIs2FAModalOpen(false)}
            onEnrolled={() => {
              toast.success("2FA enabled!");
              setSecurity((prev) => ({ ...prev, twoFactor: true }));
            }}
            onCancelled={() => {
              setSecurity((prev) => ({ ...prev, twoFactor: false }));
              toast.info("2FA setup was not completed");
            }}
            onEnrollmentFailed={() => {
              setSecurity((prev) => ({ ...prev, twoFactor: false }));
              toast.error("2FA setup failed. Please try again.");
            }}
            onError={() => {
              setSecurity((prev) => ({ ...prev, twoFactor: true }));
              toast.error("2FA disabling failed. Please try again.");
            }}
            onUnenrolled={() => {
              setSecurity((prev) => ({ ...prev, twoFactor: false }));
              SignOut();
            }}
          />
        )}

        {user && twoFADisable && (
          <Disable2FA
            user={user}
            isOpen={twoFADisable}
            isClose={(status) => {
              if (status) {
                set2FADisable(false);
                return setSecurity((prev) => ({ ...prev, twoFactor: false }));
              }
              setSecurity((prev) => ({ ...prev, twoFactor: true }));
              set2FADisable(false);
            }}
            onSuccess={() => {
              setSecurity((prev) => ({ ...prev, twoFactor: false }));
            }}
            onError={() =>
              setTimeout(() => {
                setSecurity((prev) => ({ ...prev, twoFactor: true }));
              }, 3000)
            }
          />
        )}

        <ChangeTransactionPinModal
          isOpen={isChangePinOpen}
          onClose={() => setIsChangePinOpen(false)}
        />

        <ResetTransactionPinModal
          isOpen={isResetPinOpen}
          onClose={() => setIsResetPinOpen(false)}
          onSuccess={() => setIsResetPinOpen(false)}
        />

        <TransactionPinSetupModal
          isOpen={isSetupPinOpen}
          onClose={() => setIsSetupPinOpen(false)}
          onSuccess={() => setIsSetupPinOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
}
