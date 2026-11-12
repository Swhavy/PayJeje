importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyDuDMsYYMHUA53FyEJEy8I2g5W8NOxIklg",
  authDomain: "vtu-site-43118.firebaseapp.com",
  projectId: "vtu-site-43118",
  storageBucket: "vtu-site-43118.firebasestorage.app",
  messagingSenderId: "738645297173",
  appId: "1:738645297173:web:e1550797512645e9da261c",
});

const messaging = firebase.messaging();

// Handles background notifications
messaging.onBackgroundMessage((payload) => {
  const notification = payload?.notification || {};
  const title = notification.title || "PayWaka Notification";
  const body = notification.body || "";

  self.registration.showNotification(title, {
    body,
    icon: "/logo.png",
    badge: "/plogo.svg",
    data: payload?.data || {},
  });
});
