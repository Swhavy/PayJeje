import React, { useState } from "react";
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
  sendEmailVerification,
} from "firebase/auth";
import { doc, getFirestore, getDoc, setDoc } from "firebase/firestore";
import {
  addUserCred,
  addUserInfo,
  changeUserPhoto,
} from "@/Features/userSlice";
import { auth } from "@/firebaseConfig";
import { toast } from "sonner";
import useCloudfunc from "@/components/useCloudfunc";

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
  //Login credentials of user
  const [field, setField] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const { setAppContext, appContext } = useSpinner();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { getWalletBalance } = useCloudfunc();

  const controlledInput = (e) => {
    const enter = { ...field, [e.target.id]: e.target.value };
    setField(enter);
  };

  //function that logs in a user account
  const handleSubmit = async (e) => {
    setIsLoading(true);
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

      //console.log("user details", user);

      const uid = user.uid;
      //fetch user data from firestore
      const userRef = doc(db, "users", uid);

      const userData = await getDoc(userRef);
      const docRef = userData.data();
      //fetch wallet balance
      const wallet = await getWalletBalance(docRef.accountReference);
      if (wallet.status === "success") {
        console.log("wallet balance fetched", wallet);
        dispatch(addUserCred({ walletBalance: wallet.walletBalance }));
      } else {
        console.log("error fetching wallet balance", wallet);
        dispatch(addUserCred({ walletBalance: "error" }));
      }
      const payload = {
        firstName: docRef?.firstName,
        lastName: docRef?.lastName,
        userName: docRef?.userName,
        userEmail: docRef?.userEmail,
        userState: docRef?.userState,
        userCountry: docRef?.userCountry,
        userGender: docRef?.userGender,
        userPhone: docRef?.userPhone,
        userPhoto: docRef?.userPhoto,
        accountReference: docRef?.accountReference,
        accountNumber: docRef?.accountNumber,
        bankName: docRef?.bankName,
        barterID: docRef?.barter_id,
        referralLink: docRef?.referralCode,
      };
      dispatch(addUserCred({ ...payload, uid }));
      //if the user has profile pic, dispatch it to the state if not dispatch null to the userPhoto state
      if (docRef?.userPhoto) {
        dispatch(changeUserPhoto({ userPhoto: docRef.userPhoto || null }));
      }

      navigate("/dashboard");
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.log("there's an error:", error);
      alert(
        "An error occurred this might be to an invalid credential or an unverified email",
      );
      setAppContext({ ...appContext, spinner: false });
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
  const userEmailVerified = () => {
    onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          await user.reload();
          if (user.emailVerified) {
            console.log("email verified...login successful");
            navigate("/dashboard");
            if (navigate !== "loading") {
              setAppContext({ ...appContext, spinner: false });
            } else {
              setAppContext({ ...appContext, spinner: true });
            }
          } else {
            toast.error("Please verify your email before logging in.");
            auth.signOut();
            setAppContext({ ...appContext, spinner: false });
          }
        }
      } catch (error) {
        console.log("error occured internally", error);
      }
    });
  };

  const handleOAuthLogin = async (provider, providerName) => {
    setOauthLoading(provider);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const user = await signInWithPopup(auth, provider);
      console.log(`${providerName} OAuth login successful`, user);
      const uid = user.user?.uid;
      const userRef = doc(db, "users", uid);
      // "userPersonalizations",
      //   "userSettings",

      const docSnap = await getDoc(userRef);
      //if the user does not exist in the database create a new user
      if (!docSnap.exists()) {
        const userData = {
          userName: user.user.displayName,
          userEmail: user.user.email,
          userPhoto: user.user.photoURL,
        };
        dispatch(addUserCred({ ...userData, uid }));
        dispatch(changeUserPhoto({ userPhoto: user.user.photoURL }));
        setDoc(userRef, userData);
        //userEmailVerified();
        sendEmailVerification(auth.currentUser);
        toast.success(
          `A verification email has been sent to ${user.user.email}. Please verify your email before logging in.`,
        );
        // navigate("/auth/verify-email");
        //navigate("/useraccount");
      }
      //if the user exists in the database login the user
      else {
        const userData = docSnap.data();
        dispatch(addUserCred({ ...userData, uid }));
        console.log("pinpoint", userData);
        userEmailVerified();
        //navigate('/useraccount')
      }
      setOauthLoading(null);
    } catch (error) {
      setOauthLoading(null);
      console.log("error occurred while logging in with google", error);
      toast.error(`An error occurred while logging in with ${providerName}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <img
              src="/logo.png"
              alt="Paywaka Logo"
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="text-2xl font-bold text-foreground">
              Pay
              <span className="text-green-600 dark:text-green-400">waka</span>
            </span>
          </Link>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-foreground">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border-border hover:bg-accent"
                onClick={() =>
                  handleOAuthLogin(new GoogleAuthProvider(), "Google")
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
                onClick={() =>
                  handleOAuthLogin(new FacebookAuthProvider(), "Facebook")
                }
                disabled={oauthLoading !== null}
              >
                {oauthLoading === "Facebook" ? (
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
                onClick={() => handleOAuthLogin("twitter")}
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

            <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
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
                    placeholder="Enter your email"
                    className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    required
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
                    placeholder="Enter your password"
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

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    id="remember"
                    type="checkbox"
                    className="rounded border-border text-green-600 focus:ring-green-500"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm text-muted-foreground"
                  >
                    Remember me
                  </Label>
                </div>
                <Link
                  to="/auth/forgot-password"
                  className="text-sm text-green-600 dark:text-green-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                disabled={isLoading || oauthLoading !== null}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/auth/register"
                  className="text-green-600 dark:text-green-400 hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
