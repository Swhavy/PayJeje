import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { messaging, db } from "@/firebaseConfig";
import { toast } from "sonner";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const useFCM = (uid) => {
  useEffect(() => {
    if (!uid || !messaging) return;

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
