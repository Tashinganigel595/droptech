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
  const totalRow = form?.querySelector(".order-summary");
  if (!form || !totalRow) return;

  const paymentSection = document.createElement("section");
  paymentSection.className = "payment-section";
  paymentSection.setAttribute("aria-label", "Payment details");
  paymentSection.innerHTML = `
    <div class="payment-section-heading">
      <span class="payment-section-icon" aria-hidden="true">₵</span>
      <div><strong>Payment</strong><small>Choose how you’d like to pay</small></div>
    </div>
    <label class="form-label" for="payment-method">Payment method</label>
    <select class="form-input payment-select" id="payment-method" name="payment" required>
      <option value="">Choose how you’ll pay</option>
      <option value="cash">Cash</option>
      <option value="mobile-money">Mobile money</option>
    </select>
    <div id="mobile-money-details" class="mobile-money-details" hidden>
      <label class="form-label" for="mobile-network">Mobile money network</label>
      <select class="form-input payment-select" id="mobile-network" name="network">
        <option value="">Choose your network</option>
        <option value="airtel">Airtel Money</option>
        <option value="mtn">MTN MoMo</option>
        <option value="zamtel">Zamtel Kwacha</option>
        <option value="other">Other network</option>
      </select>
      <div class="provider-guide" id="provider-guide" hidden>
        <strong>Provider guide</strong>
        <p id="provider-guide-copy">Choose the network registered to the number you’ll use to pay. Confirm the withdrawal charge with your provider before payment.</p>
        <details class="airtel-tariff-guide" id="airtel-tariff-guide" hidden>
          <summary>Airtel Money Zambia fee guide (estimate)</summary>
          <ul>
            <li>ZMW 1–150: ZMW 2.50</li>
            <li>ZMW 151–300: ZMW 5</li>
            <li>ZMW 301–500: ZMW 10</li>
            <li>ZMW 501–1,000: ZMW 20</li>
            <li>ZMW 1,001–3,000: ZMW 35</li>
            <li>ZMW 3,001–5,000: ZMW 55</li>
            <li>ZMW 5,001–10,000: ZMW 60</li>
          </ul>
          <small>Based on Airtel’s tariff guide effective 7 September 2024. Confirm the latest rate with Airtel Money before paying.</small>
        </details>
      </div>
      <label class="form-label" for="mobile-money-fee">Withdrawal fee <span>(ZMW)</span></label>
      <div class="currency-input-wrap"><span aria-hidden="true">ZMW</span><input class="form-input" id="mobile-money-fee" name="withdrawalFee" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" /></div>
      <p class="form-footnote" id="airtel-fee-note" hidden>Suggested Airtel Money Zambia cash withdrawal fee based on your items subtotal. You can edit this estimate.</p>
      <p class="form-footnote" id="manual-fee-note" hidden>Enter the withdrawal fee quoted by your mobile money provider.</p>
      <p class="provider-confirmation">Fees are confirmed with the provider before payment.</p>
    </div>
    <div class="payment-breakdown">
      <div class="subtotal-row"><span>Items subtotal</span><strong id="payment-items-subtotal"></strong></div>
      <div class="subtotal-row" id="withdrawal-fee-row" hidden><span>Withdrawal fee</span><strong id="withdrawal-fee-amount"></strong></div>
    </div>
  `;
  totalRow.before(paymentSection);
  totalRow.classList.add("payment-total-row");
  totalRow.querySelector("span").textContent = "Order total (ZMW)";

  const methodSelect = form.querySelector("#payment-method");
  const mobileDetails = form.querySelector("#mobile-money-details");
  const networkSelect = form.querySelector("#mobile-network");
  const feeInput = form.querySelector("#mobile-money-fee");
  const feeRow = form.querySelector("#withdrawal-fee-row");
  const itemsSubtotal = form.querySelector("#payment-items-subtotal");
  const feeAmount = form.querySelector("#withdrawal-fee-amount");
  const orderTotal = totalRow.querySelector("strong");
  const airtelFeeNote = form.querySelector("#airtel-fee-note");
  const manualFeeNote = form.querySelector("#manual-fee-note");
  const providerGuide = form.querySelector("#provider-guide");
  const airtelTariffGuide = form.querySelector("#airtel-tariff-guide");
  const guideCopy = form.querySelector("#provider-guide-copy");
  let lastSuggestedFee = null;
  let lastSuggestedSubtotal = null;

  // Airtel Money Zambia withdrawal bands from the published guide effective
  // 7 September 2024. This is only an editable estimate, not a live quote.
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
  const formatMoney = (amount) => `ZMW ${amount.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const getAirtelFee = (amount) => airtelWithdrawalFees.find((band) => amount <= band.max)?.fee ?? 60;

  const updatePaymentSummary = () => {
    const subtotal = asAmount(document.querySelector("#cart-subtotal")?.textContent);
    const isMobileMoney = methodSelect.value === "mobile-money";
    const isAirtel = isMobileMoney && networkSelect.value === "airtel";
    const needsManualFee = isMobileMoney && networkSelect.value && !isAirtel;

    if (isAirtel) {
      const suggestedFee = getAirtelFee(subtotal);
      const feeWasStillSuggested = feeInput.value === "" || Number(feeInput.value) === lastSuggestedFee;
      if (lastSuggestedSubtotal === null || subtotal !== lastSuggestedSubtotal) {
        if (feeWasStillSuggested) feeInput.value = suggestedFee.toString();
        lastSuggestedFee = suggestedFee;
        lastSuggestedSubtotal = subtotal;
      }
    } else {
      lastSuggestedFee = null;
      lastSuggestedSubtotal = null;
      if (!isMobileMoney || !networkSelect.value) feeInput.value = "";
    }

    const fee = isMobileMoney ? (Number(feeInput.value) || 0) : 0;
    mobileDetails.hidden = !isMobileMoney;
    networkSelect.required = isMobileMoney;
    feeRow.hidden = !isMobileMoney || !networkSelect.value;
    feeInput.required = isMobileMoney && Boolean(networkSelect.value);
    providerGuide.hidden = !isMobileMoney || !networkSelect.value;
    airtelTariffGuide.hidden = !isAirtel;
    airtelFeeNote.hidden = !isAirtel;
    manualFeeNote.hidden = !needsManualFee;
    guideCopy.textContent = isAirtel
      ? "Airtel Money Zambia selected. The fee estimate below uses the published tariff bands; confirm the current charge with Airtel before payment."
      : needsManualFee
        ? `Enter the withdrawal fee quoted by ${networkSelect.options[networkSelect.selectedIndex].text}. Confirm it with your provider before payment.`
        : "Choose the network registered to the number you’ll use to pay. Confirm the withdrawal charge with your provider before payment.";
    itemsSubtotal.textContent = formatMoney(subtotal);
    feeAmount.textContent = formatMoney(fee);
    orderTotal.textContent = formatMoney(subtotal + fee);
  };

  methodSelect.addEventListener("change", updatePaymentSummary);
  networkSelect.addEventListener("change", updatePaymentSummary);
  feeInput.addEventListener("input", updatePaymentSummary);
  document.querySelector("#checkout-open")?.addEventListener("click", updatePaymentSummary);
  updatePaymentSummary();

  // Capture before the basic checkout handler so payment details appear once.
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const data = new FormData(form);
    const subtotal = asAmount(document.querySelector("#cart-subtotal")?.textContent);
    const isMobileMoney = data.get("payment") === "mobile-money";
    const fee = isMobileMoney ? Number(data.get("withdrawalFee")) || 0 : 0;
    const network = data.get("network");
    const networkLabels = { airtel: "Airtel Money", mtn: "MTN MoMo", zamtel: "Zamtel Kwacha", other: "Other network" };
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
      `Payment method: ${isMobileMoney ? `Mobile money — ${networkLabels[network] || network}` : "Cash"}`,
      isMobileMoney ? `Withdrawal fee: ${formatMoney(fee)}` : "",
      isMobileMoney ? "Withdrawal fee to be confirmed with provider before payment." : "",
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
