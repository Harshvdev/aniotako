self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/icon-192x192.png", // Ensure you have an icon in your public folder
      data: { url: data.url },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Open the URL passed in the notification payload
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || "/");
      }
    })
  );
});