const products = [
  { id: "jelly-silicone-case", name: "Jelly Silicone Case", price: 55, category: "Phone cases", emoji: "📱", color: "lilac", caption: "Soft, colorful protection for your phone", image: "WhatsApp Image 2026-11-13 at 04.51.30.jpeg" },
  { id: "iphone-14-silicone-case", name: "iPhone 14 Silicone Case", price: 50, category: "Phone cases", emoji: "📱", color: "lilac", caption: "Soft-touch silicone case made for the iPhone 14", image: "silicone.jpeg" },
  { id: "pearl-jelly-case", name: "Charmed Phone Pouch", price: 60, category: "Phone cases", emoji: "📱", color: "pink", caption: "A phone pouch with a decorative charm design", image: "WhatsApp Image 2026-11-13 at 05.04.55.jpeg" },
  { id: "pastel-silicone-case", name: "Pastel Silicone Case", price: 58, category: "Phone cases", emoji: "📱", color: "mint", caption: "A soft-touch case in a pastel style", image: "WhatsApp Image 2026-11-13 at 05.04.56.jpeg" },
  { id: "magsafe-case", name: "MagSafe-Compatible Case", price: 80, category: "MagSafe accessories", emoji: "🧲", color: "lilac", caption: "Case with a built-in magnetic ring", image: "WhatsApp Image 2026-11-13 at 04.59.24.jpeg" },
  { id: "diamond-lens-protector", name: "Decorative Camera Lens Protector", price: 45, category: "Screen & camera protection", emoji: "📷", color: "pink", caption: "Decorative covers for your phone camera lenses", image: "WhatsApp Image 2026-11-13 at 04.51.29.jpeg" },
  { id: "tempered-glass", name: "Tempered Glass Screen Protector", price: 35, category: "Screen & camera protection", emoji: "🛡️", color: "mint", caption: "Tempered glass protection for your phone screen", image: "WhatsApp Image 2026-11-11 at 20.43.14.jpeg" },
  { id: "pearl-phone-charm", name: "Beaded Phone Charm", price: 25, category: "Phone charms", emoji: "✨", color: "coral", caption: "A colorful beaded accessory for your phone", image: "WhatsApp Image 2026-11-13 at 04.51.33.jpeg" },
  { id: "usb-c-otg", name: "USB-C OTG Adapter", price: 18, category: "Adapters & cables", emoji: "🔌", color: "blue", caption: "Connect compatible USB accessories to your device", image: "WhatsApp Image 2026-11-13 at 04.51.32.jpeg" },
  { id: "type-c-cable", name: "Type-C Charging Cable", price: 40, category: "Adapters & cables", emoji: "🔌", color: "blue", caption: "Charging cable for compatible USB-C devices" },
  { id: "verbatim-flash-drive-16gb", name: "Verbatim 16GB Flash Drive", price: 150, category: "Storage", emoji: "💾", color: "blue", caption: "USB 2.0 flash drive for files, notes and photos", image: "flash_drive.jpeg" },
  { id: "airpods-pro", name: "AirPods Pro (2nd Generation)", price: 230, category: "Audio", emoji: "🎧", color: "pink", caption: "Wireless earbuds" },
  { id: "iphone-charger", name: "iPhone Charger Set", price: 140, category: "Chargers", emoji: "🔋", color: "yellow", caption: "Complete charger set for compatible iPhone models" },
  { id: "samsung-charger", name: "Samsung Charger Set", price: 140, category: "Chargers", emoji: "🔋", color: "mint", caption: "Complete charger set for compatible Samsung devices" },
];

const whatsappNumber = "263775918741";
const grid = document.querySelector("#product-grid");
const categoryList = document.querySelector("#category-list");
const searchInput = document.querySelector("#product-search");
const emptyState = document.querySelector("#empty-state");
const cart = new Map();
let selectedCategory = "All items";

