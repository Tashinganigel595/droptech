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
      <option value="airtel-money">Airtel Money (Zambia)</option>
      <option value="other-mobile-money">Other mobile money</option>
    </select>
    <div id="mobile-money-fee-section" hidden>
      <label class="form-label" for="mobile-money-fee">Mobile money withdrawal fee (ZMW)</label>
      <input class="form-input" id="mobile-money-fee" name="withdrawalFee" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Enter fee amount" />
      <p class="form-footnote" id="airtel-fee-note" hidden>Suggested Airtel Money Zambia cash withdrawal fee based on your items subtotal. Please confirm the current fee with Airtel before payment; you can edit this amount.</p>
      <p class="form-footnote" id="other-fee-note" hidden>Enter the withdrawal fee quoted by your mobile money provider.</p>
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
  const airtelFeeNote = form.querySelector("#airtel-fee-note");
  const otherFeeNote = form.querySelector("#other-fee-note");
  let lastSuggestedSubtotal = null;

  // Airtel Money Zambia cash withdrawal tariff bands from the guide effective
  // 7 September 2024. Treat these as estimates and confirm the live tariff.
  const airtelWithdrawalFees = [
    { max: 150, fee: 2.5 },
    { max: 300, fee: 5 },
    { max: 500, fee: 10 },
    { max: 1000, fee: 20 },
    { max: 3000, fee: 35 },
    { max: 5000, fee: 55 },
    { max: 10000, fee: 60 },
  ];
  const asAmount = (text) => Number(String(text).replace(/[^\d.-]/g, "")) || 0;
  const formatMoney = (amount) => `K ${amount.toLocaleString("en", { maximumFractionDigits: 2 })}`;
  const getAirtelFee = (amount) => airtelWithdrawalFees.find((band) => amount <= band.max)?.fee ?? 60;

  const updatePaymentSummary = () => {
    const subtotal = asAmount(document.querySelector("#cart-subtotal")?.textContent);
    const isAirtel = methodSelect.value === "airtel-money";
    const isOtherMobile = methodSelect.value === "other-mobile-money";
    const isMobileMoney = isAirtel || isOtherMobile;

    if (isAirtel && (lastSuggestedSubtotal === null || subtotal !== lastSuggestedSubtotal)) {
      feeInput.value = getAirtelFee(subtotal).toString();
      lastSuggestedSubtotal = subtotal;
    }
    if (!isAirtel) lastSuggestedSubtotal = null;

    const fee = isMobileMoney ? (Number(feeInput.value) || 0) : 0;
    feeSection.hidden = !isMobileMoney;
    feeRow.hidden = !isMobileMoney;
    feeInput.required = isMobileMoney;
    airtelFeeNote.hidden = !isAirtel;
    otherFeeNote.hidden = !isOtherMobile;
    itemsSubtotal.textContent = formatMoney(subtotal);
    feeAmount.textContent = formatMoney(fee);
    orderTotal.textContent = formatMoney(subtotal + fee);
  };

  methodSelect.addEventListener("change", updatePaymentSummary);
  feeInput.addEventListener("input", updatePaymentSummary);
  document.querySelector("#checkout-open")?.addEventListener("click", updatePaymentSummary);
  updatePaymentSummary();

  // Capture the form submit before the basic checkout handler so the WhatsApp
  // message contains the selected payment method and correct fee-adjusted total.
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const data = new FormData(form);
    const subtotal = asAmount(document.querySelector("#cart-subtotal")?.textContent);
    const payment = data.get("payment");
    const isMobileMoney = payment === "airtel-money" || payment === "other-mobile-money";
    const fee = isMobileMoney ? Number(data.get("withdrawalFee")) || 0 : 0;
    const itemLines = [...document.querySelectorAll("#cart-items .cart-line")].map((line) => {
      const name = line.querySelector(".cart-line-title")?.textContent.trim();
      const quantity = line.querySelector(".quantity-control span")?.textContent.trim();
      const lineTotal = line.querySelector(".cart-line-total")?.textContent.trim();
      return `- ${name} x${quantity}: ${lineTotal}`;
    });
    const paymentLabel = payment === "airtel-money" ? "Airtel Money (Zambia)" : payment === "other-mobile-money" ? "Other mobile money" : "Cash";
    const message = [
      "Hello! I'd like to place a DropTech order:",
      ...itemLines,
      `Items subtotal: ${formatMoney(subtotal)}`,
      `Payment method: ${paymentLabel}`,
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
