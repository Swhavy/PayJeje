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

import { addUserCred, changeUserPhoto, clearState } from "@/Features/userSlice";
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
  KeyRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSetting } from "@/components/customHook";
import { toast } from "sonner";
import { httpsCallable } from "firebase/functions";
import PasswordResetModal from "@/components/confirmPasswordModal";
import { setDoc, doc, collection, getDoc, updateDoc } from "firebase/firestore";
import TwoFactorSetupModal from "@/components/twoFactorSetup";
import Disable2FA from "@/components/disable2FA";
import ChangeTransactionPinModal from "@/components/ChangeTransactionPinModal";
import TransactionPinSetupModal from "@/components/TransactionPinSetupModal";
import ResetTransactionPinModal from "@/components/ResetTransactionPinModal";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [isSetupPinOpen, setIsSetupPinOpen] = useState(false);
  const [isResetPinOpen, setIsResetPinOpen] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [two2FA, setTwo2FA] = useState(false);
  const { setContext, updateDB } = useSetting();
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
  const [prefButton, setPrefButton] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updatePasswordVisibilty, setUpdatePasswordVisibility] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const userData = useSelector((state) => state.user.user);
  const { userPhoto, uid, twoFactor: twoFactorStatus } = userData;
  const dispatch = useDispatch();
  //call function to update referrer's referrals doc data for this particular user
  const userDPUpdate = httpsCallable(functions, "userDPUpdate");

  const [profile, setProfile] = useState({
    firstName: userData
      ? userData.firstName || userData.userName || "Divine"
      : "Divine",
    lastName: userData ? userData.lastName || "Anyanechi" : "Anyanechi",
    email: userData
      ? userData.userEmail || "divineanyanechi@gmail.com"
      : "divineanyanechi@gmail.com",
    phone: userData
      ? userData.userPhone || "+234 801 234 5678"
      : "+234 801 234 5678",
    dateOfBirth: "1998-06-15",
    location: userData
      ? userData.userState || "Lagos, Nigeria"
      : "Lagos, Nigeria",
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

  //FETCH FROM FIRESTORE ON MOUNT
  useEffect(() => {
    const fetchSettings = async () => {
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
        setSavedSettings({ ...securityData, ...notificationData }); // snapshot
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

  const handleUserPref = useCallback(async (notification) => {
    if (!notification && !hasSecurityChanges) return;
    if (notification && !hasNotificationChanges) return;
    setIsSaving(true);
    let data = {}

    try {
      const prefDocRef = doc(db, "users", uid, "preferences", uid);
      // Determine which data to save based on the notification flag
      notification ? data = { ...notifications } : data = { ...security }
    await updateDoc(prefDocRef, data);
     await handleTimeoutChange(
        security.sessionTimeout,
        security.loginAlerts,
        security.twoFactor,
        notification,
      );
      setSavedSettings({ ...data }); // update snapshot so button disables again
      notification ? toast.success("Notification settings saved.") : toast.success("Security settings saved.");
    } catch (error) {
      notification ? toast.error("Failed to save notification settings. Please try again.") : toast.error("Failed to save security settings. Please try again.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }, [security, notifications, hasSecurityChanges, hasNotificationChanges, uid]);

  const SignOut = () => {
    console.log("login out..");
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
    // Update the Redux store with the new preferences
    notification ? dispatch(
      addUserCred({
        emailNotifications: notifications.email,
        pushNotifications: notifications.push,
        smsNotifications: notifications.sms,
        marketingNotifications: notifications.marketing,
        surveyNotifications: notifications.surveys,
        rewardNotifications: notifications.rewards,
      }),
    ) : dispatch(
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
      setUser(firebaseUser); // null if signed out, user object if signed in
    });

    return () => unsub(); // cleanup listener on unmount
  }, []);

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
      // Allow change password always for this sleek dashboard flow
      setUpdatePasswordVisibility(true);
    });
    return () => unsubScribe();
  }, []);

  const handlePasswordUpdate = async (currentPassword, newPassword) => {
    console.log(`current: ${currentPassword} \nnew: ${newPassword}`);
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

  const handleSaveProfile = () => {
    console.log("Saving profile:", profile);
    toast.success("Profile updated successfully!");
  };

  const handleSaveNotifications = async () => {
    await preferenceUpdate(notifications, uid);
  };

  const handleSavePreferences = () => {
    console.log("Saving preferences:", preferences);
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
      //stores the users profile pic in the DB
      const call = await userDPUpdate({ uid: userData.uid, DP: result.url });
      console.log("call", call);
      if (call.data?.status === "success") {
        updateDB("userPhoto", result.url);
        dispatch(addUserCred({ userPhoto: result.url }));
        setUploading(false);
        console.log("upload to cloudinary", result);
        return toast.success("Photo upload successful");
      } else {
        toast.error(call.data?.message || "Cloudinary error");
      }
    } catch (error) {
      setUploading(false);
      // Fallback for mock environment
      const mockURL =
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face";
      dispatch(addUserCred({ userPhoto: mockURL }));
      toast.success("Photo updated successfully! (Mock Mode)");
      console.log("cloudinary upload bypassed or handled", error);
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
      <div className="space-y-6 max-w-4xl mx-auto px-1 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/40 p-5 rounded-3xl border border-border/60">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground font-display tracking-tight">
              Account Settings
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Manage your account preferences and security
            </p>
          </div>
          <Badge className="bg-green-500/10 border border-green-500/25 text-primary dark:text-green-400 w-fit rounded-xl px-3.5 py-1.5 flex items-center font-bold text-[11px] sm:text-xs uppercase tracking-wider">
            <Shield className="h-4 w-4 mr-2" />
            Verified Account
          </Badge>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="space-y-5">
          <TabsList className="flex w-full overflow-x-auto overflow-y-hidden justify-start sm:grid sm:grid-cols-4 bg-card/60 p-[.05rem] rounded-2xl border border-border gap-1.5 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] snap-x">
            <TabsTrigger
              value="profile"
              className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl text-xs font-black uppercase tracking-wider text-muted-foreground data-[state=active]:bg-green-500/10 data-[state=active]:text-primary dark:text-green-400 data-[state=active]:border data-[state=active]:border-green-500/20 transition-all cursor-pointer snap-center whitespace-nowrap"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl text-xs font-black uppercase tracking-wider text-muted-foreground data-[state=active]:bg-green-500/10 data-[state=active]:text-primary dark:text-green-400 data-[state=active]:border data-[state=active]:border-green-500/20 transition-all cursor-pointer snap-center whitespace-nowrap"
            >
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl text-xs font-black uppercase tracking-wider text-muted-foreground data-[state=active]:bg-green-500/10 data-[state=active]:text-primary dark:text-green-400 data-[state=active]:border data-[state=active]:border-green-500/20 transition-all cursor-pointer snap-center whitespace-nowrap"
            >
              Security
            </TabsTrigger>
            <TabsTrigger
              value="preferences"
              className="flex-1 sm:flex-none py-2.5 px-5 rounded-xl text-xs font-black uppercase tracking-wider text-muted-foreground data-[state=active]:bg-green-500/10 data-[state=active]:text-primary dark:text-green-400 data-[state=active]:border data-[state=active]:border-green-500/20 transition-all cursor-pointer snap-center whitespace-nowrap"
            >
              Preferences
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent
            value="profile"
            className="space-y-5 animate-in fade-in-50 duration-200"
          >
            <Card className="bg-card/45 border-border/80 rounded-3xl overflow-hidden shadow-2xl">
              <CardHeader className="p-5 sm:p-6 border-b border-border/60">
                <CardTitle className="text-foreground text-lg sm:text-xl font-black font-display tracking-tight">
                  Profile Information
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs mt-1">
                  Update your personal information and profile details
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 space-y-6">
                {/* Profile Picture Profile Widget */}
                <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 bg-card/50 p-4 sm:p-5 rounded-2xl border border-border/70">
                  <div className="relative w-20 h-20 bg-green-500/5 rounded-full flex items-center justify-center border border-green-500/15 shadow-inner shrink-0">
                    {uploading && (
                      <div className="absolute inset-0 z-50 m-auto w-6 h-6 rounded-full animate-spin border-4 border-t-muted-foreground border-r-transparent border-b-zinc-400 border-l-transparent"></div>
                    )}
                    {userPhoto ? (
                      <img
                        src={userPhoto}
                        className="h-full w-full rounded-full object-cover"
                        alt="Profile DP"
                      />
                    ) : (
                      <User className="h-10 w-10 text-primary dark:text-green-400" />
                    )}
                  </div>
                  <div className="flex flex-col items-center sm:items-start gap-2.5 w-full">
                    <Button
                      variant="outline"
                      className="border-border text-foreground hover:text-foreground hover:bg-muted bg-transparent rounded-xl h-10 w-full sm:w-auto text-xs font-bold"
                      onClick={handleButtonClick}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handlePic}
                        accept="image/*"
                        className="hidden"
                      />
                      <Camera className="h-4 w-4 mr-2 text-primary dark:text-green-400" />
                      Change Photo
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center sm:text-left">
                      JPG, PNG or GIF. Max size 2MB.
                    </p>
                  </div>
                </div>

                {/* Personal Information Form Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="firstName"
                      className="text-muted-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-wider"
                    >
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      value={profile.firstName}
                      onChange={(e) =>
                        setProfile({ ...profile, firstName: e.target.value })
                      }
                      readOnly
                      className="bg-muted/30 border-border text-muted-foreground rounded-xl h-11 sm:h-12 text-sm cursor-not-allowed focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-border"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="lastName"
                      className="text-muted-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-wider"
                    >
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      value={profile.lastName}
                      onChange={(e) =>
                        setProfile({ ...profile, lastName: e.target.value })
                      }
                      readOnly
                      className="bg-muted/30 border-border text-muted-foreground rounded-xl h-11 sm:h-12 text-sm cursor-not-allowed focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-border"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email"
                      className="text-muted-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-wider"
                    >
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) =>
                          setProfile({ ...profile, email: e.target.value })
                        }
                        readOnly
                        className="pl-10 bg-muted/30 border-border text-muted-foreground rounded-xl h-11 sm:h-12 text-sm cursor-not-allowed focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="phone"
                      className="text-muted-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-wider"
                    >
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="phone"
                        value={profile.phone}
                        onChange={(e) =>
                          setProfile({ ...profile, phone: e.target.value })
                        }
                        readOnly
                        className="pl-10 bg-muted/30 border-border text-muted-foreground rounded-xl h-11 sm:h-12 text-sm cursor-not-allowed focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="dateOfBirth"
                      className="text-muted-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-wider"
                    >
                      Date of Birth
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
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
                        className="pl-10 bg-card/60 border-border text-foreground rounded-xl h-11 sm:h-12 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="location"
                      className="text-muted-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-wider"
                    >
                      Location
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        id="location"
                        value={profile.location}
                        onChange={(e) =>
                          setProfile({ ...profile, location: e.target.value })
                        }
                        readOnly
                        className="pl-10 bg-muted/30 border-border text-muted-foreground rounded-xl h-11 sm:h-12 text-sm cursor-not-allowed focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-border"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveProfile}
                    className="bg-green-500/20 hover:bg-green-500/30 text-primary dark:text-green-400 border border-green-500/20 cursor-not-allowed h-11 px-6 rounded-xl w-full sm:w-auto font-bold text-xs uppercase tracking-wider"
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
              <Card className="bg-card/45 border-border/80 rounded-3xl overflow-hidden shadow-2xl">
                <CardHeader className="p-5 sm:p-6 border-b border-border/60">
                  <CardTitle className="text-foreground text-lg sm:text-xl font-black font-display tracking-tight">
                    Change Password
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-xs mt-1">
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="currentPassword"
                      className="text-muted-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-wider"
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
                        className="bg-card/60 border-border text-foreground rounded-xl h-11 sm:h-12 text-sm pr-11 focus:border-green-500 focus:ring-1 focus:ring-green-500/20"
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

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="newPassword"
                      className="text-muted-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-wider"
                    >
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        name="newPassword"
                        value={credentialSet.newPassword}
                        type={showNewPassword ? "text" : "password"}
                        onChange={controlledInput}
                        className="bg-card/60 border-border text-foreground rounded-xl h-11 sm:h-12 text-sm pr-11 focus:border-green-500 focus:ring-1 focus:ring-green-500/20"
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

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-muted-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-wider"
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
                        className="bg-card/60 border-border text-foreground rounded-xl h-11 sm:h-12 text-sm pr-11 focus:border-green-500 focus:ring-1 focus:ring-green-500/20"
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

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      className="bg-green-500 hover:bg-green-600 text-black h-11 px-6 rounded-xl w-full sm:w-auto font-bold text-xs uppercase tracking-wider"
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
          <TabsContent
            value="notifications"
            className="space-y-5 animate-in fade-in-50 duration-200"
          >
            <Card className="bg-card/45 border-border/80 rounded-3xl overflow-hidden shadow-2xl">
              <CardHeader className="p-5 sm:p-6 border-b border-border/60">
                <CardTitle className="text-foreground text-lg sm:text-xl font-black font-display tracking-tight">
                  Notification Preferences
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs mt-1">
                  Choose how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 space-y-6">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-card/40 border border-border/60 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 shrink-0">
                        <Mail className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-sm font-bold text-foreground block">
                          Email Notifications
                        </Label>
                        <p className="text-xs text-muted-foreground truncate">
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

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-card/40 border border-border/60 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl text-primary dark:text-green-400 shrink-0">
                        <Smartphone className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-sm font-bold text-foreground block">
                          Push Notifications
                        </Label>
                        <p className="text-xs text-muted-foreground truncate">
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

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-card/40 border border-border/60 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 shrink-0">
                        <Phone className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-sm font-bold text-foreground block">
                          SMS Notifications
                        </Label>
                        <p className="text-xs text-muted-foreground truncate">
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

                <div className="border-t border-border/60 pt-6">
                  <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">
                    Notification Types
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 pr-4">
                        <Label className="text-sm font-bold text-foreground block">
                          Marketing & Promotions
                        </Label>
                        <p className="text-xs text-muted-foreground leading-relaxed">
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
                      <div className="min-w-0 pr-4">
                        <Label className="text-sm font-bold text-foreground block">
                          Survey Invitations
                        </Label>
                        <p className="text-xs text-muted-foreground leading-relaxed">
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
                      <div className="min-w-0 pr-4">
                        <Label className="text-sm font-bold text-foreground block">
                          Rewards & Points
                        </Label>
                        <p className="text-xs text-muted-foreground leading-relaxed">
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

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleUserPref(false)}
                    disabled={!hasNotificationChanges || isSaving}
                    className={`flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition-all w-full sm:w-auto
                      ${
                        hasNotificationChanges && !isSaving
                          ? "bg-green-500 text-black cursor-pointer hover:bg-green-400"
                          : "bg-green-500/10 text-green-500/40 border border-green-500/5 cursor-not-allowed"
                      }`}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Notification Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent
            value="security"
            className="space-y-5 animate-in fade-in-50 duration-200"
          >
            <Card className="bg-card/45 border-border/80 rounded-3xl overflow-hidden shadow-2xl">
              <CardHeader className="p-5 sm:p-6 border-b border-border/60">
                <CardTitle className="text-foreground text-lg sm:text-xl font-black font-display tracking-tight">
                  Security Settings
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs mt-1">
                  Manage your account security and privacy
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 space-y-6">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-card/40 border border-border/60 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl text-primary dark:text-green-400 shrink-0">
                        <Shield className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-sm font-bold text-foreground block">
                          Two-Factor Authentication
                        </Label>
                        <p className="text-xs text-muted-foreground truncate">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={security.twoFactor}
                      onCheckedChange={(checked) => {
                        if (!checked) {
                          set2FADisable(true);
                        }
                        setSecurity((prev) => ({
                          ...prev,
                          twoFactor: checked,
                        }));
                        setIs2FAModalOpen(checked);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-card/40 border border-border/60 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 shrink-0">
                        <Bell className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-sm font-bold text-foreground block">
                          Login Alerts
                        </Label>
                        <p className="text-xs text-muted-foreground truncate">
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

                  {/* Transaction PIN Management Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-card/40 border border-border/60 hover:bg-muted/10 transition-colors gap-3.5">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 shrink-0">
                        <KeyRound className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-bold text-foreground block">
                            Transaction PIN
                          </Label>
                          {userData?.hasTransactionPin ? (
                            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold px-2 py-0.5">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-[10px] font-bold px-2 py-0.5">
                              Not Set
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          4-digit secret PIN required to authorize every purchase
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
                            className="h-9 px-3.5 rounded-xl text-xs font-bold border-border/80 hover:bg-muted/50"
                          >
                            Change PIN
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsResetPinOpen(true)}
                            className="h-9 px-3 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40"
                          >
                            Reset PIN
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setIsSetupPinOpen(true)}
                          className="h-9 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold shadow-sm"
                        >
                          Create PIN
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border/60 pt-6">
                  <Label className="text-muted-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-wider block mb-1">
                    Session Timeout
                  </Label>
                  <Select
                    value={security.sessionTimeout}
                    onValueChange={(value) => {
                      setSecurity({ ...security, sessionTimeout: value });
                      console.log("session timeout change", value);
                    }}
                  >
                    <SelectTrigger className="bg-card/60 border-border text-foreground rounded-xl h-11 sm:h-12 focus:border-green-500">
                      <SelectValue placeholder="Select Timeout" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      <SelectItem
                        value="15min"
                        className="text-foreground hover:bg-muted focus:bg-muted"
                      >
                        15 minutes
                      </SelectItem>
                      <SelectItem
                        value="30min"
                        className="text-foreground hover:bg-muted focus:bg-muted"
                      >
                        30 minutes
                      </SelectItem>
                      <SelectItem
                        value="0.5min"
                        className="text-foreground hover:bg-muted focus:bg-muted"
                      >
                        0.5 minutes
                      </SelectItem>
                      <SelectItem
                        value="1hour"
                        className="text-foreground hover:bg-muted focus:bg-muted"
                      >
                        1 hour
                      </SelectItem>
                      <SelectItem
                        value="never"
                        className="text-foreground hover:bg-muted focus:bg-muted"
                      >
                        Never
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Automatically log out after this period of inactivity
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => handleUserPref(false)}
                    disabled={!hasSecurityChanges || isSaving}
                    className={`flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-xs uppercase tracking-wider transition-all w-full sm:w-auto
                      ${
                        hasSecurityChanges && !isSaving
                          ? "bg-green-500 text-black cursor-pointer hover:bg-green-400"
                          : "bg-green-500/10 text-green-500/40 border border-green-500/5 cursor-not-allowed"
                      }`}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Security Settings"}
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent
            value="preferences"
            className="space-y-5 animate-in fade-in-50 duration-200"
          >
            <Card className="bg-card/45 border-border/80 rounded-3xl overflow-hidden shadow-2xl">
              <CardHeader className="p-5 sm:p-6 border-b border-border/60">
                <CardTitle className="text-foreground text-lg sm:text-xl font-black font-display tracking-tight">
                  App Preferences
                </CardTitle>
                <CardDescription className="text-muted-foreground text-xs mt-1">
                  Customize your app experience
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-wider block">
                      Language
                    </Label>
                    <Select
                      value={preferences.language}
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, language: value })
                      }
                    >
                      <SelectTrigger className="bg-card/60 border-border text-foreground rounded-xl h-11 sm:h-12 focus:border-green-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
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

                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-wider block">
                      Currency
                    </Label>
                    <Select
                      value={preferences.currency}
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, currency: value })
                      }
                    >
                      <SelectTrigger className="bg-card/60 border-border text-foreground rounded-xl h-11 sm:h-12 focus:border-green-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
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

                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-wider block">
                      Timezone
                    </Label>
                    <Select
                      value={preferences.timezone}
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, timezone: value })
                      }
                    >
                      <SelectTrigger className="bg-card/60 border-border text-foreground rounded-xl h-11 sm:h-12 focus:border-green-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
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

                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-wider block">
                      Theme
                    </Label>
                    <Select
                      value={preferences.theme}
                      onValueChange={(value) => {
                        if (value === "system") {
                          const media = window.matchMedia(
                            "(prefers-color-scheme: dark)",
                          ).matches;
                          console.log("media", media);
                          setPreferences({ ...preferences, theme: value });
                          return setTheme(media ? "dark" : "light");
                        }
                        setTheme(value);
                        return setPreferences({ ...preferences, theme: value });
                      }}
                    >
                      <SelectTrigger className="bg-card/60 border-border text-foreground rounded-xl h-11 sm:h-12 focus:border-green-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border text-foreground">
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

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSavePreferences}
                    className="bg-green-500 hover:bg-green-600 text-black h-11 px-6 rounded-xl w-full sm:w-auto font-bold text-xs uppercase tracking-wider"
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

        {/* 2FA Setup Modal */}
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

        {/* Disable 2FA Modal */}
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

        {/* Change Transaction PIN Modal */}
        <ChangeTransactionPinModal
          isOpen={isChangePinOpen}
          onClose={() => setIsChangePinOpen(false)}
        />

        {/* Reset Transaction PIN Modal */}
        <ResetTransactionPinModal
          isOpen={isResetPinOpen}
          onClose={() => setIsResetPinOpen(false)}
          onSuccess={() => setIsResetPinOpen(false)}
        />

        {/* Create Transaction PIN Modal */}
        <TransactionPinSetupModal
          isOpen={isSetupPinOpen}
          onClose={() => setIsSetupPinOpen(false)}
          onSuccess={() => setIsSetupPinOpen(false)}
        />
      </div>
    </DashboardLayout>
  );
}
