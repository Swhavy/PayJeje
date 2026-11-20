import { useState } from "react";
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
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Check,
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
import Navbar from "../../components/Navbar";

const TOTAL_STEPS = 3;

const Logo = () => (
  <img
    src="/logo.png"
    alt="Paywaka Logo"
    width={120}
    height={120}
    className="rounded-full"
  />
);

export default function SignupFlow() {
  const { referredBy } = useParams();
  const dispatch = useDispatch();
  const initialFormData = {
    email: "",
    gender: "",
    phone: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    userName: "",
    lastName: "",
    dateOfBirth: "",
    accountType: "personal",
    notifications: true,
    terms: false,
    refLink: referredBy || "",
  };
  const { appContext, setAppContext } = useSpinner();
  const navigate = useNavigate();
  const [genderClicked, setGenderClicked] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [field, setField] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [verifiedEmail, setVerifiedEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);

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
          twoFactor: false,
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
        const prefRef = doc(db, "users", uid, "preferences", uid);
        const prefDoc = await getDoc(prefRef);
        const prefData = prefDoc.data() 
        dispatch(addUserCred({ ...userData, ...prefData }));
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
      if (field.password !== field.confirmPassword) {
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
        firstName: field["firstName"],
        lastName: field["lastName"],
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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setField((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!field.email) newErrors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.email))
        newErrors.email = "Invalid email format";

      if (!field.password) newErrors.password = "Password is required";
      else if (field.password.length < 8)
        newErrors.password = "Password must be at least 8 characters";

      if (field.password !== field.confirmPassword)
        newErrors.confirmPassword = "Passwords do not match";
    }

    if (step === 2) {
      if (!field.firstName) newErrors.firstName = "First name is required";
      if (!field.lastName) newErrors.lastName = "Last name is required";
      if (!field.dateOfBirth)
        newErrors.dateOfBirth = "Date of birth is required";
    }

    if (step === 3) {
      if (!field.terms) newErrors.terms = "You must accept the terms";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (e) => {
    if (validateStep(currentStep)) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep((prev) => prev + 1);
      } else {
        handleSubmit(e);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const progressPercentage = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div
      className={`min-h-screen pw-app-canvas flex items-center justify-center pt-20 pb-10 px-4 ${isLoading ? "h-screen overflow-hidden" : appContext.spinner ? "h-screen overflow-hidden" : ""}`}
    >
      <Navbar />
      <div className="w-full max-w-md space-y-5">
        {/* Progress Bar */}
        <div>
          <div className="w-full h-1.5 bg-muted rounded-pill overflow-hidden border border-border">
            <div
              className="h-full bg-brand-500 transition-all duration-500 ease-out rounded-pill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Header with Step Indicators */}
        <div className="text-center space-y-3">
          <div>
            <h1 className="pw-page-title text-foreground">Create Account</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Join thousands earning with PayWaka
            </p>
          </div>

          {/* Step Indicators */}
          <div className="flex gap-2 justify-center">
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
              const stepNum = index + 1;
              const isActive = stepNum === currentStep;
              const isCompleted = stepNum < currentStep;

              return (
                <div
                  key={stepNum}
                  className={`w-8 h-8 rounded-panel flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? "bg-brand-500 text-brand-foreground shadow-sm"
                      : isActive
                        ? "bg-brand-tint text-brand-400 border border-brand-400"
                        : "pw-panel text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Card */}
        <div className="pw-glass-hero p-5 sm:p-6 space-y-5">
          {/* Social Login Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() =>
                handleOAuthSignup(new GoogleAuthProvider(), "Google")
              }
              disabled={oauthLoading !== null}
              className="w-full inline-flex items-center justify-center gap-2.5 h-10 px-4 rounded-xl border border-border bg-card/80 hover:bg-muted/60 text-foreground text-sm font-medium transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignup("Facebook")}
              disabled={oauthLoading !== null}
              className="w-full inline-flex items-center justify-center gap-2.5 h-10 px-4 rounded-xl border border-border bg-card/80 hover:bg-muted/60 text-foreground text-sm font-medium transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Continue with Facebook
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignup("X")}
              disabled={oauthLoading !== null}
              className="w-full inline-flex items-center justify-center gap-2.5 h-10 px-4 rounded-xl border border-border bg-card/80 hover:bg-muted/60 text-foreground text-sm font-medium transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.694l-5.245-6.856-6.009 6.856h-3.315l7.717-8.806-8.162-10.694h6.882l4.743 6.276 5.466-6.276zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Continue with X
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 rounded-pill bg-card text-muted-foreground pw-label">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Account Information */}
            {currentStep === 1 && (
              <div className="space-y-3.5">
                <h2 className="pw-section-title">Account Information</h2>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-email" className="pw-label block">
                    Email Address
                  </Label>
                  <Input
                    id="reg-email"
                    type="email"
                    name="email"
                    value={field.email}
                    onChange={handleInputChange}
                    placeholder="you@example.com"
                  />
                  {errors.email && (
                    <p className="text-destructive text-xs mt-1">{errors.email}</p>
                  )}
                </div>
                {/* Username */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-username" className="pw-label block">
                    Username
                  </Label>
                  <Input
                    id="reg-username"
                    type="text"
                    name="userName"
                    value={field.userName}
                    onChange={handleInputChange}
                    placeholder="RocketRider"
                  />
                  {errors.username && (
                    <p className="text-destructive text-xs mt-1">
                      {errors.username}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-password" className="pw-label block">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={field.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      className="pr-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-destructive text-xs mt-1">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-confirm-password" className="pw-label block">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="reg-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={field.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      className="pr-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-destructive text-xs mt-1">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Personal Information */}
            {currentStep === 2 && (
              <div className="space-y-3.5">
                <h2 className="pw-section-title">Personal Information</h2>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-firstName" className="pw-label block">
                      First Name
                    </Label>
                    <Input
                      id="reg-firstName"
                      type="text"
                      name="firstName"
                      value={field.firstName}
                      onChange={handleInputChange}
                      placeholder="John"
                    />
                    {errors.firstName && (
                      <p className="text-destructive text-xs mt-1">
                        {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-lastName" className="pw-label block">
                      Last Name
                    </Label>
                    <Input
                      id="reg-lastName"
                      type="text"
                      name="lastName"
                      value={field.lastName}
                      onChange={handleInputChange}
                      placeholder="Doe"
                    />
                    {errors.lastName && (
                      <p className="text-destructive text-xs mt-1">
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* TelPhone */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-phone" className="pw-label block">
                    Phone Number
                  </Label>
                  <Input
                    id="reg-phone"
                    type="tel"
                    onScroll={(e) => e.target.blur()}
                    name="phone"
                    value={field.phone}
                    onChange={handleInputChange}
                    placeholder="0801 234 5678"
                    className="pw-code"
                  />
                  {errors.phone && (
                    <p className="text-destructive text-xs mt-1">{errors.phone}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-dob" className="pw-label block">
                    Date of Birth
                  </Label>
                  <Input
                    id="reg-dob"
                    type="date"
                    name="dateOfBirth"
                    value={field.dateOfBirth}
                    onChange={handleInputChange}
                  />
                  {errors.dateOfBirth && (
                    <p className="text-destructive text-xs mt-1">
                      {errors.dateOfBirth}
                    </p>
                  )}
                </div>

                {/* Gender */}
                <div onClick={() => setGenderClicked((prev) => !prev)} className="space-y-1.5">
                  <Label htmlFor="reg-gender" className="pw-label block">
                    Gender
                  </Label>
                  <div className="relative">
                    <select
                      id="reg-gender"
                      name="gender"
                      value={field.gender}
                      onChange={handleInputChange}
                      className="pw-input pr-10 appearance-none"
                    >
                      <option value="" disabled>
                        Select gender
                      </option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-100 ease-linear ${genderClicked ? "rotate-180" : ""}`}
                    />
                  </div>
                  {errors.gender && (
                    <p className="text-destructive text-xs mt-1">{errors.gender}</p>
                  )}
                </div>

                {/* Location */}
              </div>
            )}

            {/* Step 3: Preferences & Terms */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h2 className="pw-section-title">Preferences</h2>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-accountType" className="pw-label block">
                    Account Type
                  </Label>
                  <select
                    id="reg-accountType"
                    name="accountType"
                    value={field.accountType}
                    onChange={handleInputChange}
                    className="pw-input"
                  >
                    <option value="personal">Personal</option>
                    <option value="business">Business</option>
                    <option value="investor">Investor</option>
                  </select>
                </div>

                <div className="pw-panel p-3.5 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="notifications"
                      checked={field.notifications}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-border accent-brand-500 cursor-pointer shrink-0"
                    />
                    <span className="text-xs sm:text-sm text-foreground">
                      Send me updates and promotional offers
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="terms"
                      checked={field.terms}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-border accent-brand-500 cursor-pointer mt-0.5 shrink-0"
                    />
                    <span className="text-xs sm:text-sm text-foreground">
                      I agree to the Terms of Service and Privacy Policy
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="text-destructive text-xs">{errors.terms}</p>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-2.5 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 1}
                className="h-11 px-4"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>

              <Button
                type="button"
                onClick={(e) => handleNext(e)}
                className="flex-1 h-11"
              >
                <span>{currentStep === TOTAL_STEPS ? "Complete" : "Next"}</span>
                {currentStep < TOTAL_STEPS && (
                  <ChevronRight className="w-4 h-4" />
                )}
                {currentStep === TOTAL_STEPS && <Check className="w-4 h-4" />}
              </Button>
            </div>
          </form>
        </div>

        {/* Sign in link */}
        {currentStep && (
          <p className="text-center text-muted-foreground text-xs sm:text-sm">
            Already have an account?{" "}
            <Link
              to="/auth/login"
              className="text-brand-600 dark:text-brand-400 hover:underline font-semibold"
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
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