function formatPrice(amount) {
  return `K ${amount.toLocaleString("en")}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function renderCategories() {
  const categories = ["All items", ...new Set(products.map((product) => product.category))];
  categoryList.innerHTML = categories.map((category) => `
    <button class="category-button${category === selectedCategory ? " active" : ""}" type="button" data-category="${escapeHtml(category)}" aria-pressed="${category === selectedCategory}">
      ${escapeHtml(category)}
    </button>
  `).join("");
}

function renderProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const visibleProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "All items" || product.category === selectedCategory;
    const matchesSearch = `${product.name} ${product.category} ${product.caption}`.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  grid.innerHTML = visibleProducts.map((product) => `
    <article class="product-card">
      <div class="product-visual ${product.color}">
        ${product.image
          ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;z-index:1;" />`
          : `<span class="product-emoji" aria-hidden="true">${product.emoji}</span>`}
        <button class="add-button" type="button" data-add="${product.id}" aria-label="Add ${escapeHtml(product.name)} to bag">+</button>
      </div>
      <div class="product-info">
        <p class="product-category">${escapeHtml(product.category)}</p>
        <div class="product-title-row">
          <h3 class="product-title">${escapeHtml(product.name)}</h3>
          <span class="product-price">${formatPrice(product.price)}</span>
        </div>
        <p class="product-caption">${escapeHtml(product.caption)}</p>
      </div>
    </article>
  `).join("");

  emptyState.hidden = visibleProducts.length > 0;
}

function updateCart() {
  const items = [...cart.values()];
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  document.querySelectorAll(".cart-count").forEach((element) => { element.textContent = totalItems; });
  document.querySelector("#drawer-item-count").textContent = `(${totalItems})`;
  document.querySelector("#cart-subtotal").textContent = formatPrice(subtotal);
  document.querySelector("#checkout-subtotal").textContent = formatPrice(subtotal);
  document.querySelector("#cart-footer").classList.toggle("is-hidden", totalItems === 0);
  document.querySelector("#cart-empty").classList.toggle("show", totalItems === 0);
  document.querySelector("#cart-items").innerHTML = items.map((item) => `
    <article class="cart-line">
      <div class="cart-thumb ${item.color}" aria-hidden="true">${item.emoji}</div>
      <div>
        <h3 class="cart-line-title">${escapeHtml(item.name)}</h3>
        <p class="cart-line-price">${formatPrice(item.price)} each</p>
        <div class="quantity-control" aria-label="Quantity for ${escapeHtml(item.name)}">
          <button type="button" data-quantity="${item.id}" data-change="-1" aria-label="Remove one ${escapeHtml(item.name)}">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-quantity="${item.id}" data-change="1" aria-label="Add one ${escapeHtml(item.name)}">+</button>
        </div>
      </div>
      <span class="cart-line-total">${formatPrice(item.price * item.quantity)}</span>
    </article>
  `).join("");
}

function openCart() {
  document.querySelector("#overlay").hidden = false;
  requestAnimationFrame(() => document.querySelector("#overlay").classList.add("visible"));
  document.querySelector("#cart-drawer").classList.add("open");
  document.querySelector("#cart-drawer").setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closeCart() {
  document.querySelector("#overlay").classList.remove("visible");
  document.querySelector("#cart-drawer").classList.remove("open");
  document.querySelector("#cart-drawer").setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
  window.setTimeout(() => { document.querySelector("#overlay").hidden = true; }, 250);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

categoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  selectedCategory = button.dataset.category;
  renderCategories();
  renderProducts();
});

searchInput.addEventListener("input", renderProducts);
grid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  const product = products.find((item) => item.id === button.dataset.add);
  if (!product) return;
  const current = cart.get(product.id);
  cart.set(product.id, { ...product, quantity: current ? current.quantity + 1 : 1 });
  updateCart();
  showToast(`${product.name} added to your bag`);
});

document.querySelector("#cart-items").addEventListener("click", (event) => {
  const button = event.target.closest("[data-quantity]");
  if (!button) return;
  const id = button.dataset.quantity;
  const item = cart.get(id);
  if (!item) return;
  const quantity = item.quantity + Number(button.dataset.change);
  if (quantity <= 0) cart.delete(id);
  else cart.set(id, { ...item, quantity });
  updateCart();
});

document.querySelector("#cart-open").addEventListener("click", openCart);
document.querySelector("#mobile-cart-open").addEventListener("click", openCart);
document.querySelector("#cart-close").addEventListener("click", closeCart);
document.querySelector("#overlay").addEventListener("click", closeCart);
document.querySelector("#keep-shopping").addEventListener("click", closeCart);
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeCart(); });

document.querySelector("#checkout-open").addEventListener("click", () => {
  closeCart();
  document.querySelector("#checkout-modal").hidden = false;
});
document.querySelector("#checkout-close").addEventListener("click", () => {
  document.querySelector("#checkout-modal").hidden = true;
});
document.querySelector("#checkout-modal").addEventListener("click", (event) => {
  if (event.target.id === "checkout-modal") event.currentTarget.hidden = true;
});
document.querySelector("#checkout-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const lines = [...cart.values()].map((item) => `- ${item.name} x${item.quantity}: ${formatPrice(item.price * item.quantity)}`);
  const subtotal = [...cart.values()].reduce((sum, item) => sum + item.price * item.quantity, 0);
  const message = [
    "Hello! I'd like to place a DropTech order:",
    ...lines,
    `Total: ${formatPrice(subtotal)}`,
    `Name: ${form.get("name")}`,
    `Campus meeting place: ${form.get("pickup")}`,
    form.get("note") ? `Note: ${form.get("note")}` : "",
  ].filter(Boolean).join("\n");
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  document.querySelector("#checkout-modal").hidden = true;
});

document.querySelector("#current-year").textContent = new Date().getFullYear();
renderCategories();
renderProducts();
updateCart();
