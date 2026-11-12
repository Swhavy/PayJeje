import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { messaging, db } from "@/firebaseConfig";
import { toast } from "sonner";

const VAPID_KEY =
  import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  import.meta.env.VITE_VAPID_KEY ||
  "BAsuJAZxyu4GTfsV4aJxOOijVOrYPjlF4r4hq1K3Dk6HzAmx0JUs1sZKCQ0575kLj-Uu2uiHCttTu4njFSwHMpU";

export const useFCM = (uid) => {
  useEffect(() => {
    if (!uid || !messaging || typeof window === "undefined" || !("Notification" in window)) return;

    const registerToken = async () => {
      try {
        // request permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.log("Notification permission denied");
          return;
        }

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js",
          ),
        });

        if (token) {
          // store token in Firestore under the user's doc
          await setDoc(
            doc(db, "users", uid, "fcmTokens", token),
            {
              token,
              createdAt: new Date().toISOString(),
              platform: "web",
            },
            { merge: true },
          );
        }
      } catch (error) {
        console.error("FCM token registration failed:", error);
      }
    };

    registerToken();

    // foreground message handler
    const unsubscribe = onMessage(messaging, (payload) => {
      const { title, body } = payload.notification;
      toast(body, { icon: "🔔" }); // or your own notification UI
    });

    return () => unsubscribe();
  }, [uid]);
};
