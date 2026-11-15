const CACHE_NAME = "droptech-cache-v9";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./workflows/styles.css", "./app.js", "./pwa.js", "./ratings.js", "./manifest.webmanifest", "./icon.svg"];

async function addRatingsScript(response) {
  if (!response || !response.ok) return response;
  const html = await response.text();
  if (html.includes("./ratings.js")) return new Response(html, response);

  const updatedHtml = html.replace("</body>", '  <script src="./ratings.js" defer></script>\n</body>');
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  return new Response(updatedHtml, { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("droptech-cache-") && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(async (response) => {
      const page = await addRatingsScript(response);
      if (page?.ok) caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", page.clone()));
      return page;
    }).catch(async () => {
      const cached = await caches.match("./index.html");
      return cached ? addRatingsScript(cached) : Response.error();
    }));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  })));
});
