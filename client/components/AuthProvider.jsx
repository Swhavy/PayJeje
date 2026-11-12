import { onAuthStateChanged } from "firebase/auth";
import { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "@/firebaseConfig";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useDispatch } from "react-redux";
import { addUserCred } from "@/Features/userSlice";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    let unSubDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Attach real-time listener to user's Firestore document
        const userDocRef = doc(db, "users", firebaseUser.uid);
        if (unSubDoc) unSubDoc();

        unSubDoc = onSnapshot(
          userDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              // Convert Firestore Timestamps to ISO strings so Redux state remains serializable
              const serializedData = Object.fromEntries(
                Object.entries(data).map(([key, val]) => [
                  key,
                  val && typeof val.toDate === "function" ? val.toDate().toISOString() : val,
                ])
              );
              dispatch(
                addUserCred({
                  ...serializedData,
                  uid: firebaseUser.uid,
                  userEmail: firebaseUser.email || data.email,
                  accountNumber:
                    data.accountNumber ||
                    data.account_number ||
                    data.static_account ||
                    null,
                  bankName: data.bankName || data.bank_name || null,
                  bankCode: data.bankCode || data.bank_code || null,
                  accountReference:
                    data.accountReference ||
                    data.account_reference ||
                    data.flw_ref ||
                    null,
                  walletBalance:
                    data.walletBalance !== undefined
                      ? Number(data.walletBalance)
                      : null,
                  hasTransactionPin: !!data.hasTransactionPin,
                  lastLogin: data?.lastLogin?.toDate?.()?.toISOString() ?? null,
                  lastBalanceCheck:
                    data?.lastBalanceCheck?.toDate?.()?.toISOString() ?? null,
                })
              );
            } else {
              // User is authenticated in Auth, but profile does not exist in Firestore.
              // Auto-recover orphaned profile if not currently on a registration route.
              const isRegisterRoute =
                typeof window !== "undefined" &&
                (window.location.pathname.includes("/auth/register") ||
                  window.location.pathname.includes("/auth/signUp"));
              if (!isRegisterRoute) {
                const recovered = {
                  userName:
                    firebaseUser.displayName ||
                    firebaseUser.email?.split("@")[0] ||
                    "User",
                  userEmail: firebaseUser.email || "",
                  userPhoto: firebaseUser.photoURL || null,
                  firstName: firebaseUser.displayName
                    ? firebaseUser.displayName.split(" ")[0]
                    : "",
                  lastName:
                    firebaseUser.displayName &&
                    firebaseUser.displayName.split(" ").length > 1
                      ? firebaseUser.displayName.split(" ").slice(1).join(" ")
                      : "",
                  userPhone: firebaseUser.phoneNumber || "",
                  userGender: "",
                  refferalsCount: 0,
                  streak: 0,
                  points: 0,
                };
                setDoc(userDocRef, recovered).catch((err) => {
                  console.error(
                    "[AUTH RECOVERY] AuthProvider recovery setDoc failed:",
                    err
                  );
                });
                const achRef = doc(
                  db,
                  "users",
                  firebaseUser.uid,
                  "achievements",
                  "stats"
                );
                setDoc(achRef, {
                  firstSurvey: 0,
                  pointsEarned: 0,
                  billPayer: 0,
                  referralMaster: 0,
                }).catch(() => {});
              }
            }
          },
          (error) => {
            console.error("Real-time user snapshot listener error:", error);
          }
        );
      } else {
        setUser(null);
        if (unSubDoc) {
          unSubDoc();
          unSubDoc = null;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unSubDoc) unSubDoc();
    };
  }, [dispatch]);

  const value = {
    user,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
