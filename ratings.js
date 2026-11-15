(() => {
  // Create a Supabase project, run supabase/reviews.sql, and paste the project's
  // Project URL and anon/public key below. Never put a service_role key here.
  const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
  const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
  const TABLE_URL = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/product_reviews`;
  const PAGE_SIZE = 500;
  const latestReviewsPerProduct = 3;
  const grid = document.querySelector("#product-grid");
  if (!grid) return;

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
  const configured = !SUPABASE_URL.includes("YOUR_PROJECT_ID") && !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY");
  const productReviews = new Map();
  let loadError = "";

  async function supabaseRequest(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        ...(options.body ? { "Content-Type": "application/json", Prefer: "return=minimal" } : {}),
        ...options.headers,
      },
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Reviews service returned ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
    }
    return response;
  }

  async function fetchAllReviews() {
    const all = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const url = new URL(TABLE_URL);
      url.searchParams.set("select", "product_id,rating,review_text,display_name,created_at");
      url.searchParams.set("order", "created_at.desc");
      const response = await supabaseRequest(url, { headers: { Range: `${offset}-${offset + PAGE_SIZE - 1}` } });
      const page = await response.json();
      if (!Array.isArray(page)) throw new Error("Unexpected reviews response from Supabase.");
      all.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return all;
  }

  function buildWidget(card) {
    const productId = card.querySelector("[data-add]")?.dataset.add;
    if (!productId) return;
    const info = card.querySelector(".product-info");
    if (!info || info.querySelector(".reviews-widget")) return;

    const widget = document.createElement("section");
    widget.className = "reviews-widget";
    widget.dataset.productId = productId;
    widget.setAttribute("aria-label", "Product ratings and reviews");
    widget.innerHTML = `
      <div class="reviews-summary" aria-live="polite"></div>
      <div class="reviews-list"></div>
      <details class="review-details">
        <summary>Write a review</summary>
        <form class="review-form">
          <label class="review-label">Your rating
            <span class="review-rating-picker" role="radiogroup" aria-label="Choose a rating from 1 to 5 stars">
              ${[1, 2, 3, 4, 5].map((n) => `<button class="review-star" type="button" data-star="${n}" role="radio" aria-checked="false" aria-label="${n} out of 5 stars">★</button>`).join("")}
            </span>
          </label>
          <input type="hidden" name="rating" value="" />
          <label class="review-label">Name <span class="review-optional">(optional)</span>
            <input class="review-input" name="display_name" type="text" maxlength="60" autocomplete="name" placeholder="Campus shopper" />
          </label>
          <label class="review-label">Your review
            <textarea class="review-input review-textarea" name="review_text" minlength="10" maxlength="500" required placeholder="What did you think of this product? (10–500 characters)"></textarea>
          </label>
          <button class="button button-dark review-submit" type="submit">Submit review</button>
          <p class="review-status" aria-live="polite"></p>
        </form>
      </details>`;
    info.append(widget);
    renderWidget(widget);
  }

  function renderWidget(widget) {
    const productId = widget.dataset.productId;
    const reviews = productReviews.get(productId) || [];
    const average = reviews.length ? reviews.reduce((sum, item) => sum + Number(item.rating), 0) / reviews.length : 0;
    const summary = widget.querySelector(".reviews-summary");
    const list = widget.querySelector(".reviews-list");
    if (!configured) {
      summary.innerHTML = '<span class="reviews-notice">Shared ratings are not configured yet.</span>';
      list.replaceChildren();
      return;
    }
    if (loadError) {
      summary.innerHTML = `<span class="reviews-notice">Reviews could not be loaded. ${escapeHtml(loadError)}</span>`;
    } else if (reviews.length) {
      summary.innerHTML = `<span class="reviews-average" aria-label="Average ${average.toFixed(1)} out of 5">★ ${average.toFixed(1)}</span><span class="reviews-count">${reviews.length} ${reviews.length === 1 ? "review" : "reviews"}</span>`;
    } else {
      summary.innerHTML = '<span class="reviews-notice">No reviews yet — be the first.</span>';
    }
    list.innerHTML = reviews.slice(0, latestReviewsPerProduct).map((review) => {
      const date = review.created_at ? new Date(review.created_at).toLocaleDateString() : "";
      return `<article class="review-item"><div class="review-item-heading"><strong>${escapeHtml(review.display_name || "Campus shopper")}</strong><span class="review-item-stars" aria-label="${Number(review.rating)} out of 5 stars">${"★".repeat(Number(review.rating))}${"☆".repeat(5 - Number(review.rating))}</span></div><p>${escapeHtml(review.review_text)}</p><time>${escapeHtml(date)}</time></article>`;
    }).join("");
  }

  function renderAll() {
    grid.querySelectorAll(".product-card").forEach(buildWidget);
    grid.querySelectorAll(".reviews-widget").forEach(renderWidget);
  }

  grid.addEventListener("click", (event) => {
    const star = event.target.closest("[data-star]");
    if (!star) return;
    const widget = star.closest(".reviews-widget");
    const value = Number(star.dataset.star);
    widget.querySelector('[name="rating"]').value = String(value);
    widget.querySelectorAll("[data-star]").forEach((button) => {
      const selected = Number(button.dataset.star) <= value;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-checked", String(Number(button.dataset.star) === value));
    });
  });

  grid.addEventListener("submit", async (event) => {
    const form = event.target.closest(".review-form");
    if (!form) return;
    event.preventDefault();
    const widget = form.closest(".reviews-widget");
    const status = form.querySelector(".review-status");
    if (!configured) {
      status.textContent = "The review service has not been configured yet.";
      return;
    }
    const rating = Number(form.elements.rating.value);
    const reviewText = form.elements.review_text.value.trim();
    const displayName = form.elements.display_name.value.trim() || "Campus shopper";
    if (!rating || rating < 1 || rating > 5) {
      status.textContent = "Please choose a star rating.";
      return;
    }
    if (reviewText.length < 10 || reviewText.length > 500) {
      status.textContent = "Your review must be between 10 and 500 characters.";
      return;
    }

    const submit = form.querySelector(".review-submit");
    submit.disabled = true;
    status.textContent = "Submitting your review…";
    try {
      const response = await supabaseRequest(TABLE_URL, {
        method: "POST",
        body: JSON.stringify({ product_id: widget.dataset.productId, rating, display_name: displayName, review_text: reviewText }),
      });
      if (response.status !== 201 && response.status !== 204) throw new Error("Review was not accepted.");
      status.textContent = "Thanks! Your review has been shared.";
      form.reset();
      form.querySelectorAll("[data-star]").forEach((button) => {
        button.classList.remove("is-selected");
        button.setAttribute("aria-checked", "false");
      });
      const submitted = { product_id: widget.dataset.productId, rating, display_name: displayName, review_text: reviewText, created_at: new Date().toISOString() };
      productReviews.set(widget.dataset.productId, [submitted, ...(productReviews.get(widget.dataset.productId) || [])]);
      renderAll();
    } catch (error) {
      status.textContent = `Could not submit review: ${error.message}`;
    } finally {
      submit.disabled = false;
    }
  });

  renderAll();
  new MutationObserver(renderAll).observe(grid, { childList: true });

  if (configured) {
    fetchAllReviews().then((rows) => {
      productReviews.clear();
      rows.forEach((review) => {
        if (!productReviews.has(review.product_id)) productReviews.set(review.product_id, []);
        productReviews.get(review.product_id).push(review);
      });
      loadError = "";
      renderAll();
    }).catch((error) => {
      loadError = error.message;
      renderAll();
    });
  }
})();
