importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: import.meta.env.VITE_FireBase_APIkey,
  authDomain: import.meta.env.VITE_FireBase_Auth_Domain,
  projectId: import.meta.env.VITE_FireBase_Project_ID,
  storageBucket: import.meta.env.VITE_FireBase_Storage_Bucket,
  messagingSenderId: import.meta.env.VITE_FireBase_Messaging_Sender_ID,
  appId: import.meta.env.VITE_FireBase_App_ID,
});

const messaging = firebase.messaging();

// handles background notifications
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;

  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
  });
});
