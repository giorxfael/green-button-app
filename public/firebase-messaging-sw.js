// This script runs in the background
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// 1. Initialize Firebase inside the Service Worker
// REPLACE THESE with the strings from your .env.local file!
firebase.initializeApp({
  apiKey: "AIzaSyAJXkeKuAvYwAElkkwBaubAaTwqme7W5k8",
  authDomain: "notification-button-765bc.firebaseapp.com",
  projectId: "notification-button-765bc",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "Y673594113487",
  appId: "1:673594113487:web:010b36b845adc6da38a6ba"
});

const messaging = firebase.messaging();

// 2. This part catches the message and shows the notification with buttons
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'Big Green Button';
  const notificationOptions = {
    body: payload.notification.body || 'Someone needs an answer!',
    icon: '/icon.png',
    // These actions are the Yes/No buttons on the lock screen
    actions: [
      { action: 'yes', title: 'Yes ✅' },
      { action: 'no', title: 'No ❌' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 3. This handles what happens when they click "Yes" or "No"
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const answer = event.action;
  const docId = event.notification.data?.docId || event.notification.docId; // Support both ways

  if (!answer || !docId) return;

  event.waitUntil(
    fetch('/api/respond', {
      method: 'POST',
      body: JSON.stringify({ answer, docId }), // Send both back
      headers: { 'Content-Type': 'application/json' }
    })
  );
});