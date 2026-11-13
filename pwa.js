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

function setupPaymentOptions() {
  const form = document.querySelector("#checkout-form");
  if (!form) return;

  const totalRow = form.querySelector(".order-summary");
  if (!totalRow) return;

  const paymentSection = document.createElement("div");
  paymentSection.innerHTML = `
    <label class="form-label" for="payment-method">Payment method</label>
    <select class="form-input" id="payment-method" name="payment" required>
      <option value="">Choose how you’ll pay</option>
      <option value="cash">Cash</option>
      <option value="mobile-money">Mobile money</option>
    </select>
    <div id="mobile-money-fee-section" hidden>
      <label class="form-label" for="mobile-money-fee">Mobile money withdrawal fee</label>
      <input class="form-input" id="mobile-money-fee" name="withdrawalFee" type="number" min="0" step="1" inputmode="numeric" placeholder="Enter fee amount" />
      <p class="form-footnote">Enter the withdrawal fee quoted by your mobile money provider. It will be added to your order total.</p>
    </div>
    <div class="subtotal-row" style="margin-top:16px"><span>Items subtotal</span><strong id="payment-items-subtotal"></strong></div>
    <div class="subtotal-row" id="withdrawal-fee-row" hidden><span>Withdrawal fee</span><strong id="withdrawal-fee-amount"></strong></div>
  `;
  totalRow.before(paymentSection);
  totalRow.querySelector("span").textContent = "Order total";

  const methodSelect = form.querySelector("#payment-method");
  const feeSection = form.querySelector("#mobile-money-fee-section");
  const feeInput = form.querySelector("#mobile-money-fee");
  const feeRow = form.querySelector("#withdrawal-fee-row");
  const itemsSubtotal = form.querySelector("#payment-items-subtotal");
  const feeAmount = form.querySelector("#withdrawal-fee-amount");
  const orderTotal = totalRow.querySelector("strong");

  const asAmount = (text) => Number(String(text).replace(/[^\d.-]/g, "")) || 0;
  const formatMoney = (amount) => `K ${amount.toLocaleString("en")}`;
  const updatePaymentSummary = () => {
    const subtotal = asAmount(document.querySelector("#cart-subtotal")?.textContent);
    const isMobileMoney = methodSelect.value === "mobile-money";
    const fee = isMobileMoney ? (Number(feeInput.value) || 0) : 0;
    feeSection.hidden = !isMobileMoney;
    feeRow.hidden = !isMobileMoney;
    feeInput.required = isMobileMoney;
    itemsSubtotal.textContent = formatMoney(subtotal);
    feeAmount.textContent = formatMoney(fee);
    orderTotal.textContent = formatMoney(subtotal + fee);
  };

  methodSelect.addEventListener("change", updatePaymentSummary);
  feeInput.addEventListener("input", updatePaymentSummary);
  document.querySelector("#checkout-open")?.addEventListener("click", updatePaymentSummary);
  updatePaymentSummary();

  // Replace the existing checkout submit handler so payment details and the fee
  // are included in the WhatsApp order instead of sending a duplicate message.
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const data = new FormData(form);
    const subtotal = asAmount(document.querySelector("#cart-subtotal")?.textContent);
    const isMobileMoney = data.get("payment") === "mobile-money";
    const fee = isMobileMoney ? Number(data.get("withdrawalFee")) || 0 : 0;
    const itemLines = [...document.querySelectorAll("#cart-items .cart-line")].map((line) => {
      const name = line.querySelector(".cart-line-title")?.textContent.trim();
      const quantity = line.querySelector(".quantity-control span")?.textContent.trim();
      const lineTotal = line.querySelector(".cart-line-total")?.textContent.trim();
      return `- ${name} x${quantity}: ${lineTotal}`;
    });
    const message = [
      "Hello! I'd like to place a DropTech order:",
      ...itemLines,
      `Items subtotal: ${formatMoney(subtotal)}`,
      `Payment method: ${isMobileMoney ? "Mobile money" : "Cash"}`,
      isMobileMoney ? `Mobile money withdrawal fee: ${formatMoney(fee)}` : "",
      `Order total: ${formatMoney(subtotal + fee)}`,
      `Name: ${data.get("name")}`,
      `Campus meeting place: ${data.get("pickup")}`,
      data.get("note") ? `Note: ${data.get("note")}` : "",
    ].filter(Boolean).join("\n");

    window.open(`https://wa.me/263775918741?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    document.querySelector("#checkout-modal").hidden = true;
  }, true);
}

setupPaymentOptions();

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => console.error("DropTech offline support could not be enabled:", error));
  });
}
