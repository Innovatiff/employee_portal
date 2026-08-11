/* El Águila — trabajador de servicio del portal.
   Tiene que estar en la raíz y llamarse exactamente así: el SDK de
   Firebase lo busca por ese nombre. Corre aparte de la página, así que
   sigue vivo con la app cerrada; por eso repite la configuración. */

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDtOfZXPEP-k_gvvu3Lvt307mOLBWezMrw",
  authDomain: "domcub.firebaseapp.com",
  projectId: "domcub",
  storageBucket: "domcub.firebasestorage.app",
  messagingSenderId: "329163319008",
  appId: "1:329163319008:web:1c7d3e71252ec4f5641285"
});

firebase.messaging();

self.addEventListener('notificationclick', event => {
  event.notification.close();
  // Si la app ya está abierta se reutiliza esa ventana en vez de abrir otra.
  event.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true })
    .then(lista => {
      for (const c of lista) if ('focus' in c) return c.focus();
      return clients.openWindow('./');
    }));
});
