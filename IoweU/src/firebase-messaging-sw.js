importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAzZzkLQun-s4BPMmbl0qkcHoG3I3WeWK8',
  authDomain: 'ioweu-a74cd.firebaseapp.com',
  projectId: 'ioweu-a74cd',
  storageBucket: 'ioweu-a74cd.firebasestorage.app',
  messagingSenderId: '380190786410',
  appId: '1:380190786410:web:ebbab06b1bf5214da6db13',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/assets/logo/IoweU-Logo.svg'  // Pfad zum Icon anpassen
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
