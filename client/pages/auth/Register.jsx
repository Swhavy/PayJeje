import React, { useState } from "react";
import { useDispatch } from "react-redux";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import FeedbackAlert from "@/components/Alert";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useSpinner } from "@/components/SpinnerProvider";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  Link as LinkIcon,
} from "lucide-react";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  setPersistence,
  signInWithPopup,
} from "firebase/auth";
import { setDoc, doc, getDoc, collection } from "firebase/firestore";
import {
  addUserCred,
  changeUserPhoto,
  updateAchievement,
} from "@/Features/userSlice";
import { auth, db } from "@/firebaseConfig";
import { toast, Toaster } from "sonner";

// For navigation
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";

// OAuth provider icons
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

export default function RegisterPage() {
  const { appContext, setAppContext } = useSpinner();
  const controlledInput = (e) => {
    const enter = { ...field, [e.target.id]: e.target.value };
    setField(enter);
  };
  const { referredBy } = useParams();
  const [field, setField] = useState({
    "first-name": "",
    "last-name": "",
    gender: "",
    phone: "",
    email: "",
    password: "",
    cpassword: "",
    userName: "",
    refLink: referredBy || "",
  });
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);

  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   setIsLoading(true);
  //   setTimeout(() => {
  //     setIsLoading(false);
  //     window.location.href = "/dashboard";
  //   }, 2000);
  // };

  // const handleOAuthSignup = (provider) => {
  //   setOauthLoading(provider);
  //   console.log(`Initiating ${provider} OAuth signup...`);
  //   setTimeout(() => {
  //     setOauthLoading(null);
  //     window.location.href = "/dashboard";
  //   }, 2000);
  // };

  //checks if the user Email is verified
  const userEmailVerified = () => {
    onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          await user.reload();
          if (user.emailVerified) {
            console.log("email verified...login successful");
            navigate("/dashboard");
            setAppContext({ ...appContext, spinner: false });
            // if (navigate !== "loading") {
            //   setAppContext({ ...appContext, spinner: false });
            // } else {
            //   setAppContext({ ...appContext, spinner: true });
            // }
          }
        }
      } catch (error) {
        console.log(
          "error occured internally in user email authentication block line 153",
          error,
        );
      }
    });
  };

  const handleOAuthSignup = async (provider, providerName) => {
    setOauthLoading(provider);
    setAppContext({ ...appContext, spinner: true });
    try {
      await setPersistence(auth, browserLocalPersistence);
      const user = await signInWithPopup(auth, provider);

      const uid = user.user.uid;
      const userRef = doc(db, "users", uid);
      const achievements = doc(db, "users", uid, "achievements", "stats");
      const achievementsData = {
        firstSurvey: 0,
        pointsEarned: 0,
        billPayer: 0,
        referralMaster: 0,
      };

      const docSnap = await getDoc(userRef);
      const achievementSnap = await getDoc(achievements);
      //if the user does not exist in the database create a new user
      if (!docSnap.exists()) {
        const userData = {
          userName: user.user.displayName,
          userEmail: user.user.email,
          userPhoto: user.user.photoURL,
          refferalsCount: 0,
          streak: 0,
          points: 0,
        };
        dispatch(addUserCred(userData));
        dispatch(updateAchievement(achievementsData));
        dispatch(changeUserPhoto({ userPhoto: user.user.photoURL }));
        setDoc(userRef, { ...userData, referredBy: field.refLink });
        setDoc(achievements, achievementsData);
        await sendEmailVerification(auth.currentUser);

        setOauthLoading(null);
        setAppContext({ ...appContext, spinner: false });
        //navigate("/useraccount");
      }
      //if the user exists in the database login the user
      else {
        const userData = docSnap.data();
        dispatch(addUserCred(userData));
        dispatch(updateAchievement(achievementSnap.data()));
        console.log(userData);
        userEmailVerified;

        //navigate('/useraccount')
      }
      setOauthLoading(null);
      await setDoc(
        userRef,
        { lastLogin: Timestamp.fromDate(Date.now()) },
        { merge: true },
      );
      await setDoc(
        doc(db, "users", uid, "lastLogin", "details01"),
        { lastLogin: Timestamp.fromDate(Date.now()) },
        { merge: true },
      );
    } catch (error) {
      setOauthLoading(null);
      setAppContext({ ...appContext, spinner: false });
      console.log("error occurred while logging in with google", error);
      toast.error(`An error occurred while logging in with ${providerName}`);
    }
  };

  //signup with email and password
  const handleSubmit = async (e) => {
    //setSpin(true);
    setIsLoading(true);
    setAppContext({ ...appContext, spinner: true });
    e.preventDefault();
    // const auth = getAuth();

    try {
      if (field.password !== field.cpassword) {
        toast.error("Passwords do not match");
        setIsLoading(false);
        setAppContext({ ...appContext, spinner: false });
        return;
      }
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        field.email,
        field.password,
      );

      const user = userCredential.user;
      const userID = user.uid;
      const achievements = doc(db, "users", userID, "achievements", "stats");
      const achievementsData = {
        firstSurvey: 0,
        pointsEarned: 0,
        billPayer: 0,
        referralMaster: 0,
      };

      const userData = {
        firstName: field["first-name"],
        lastName: field["last-name"],
        userEmail: field.email,
        userPhone: field.phone,
        userGender: field.gender,
        userName: field.userName,
        refferalsCount: 0,
        streak: 0,
        points: 0,
      };

      await setDoc(doc(db, "users", userID), {
        ...userData,
        referredBy: field.refLink,
      });
      await setDoc(achievements, achievementsData);

      dispatch(addUserCred(userData));
      dispatch(updateAchievement(achievementsData));

      console.log("sucessfully signed up");
      await sendEmailVerification(auth.currentUser);
      setIsLoading(false);
      setAppContext({ ...appContext, spinner: false });
      setVerifiedEmail((prev) => (prev = true));
      //navigate("/successfulsignup");
      //setSpin(false);
    } catch (error) {
      setIsLoading(false);
      setAppContext({ ...appContext, spinner: false });
      if (error.code === "auth/email-already-in-use") {
        console.log("Email is already registered.");
        // You can show a message in UI
        toast.error("This email is already in use. Try logging in instead.");
        //navigate to login page after 3 seconds
        setTimeout(() => {
          navigate("/auth/login");
        }, 3000);
      } else if (error.message === "Passwords do not match") {
        console.log("Passwords do not match");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Invalid email format.");
      } else if (error.code === "auth/weak-password") {
        toast.error("Password should be at least 6 characters.");
      } else {
        console.log("Error signing up user:", error);
        toast.error(error.message); // fallback
      }
      console.error("error signing up user", error.FirebaseError);
    }
  };
  return (
    <div
      className={`min-h-screen pw-app-canvas flex items-center justify-center pt-20 pb-8 px-4 ${isLoading ? "h-screen overflow-hidden" : appContext.spinner ? "h-screen overflow-hidden" : ""}`}
    >
      <Navbar />
      <div className="w-full max-w-md">
        <Card className="pw-glass-hero">
          <CardHeader className="text-center p-5 pb-3">
            <CardTitle className="pw-page-title text-foreground">Create Account</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground">
              Join thousands earning with PayWaka
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2 space-y-5">
            {/* OAuth Buttons */}
            <div className="space-y-2.5">
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 text-sm"
                onClick={() =>
                  handleOAuthSignup(new GoogleAuthProvider(), "Google")
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
                onClick={() => handleOAuthSignup("facebook")}
                disabled={oauthLoading !== null}
              >
                {oauthLoading === "facebook" ? (
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
                onClick={() => handleOAuthSignup("twitter")}
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
                <span className="bg-card px-3 rounded-pill pw-label text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="first-name" className="pw-label block">
                    First Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                    <Input
                      id="first-name"
                      type="text"
                      value={field["first-name"]}
                      onChange={(e) => controlledInput(e)}
                      placeholder="John"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last-name" className="pw-label block">
                    Last Name
                  </Label>
                  <Input
                    id="last-name"
                    type="text"
                    value={field["last-name"]}
                    onChange={(e) => controlledInput(e)}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

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
                    placeholder="john@example.com"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="userName" className="pw-label block">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                  <Input
                    id="userName"
                    value={field["userName"]}
                    onChange={(e) => controlledInput(e)}
                    type="text"
                    placeholder="swhavy"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gender" className="pw-label block">
                  Gender
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                  <Input
                    id="gender"
                    value={field["gender"]}
                    onChange={(e) => controlledInput(e)}
                    type="text"
                    placeholder="female/male"
                    className="pl-10"
                    required
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
                    value={field.phone}
                    onChange={(e) => controlledInput(e)}
                    type="tel"
                    placeholder="+234 800 000 0000"
                    className="pl-10 pw-code"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="refLink" className="pw-label block">
                  Referral code
                </Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                  <Input
                    id="refLink"
                    value={field.refLink}
                    onChange={(e) => controlledInput(e)}
                    disabled
                    type="text"
                    placeholder="Optional referral code"
                    className="pl-10 pw-code"
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
                    placeholder="Create a strong password"
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

              <div className="space-y-1.5">
                <Label htmlFor="cpassword" className="pw-label block">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4 pointer-events-none" />
                  <Input
                    id="cpassword"
                    value={field.cpassword}
                    onChange={(e) => controlledInput(e)}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="pl-10 pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="terms"
                  type="checkbox"
                  className="rounded border-border text-brand-500 focus:ring-brand-500"
                  required
                />
                <Label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground"
                >
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isLoading || oauthLoading !== null}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/auth/login"
                  className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      {/*  <Toaster position="top-center" richColors /> */}
      {verifiedEmail && (
        <FeedbackAlert
          isOpen={verifiedEmail}
          isClose={() => setVerifiedEmail(false)}
          message={{
            status: true,
            statusMsg: "Email Verification Link Sent",
            message:
              "A verification link has been sent to your email. Please verify your email to complete the registration process.",
          }}
        />
      )}
    </div>
  );
}
