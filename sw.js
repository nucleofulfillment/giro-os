/* LiveFood · apoio do app instalável (entregador).
   Não guarda nada em cache: tudo continua vindo do site na hora, como sempre.
   Existe só para o celular permitir instalar o app e abrir os links do WhatsApp nele. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () {});
