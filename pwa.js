let installPrompt = null;
const installButtons = [document.querySelector("#install-app"), document.querySelector("#install-app-mobile")].filter(Boolean);

function showInstallButtons(visible) {
  installButtons.forEach((button) => { button.hidden = !visible; });
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  showInstallButtons(true);
});

installButtons.forEach((button) => button.addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  showInstallButtons(false);
}));

window.addEventListener("appinstalled", () => {
  installPrompt = null;
  showInstallButtons(false);
});

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => console.error("DropTech offline support could not be enabled:", error));
  });
}
