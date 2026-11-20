import React, { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSpinner } from "@/components/SpinnerProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "@/firebaseConfig";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
  sendEmailVerification,
} from "firebase/auth";
import {
  doc,
  getFirestore,
  getDoc,
  setDoc,
  collection,
  Timestamp,
} from "firebase/firestore";
import { Shield, Loader2 } from "lucide-react";
import {
  addUserCred,
  addUserInfo,
  changeUserPhoto,
  updateAchievement,
} from "@/Features/userSlice";
import { auth } from "@/firebaseConfig";
import { toast } from "sonner";
import useCloudfunc from "@/components/useCloudfunc";
import Navbar from "../../components/Navbar";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function LoginPage() {
  const [mfaResolver, setMfaResolver] = useState(null); // holds the resolver between steps
  const [otpCode, setOtpCode] = useState("");
  //Login credentials of user
  const [field, setField] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [mfaError, setMfaError] = useState(null);
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const { setAppContext, appContext } = useSpinner();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { getWalletBalance } = useCloudfunc();

  const controlledInput = (e) => {
    const enter = { ...field, [e.target.id]: e.target.value };
    setField(enter);
  };

  const fetchAndDispatchUserData = async (user) => {
    const uid = user.uid;
    const userRef = doc(db, "users", uid);
    const prefRef = doc(db, "users", uid, "preferences", uid);
    const achievements = doc(db, "users", uid, "achievements", "stats");

    let userData;
    try {
      userData = await getDoc(userRef);
      if (!userData.exists()) {
        console.warn("[AUTH RECOVERY] Orphaned Auth account detected with no Firestore profile for UID:", uid);
        const recoveredData = {
          userName: user.displayName || user.email?.split("@")[0] || "User",
          userEmail: user.email || "",
          userPhoto: user.photoURL || null,
          firstName: user.displayName ? user.displayName.split(" ")[0] : "",
          lastName:
            user.displayName && user.displayName.split(" ").length > 1
              ? user.displayName.split(" ").slice(1).join(" ")
              : "",
          userPhone: user.phoneNumber || "",
          userGender: "",
          refferalsCount: 0,
          streak: 0,
          points: 0,
        };
        await setDoc(userRef, recoveredData);

        const userAchievementsSnap = await getDoc(achievements);
        if (!userAchievementsSnap.exists()) {
          await setDoc(achievements, {
            firstSurvey: 0,
            pointsEarned: 0,
            billPayer: 0,
            referralMaster: 0,
          });
        }
        userData = await getDoc(userRef);
        toast.info("Account profile initialized successfully.");
      }
    } catch (err) {
      console.error("[AUTH RECOVERY] Profile initialization failed:", err);
      throw new Error("Unable to initialize user profile. Please try again or contact support.");
    }

    const docRef = userData.data() || {};
    const userAchievements = await getDoc(achievements);
    const prefData = await getDoc(prefRef);
    const prefDocRef = prefData.exists() ? prefData.data() : {};

    // fetch wallet balance safely
    if (docRef.accountReference) {
      const wallet = await getWalletBalance(docRef.accountReference);
      if (wallet && wallet.status === "success") {
        console.log("wallet balance fetched", wallet);
        dispatch(addUserCred({ walletBalance: wallet.walletBalance }));
      } else {
        console.log("error fetching wallet balance", wallet);
        dispatch(addUserCred({ walletBalance: null }));
      }
    } else {
      dispatch(addUserCred({ walletBalance: null }));
    }

    const payload = {
      firstName: docRef.firstName || "",
      lastName: docRef.lastName || "",
      userName: docRef.userName || user.displayName || "",
      userEmail: docRef.userEmail || user.email || "",
      userState: docRef.userState || "",
      userCountry: docRef.userCountry || "",
      userGender: docRef.userGender || "",
      userPhone: docRef.userPhone || "",
      userPhoto: docRef.userPhoto || user.photoURL || null,
      accountReference: docRef.accountReference || null,
      accountNumber: docRef.accountNumber || null,
      bankName: docRef.bankName || null,
      barterID: docRef.barter_id || null,
      referralCode: docRef.referralCode || null,
      refferalsCount: docRef.refferalsCount || 0,
      streak: docRef.streak || 0,
      hasTransactionPin: !!docRef.hasTransactionPin,
      points: Number(docRef.points) || 0,
      role: docRef.role || "user",
      vendorId: docRef.vendorId || null,
      vendorBranch: docRef.vendorBranch || null,
      cashierName: docRef.cashierName || null,
    };
    dispatch(addUserCred({ ...payload, ...prefDocRef, uid }));
    dispatch(updateAchievement(userAchievements.exists() ? userAchievements.data() : {}));
    return { uid, userRef, docRef };
  };

  //function that logs into a user account
  const handleSubmit = async (e) => {
    setIsLoading(true);
    setAppContext({ ...appContext, spinner: true });
    console.log("loginnng in...");
    e.preventDefault();
    const email = field.email;
    const password = field.password;
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      const { uid, userRef, docRef } = await fetchAndDispatchUserData(user);
      //if the user has profile pic, dispatch it to the state if not dispatch null to the userPhoto state
      if (docRef?.userPhoto) {
        dispatch(changeUserPhoto({ userPhoto: docRef.userPhoto || null }));
      }

      await setDoc(
        userRef,
        { lastLogin: Timestamp.fromDate(new Date()) },
        { merge: true },
      );
      await setDoc(
        doc(db, "users", uid, "lastLogin", "details01"),
        { lastLogin: Timestamp.fromDate(new Date()) },
        { merge: true },
      );
      const emailVerified = await userEmailVerified();
      if (emailVerified) {
        navigate("/dashboard");
      }
      setIsLoading(false);
      setAppContext({ ...appContext, spinner: false });
    } catch (error) {
      setIsLoading(false);
      setAppContext({ ...appContext, spinner: false });
      console.log("there's an error:", error);
      if (error.code === "auth/multi-factor-auth-required") {
        // Store resolver in state — show OTP input to user
        return setMfaResolver(getMultiFactorResolver(auth, error));
      } else if (error.code === "auth/user-not-found") {
        return toast.error(
          "No user found with this email. Please check and try again.",
        );
      } else if (error.code === "auth/network-request-failed") {
        return toast.error("Seem's you might be having a network issue");
      } else if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        return toast.error(
          "Hmmm.. we don't think that's the right password please recheck an then try again.",
        );
      } else if (error.message && error.message.includes("profile")) {
        return toast.error(error.message);
      }
      return toast.error(
        "An error occurred this might be to an invalid credential or an unverified email",
      );
    }
  };
  //2FA verification handler
  const handleMfaVerify = async () => {
    if (!mfaResolver || otpCode.length !== 6) return;
    setMfaVerifying(true);
    setMfaError(null);

    try {
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(
        mfaResolver.hints[0].uid,
        otpCode,
      );

      const userCredential = await mfaResolver.resolveSignIn(assertion);
      const user = userCredential.user;
      const { uid, userRef, docRef } = await fetchAndDispatchUserData(user);
      if (docRef?.userPhoto) {
        dispatch(changeUserPhoto({ userPhoto: docRef.userPhoto || null }));
      }

      await Promise.all([
        setDoc(
          userRef,
          { lastLogin: Timestamp.fromDate(new Date()) },
          { merge: true },
        ),
        setDoc(
          doc(db, "users", uid, "lastLogin", "details01"),
          { lastLogin: Timestamp.fromDate(new Date()) },
          { merge: true },
        ),
      ]);
      navigate("/dashboard");
    } catch (err) {
      setMfaError(
        err.code === "auth/invalid-verification-code"
          ? "Incorrect code. Check your authenticator app and try again."
          : "Verification failed. Please try again.",
      );
    } finally {
      setMfaVerifying(false);
    }
  };

  //default authLogin Code
  // const handleOAuthLogin = async (provider) => {
  //   setOauthLoading(provider);
  //   try {
  //     console.log(`Initiating ${provider} OAuth login...`);
  //     setTimeout(() => {
  //       setOauthLoading(null);
  //       window.location.href = "/dashboard";
  //     }, 2000);
  //   } catch (error) {
  //     console.error(`${provider} OAuth error:`, error);
  //     setOauthLoading(null);
  //   }
  // };

  //checks if the user Email is verified
  const userEmailVerified = useCallback(async () => {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe(); // Unsubscribe immediately to prevent multiple triggers
        try {
          if (user) {
            await user.reload();
            if (user.emailVerified) {
              console.log("email verified");
              resolve(true);
              // if (navigate !== "loading") {
              //   setAppContext({ ...appContext, spinner: false });
              // } else {
              //   setAppContext({ ...appContext, spinner: true });
              // }
            } else {
              console.log("user", user.emailVerified)
              auth.signOut();
              toast.error("Please verify your email before logging in.");
              navigate("/auth/login");
              resolve(false);
            }
          }
        } catch (error) {
          toast.error(
            "An internal error occurred while checking your email verification. Please try again later.",
          );
          console.log(
            "error occured internally when verifying email verification",
            error,
          );
          reject(error);
        }
      });
    });
  }, []);

  const handleOAuthLogin = async (provider, providerName) => {
    setOauthLoading(provider);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const user = await signInWithPopup(auth, provider);
      console.log(`${providerName} OAuth login successful`, user);
      const uid = user.user?.uid;
      const userRef = doc(db, "users", uid);
      const achievements = doc(db, "users", uid, "achievements", "stats");

      // "userPersonalizations",
      //   "userSettings",

      const docSnap = await getDoc(userRef);
      const emailVerified = await userEmailVerified();
      //if the user does not exist in the database create a new user
      if (!docSnap.exists()) {
        const userData = {
          userName: user.user.displayName,
          userEmail: user.user.email,
          userPhoto: user.user.photoURL,
          streak: 0,
          points: 0,
        };
        const achievements = doc(db, "users", uid, "achievements", "stats");
        const achievementsData = {
          firstSurvey: 0,
          pointsEarned: 0,
          billPayer: 0,
          referralMaster: 0,
        };
        dispatch(addUserCred({ ...userData, uid }));
        dispatch(updateAchievement(achievementsData));
        dispatch(changeUserPhoto({ userPhoto: user.user.photoURL }));
        setDoc(userRef, userData);
        setDoc(achievements, achievementsData);
        //userEmailVerified();
        await sendEmailVerification(auth.currentUser);
        toast.success(
          `A verification email has been sent to ${user.user.email}. Please verify your email before logging in.`,
        );
        // navigate("/auth/verify-email");
        //navigate("/useraccount");
      }
      //if the user exists in the database login the user
      else {
        const prefRef = doc(db, "users", uid, "preferences", uid);
        const userAchievements = await getDoc(achievements);
        const prefDoc = await getDoc(prefRef);
        const userData = docSnap.data();
        const prefData = prefDoc.data();
        const payload = {
          firstName: userData?.firstName,
          lastName: userData?.lastName,
          userName: userData?.userName,
          userEmail: userData?.userEmail,
          userState: userData?.userState,
          userCountry: userData?.userCountry,
          userGender: userData?.userGender,
          userPhone: userData?.userPhone,
          userPhoto: userData?.userPhoto,
          accountReference: userData?.accountReference,
          accountNumber: userData?.accountNumber,
          bankName: userData?.bankName,
          barterID: userData?.barter_id,
          referralCode: userData?.referralCode,
          refferalsCount: userData?.refferalsCount,
          streak: userData?.streak,
          hasTransactionPin: !!userData?.hasTransactionPin,
          points: 0,
        };
        dispatch(addUserCred({ ...payload, ...prefData, uid }));
        dispatch(updateAchievement(userAchievements.data()));
        console.log("pinpoint", userData);
        setOauthLoading(null);
        //set Last Login
        await setDoc(
          userRef,
          { lastLogin: Timestamp.fromDate(new Date()) },
          { merge: true },
        );
        await setDoc(
          doc(db, "users", uid, "lastLogin", "details01"),
          { lastLogin: Timestamp.fromDate(new Date()) },
          { merge: true },
        );
        console.log("email verification status", emailVerified);
        emailVerified && navigate("/dashboard");
      }
    } catch (error) {
      setOauthLoading(null);
      console.log(
        `error occurred while logging in with ${providerName}`,
        error,
      );
      if (error.code === "auth/network-request-failed") {
        return toast.error("Seem's you might be having a network issue");
      }
      if (error.code === "auth/multi-factor-auth-required") {
        // Store resolver in state — show OTP input to user
        return setMfaResolver(getMultiFactorResolver(auth, error));
      }
      toast.error(`An error occurred while logging in with ${providerName}`);
    }
  };

  if (mfaResolver) {
    return (
      <div className="fixed inset-0 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div className="pw-glass-hero p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-5">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="pw-tile h-14 w-14 rounded-pill">
              <Shield className="w-7 h-7" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center space-y-1.5">
            <h2 className="text-section-title text-foreground">
              Two-Factor Authentication
            </h2>
            <p className="text-caption text-muted-foreground">
              Enter the 6-digit code from your authenticator app to continue
            </p>
          </div>

          {/* OTP Input */}
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            aria-label="6-digit authentication code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
            className="pw-input pw-code h-14 text-center text-2xl sm:text-3xl tracking-[0.45em]"
            autoFocus
          />

          {/* Error */}
          {mfaError && (
            <div className="bg-destructive/10 border border-destructive/25 rounded-panel px-4 py-3">
              <p className="text-destructive text-caption font-semibold text-center">{mfaError}</p>
            </div>
          )}

          {/* Verify Button */}
          <Button
            type="button"
            onClick={handleMfaVerify}
            disabled={otpCode.length !== 6 || mfaVerifying}
            className="w-full h-12"
          >
            {mfaVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              "Verify & Sign In"
            )}
          </Button>

          {/* Back link */}
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMfaResolver(null)}
            className="w-full text-muted-foreground"
          >
            ← Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen pw-app-canvas flex items-center justify-center pt-20 pb-8 px-4 ${isLoading || appContext.spinner ? "h-screen overflow-hidden" : ""}`}
    >
      <Navbar />
      <div className="w-full max-w-md">
        <div className="pw-glass-hero p-5 sm:p-6 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="pw-page-title text-foreground">Welcome Back</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2.5">
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 text-sm"
                onClick={() =>
                  handleOAuthLogin(new GoogleAuthProvider(), "Google")
                }
                disabled={oauthLoading !== null}
              >
                {oauthLoading === "Google" ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                <span className="ml-2">Continue with Google</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 text-sm"
                onClick={() =>
                  handleOAuthLogin(new FacebookAuthProvider(), "Facebook")
                }
                disabled={oauthLoading !== null}
              >
                {oauthLoading === "Facebook" ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FacebookIcon />
                )}
                <span className="ml-2">Continue with Facebook</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 text-sm"
                onClick={() => handleOAuthLogin("twitter")}
                disabled={oauthLoading !== null}
              >
                {oauthLoading === "twitter" ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <XIcon />
                )}
                <span className="ml-2">Continue with X</span>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-3 rounded-pill bg-card text-muted-foreground pw-label">
                  Or continue with email
                </span>
              </div>
            </div>

            <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="pw-label block">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                  <Input
                    id="email"
                    value={field.email}
                    onChange={(e) => controlledInput(e)}
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="pw-label block">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                  <Input
                    id="password"
                    value={field.password}
                    onChange={(e) => controlledInput(e)}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pl-10 pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <input
                    id="remember"
                    type="checkbox"
                    className="h-4 w-4 rounded border-border accent-brand-500"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-caption text-muted-foreground cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
                <Link
                  to="/auth/forgot-password"
                  className="text-caption font-semibold text-brand-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading || oauthLoading !== null}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  to="/auth/register"
                  className="font-semibold text-brand-400 hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
