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

// Regular img tag instead of next/image
const Logo = () => (
  <img
    src="/logo.svg"
    alt="Paywaka Logo"
    width={120}
    height={120}
    className="rounded-full"
  />
);

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
      className={`min-h-screen bg-background flex items-center justify-center p-4 ${isLoading ? "h-screen overflow-hidden" : appContext.spinner ? "h-screen overflow-hidden" : ""}`}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <Logo />
            <span className="text-2xl font-bold text-foreground">
              Pay
              <span className="text-green-600 dark:text-green-400">waka</span>
            </span>
          </Link>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-foreground">Create Account</CardTitle>
            <CardDescription className="text-muted-foreground">
              Join thousands earning with Paywaka
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OAuth Buttons */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-border hover:bg-accent"
                onClick={() =>
                  handleOAuthSignup(new GoogleAuthProvider(), "Google")
                }
                disabled={oauthLoading !== null}
              >
                {oauthLoading === "Google" ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                <span className="ml-2">Continue with Google</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-border hover:bg-accent"
                onClick={() => handleOAuthSignup("facebook")}
                disabled={oauthLoading !== null}
              >
                {oauthLoading === "facebook" ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FacebookIcon />
                )}
                <span className="ml-2">Continue with Facebook</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-border hover:bg-accent"
                onClick={() => handleOAuthSignup("twitter")}
                onPointer
                disabled={oauthLoading !== null}
              >
                {oauthLoading === "twitter" ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-foreground">
                    First Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      id="first-name"
                      type="text"
                      value={field["first-name"]}
                      onChange={(e) => controlledInput(e)}
                      placeholder="John"
                      className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-foreground">
                    Last Name
                  </Label>
                  <Input
                    id="last-name"
                    type="text"
                    value={field["last-name"]}
                    onChange={(e) => controlledInput(e)}
                    placeholder="Doe"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="email"
                    value={field.email}
                    onChange={(e) => controlledInput(e)}
                    type="email"
                    placeholder="john@example.com"
                    className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="userName"
                    value={field["userName"]}
                    onChange={(e) => controlledInput(e)}
                    type="username"
                    placeholder="swhavy"
                    className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender" className="text-foreground">
                  Gender
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="gender"
                    value={field["gender"]}
                    onChange={(e) => controlledInput(e)}
                    type="gender"
                    placeholder="female/male"
                    className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    required
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
                    value={field.phone}
                    onChange={(e) => controlledInput(e)}
                    type="tel"
                    placeholder="+234 800 000 0000"
                    className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">
                  Referral code
                </Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="refLink"
                    value={field.refLink}
                    onChange={(e) => controlledInput(e)}
                    disabled
                    type="tel"
                    placeholder="the code of the person that referred you"
                    className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="password"
                    value={field.password}
                    onChange={(e) => controlledInput(e)}
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    className="pl-10 pr-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="cpassword"
                    value={field.cpassword}
                    onChange={(e) => controlledInput(e)}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="pl-10 pr-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
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
                  className="rounded border-border text-green-600 focus:ring-green-500"
                  required
                />
                <Label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground"
                >
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    className="text-green-600 dark:text-green-400 hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    className="text-green-600 dark:text-green-400 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-foreground"
                disabled={isLoading || oauthLoading !== null}
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/auth/login"
                  className="text-green-600 dark:text-green-400 hover:underline"
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
        <div className="h-1/2">
          <FeedbackAlert
            isOpen={verifiedEmail}
            isClose={() => setVerifiedEmail((prev) => (prev = false))}
            message={{
              status: true,
              statusMsg: "Email Verification Link Sent",
              message:
                "A verification link has been sent to your email. Please verify your email to complete the registration process.",
            }}
          />
        </div>
      )}
    </div>
  );
}
