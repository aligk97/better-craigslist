const pages = Array.from(document.querySelectorAll("[data-page]"));
const routeLinks = Array.from(document.querySelectorAll("[data-route-link]"));

const fallbackData = {
  generatedAt: "2026-06-09",
  mode: "embedded-seed",
  source: "Embedded seed from Craigslist New York search results; data/listings.json is the primary source.",
  listings: []
};

const appState = {
  data: fallbackData,
  listings: fallbackData.listings,
  selectedDetailId: localStorage.getItem("better-cl-selected-detail-id") || "car-7939679011",
  selectedDetailCategory: localStorage.getItem("better-cl-selected-detail-category") || "cars",
  compareIds: new Set(["computer-7910839552", "computer-7939653842"])
};

/* ── Global Search State ── */

const searchResults = {
  query: "",
  category: "All categories",
  results: [],
  parsed: { keywords: [], maxPrice: null, minPrice: null, locations: [] }
};

/** Parse a search query into structured tokens */
function parseSearchQuery(query) {
  const q = query.trim();
  const tokens = { keywords: [], maxPrice: null, minPrice: null, locations: [] };
  if (!q) return tokens;

  // Extract price hints like "under $300", "under 300", "<$300", "<300", "max $500"
  const underMatch = q.match(/\bunder\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\b/i);
  if (underMatch) tokens.maxPrice = Number(underMatch[1].replace(/,/g, ""));

  const lessThanMatch = q.match(/<\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\b/);
  if (lessThanMatch && !tokens.maxPrice) tokens.maxPrice = Number(lessThanMatch[1].replace(/,/g, ""));

  const maxMatch = q.match(/\bmax\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\b/i);
  if (maxMatch && !tokens.maxPrice) tokens.maxPrice = Number(maxMatch[1].replace(/,/g, ""));

  // Extract min price like "over $500", "min $500", ">$500", "from $500"
  const overMatch = q.match(/\bover\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\b/i);
  if (overMatch) tokens.minPrice = Number(overMatch[1].replace(/,/g, ""));

  const greaterThanMatch = q.match(/>\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\b/);
  if (greaterThanMatch && !tokens.minPrice) tokens.minPrice = Number(greaterThanMatch[1].replace(/,/g, ""));

  const minMatch = q.match(/\bmin\s+\$?(\d+(?:,\d{3})*(?:\.\d+)?)\b/i);
  if (minMatch && !tokens.minPrice) tokens.minPrice = Number(minMatch[1].replace(/,/g, ""));

  // Extract price range like "$200-$500", "$200 to $500"
  const rangeMatch = q.match(/\$?(\d{2,6})\s*(?:-|–|to)\s*\$?(\d{2,6})\b/i);
  if (rangeMatch && !tokens.maxPrice && !tokens.minPrice) {
    tokens.minPrice = Number(rangeMatch[1].replace(/,/g, ""));
    tokens.maxPrice = Number(rangeMatch[2].replace(/,/g, ""));
  }

  // Extract known locations (New York neighborhoods)
  const locationPatterns = [
    "brooklyn", "manhattan", "queens", "bronx", "staten island",
    "williamsburg", "astoria", "park slope", "bushwick", "midtown",
    "upper east side", "upper west side", "chelsea", "soho", "fidi",
    "financial district", "east village", "west village", "gramercy",
    "ridgewood", "flatbush", "kensington", "coney island", "maspeth",
    "bensonhurst", "crown heights", "bed stuy", "bedford", "clinton hill",
    "prospect", "new york", "long island", "stamford"
  ];
  
  const lowerQ = q.toLowerCase();
  for (const loc of locationPatterns) {
    if (lowerQ.includes(loc)) {
      tokens.locations.push(loc);
    }
  }

  // Everything else is a keyword — remove price/location tokens first
  let keywords = q
    .replace(/\bunder\s+\$?\d+(?:,\d{3})*(?:\.\d+)?\b/gi, "")
    .replace(/<\s*\$?\d+(?:,\d{3})*(?:\.\d+)?\b/g, "")
    .replace(/\bmax\s+\$?\d+(?:,\d{3})*(?:\.\d+)?\b/gi, "")
    .replace(/\bover\s+\$?\d+(?:,\d{3})*(?:\.\d+)?\b/gi, "")
    .replace(/>\s*\$?\d+(?:,\d{3})*(?:\.\d+)?\b/g, "")
    .replace(/\bmin\s+\$?\d+(?:,\d{3})*(?:\.\d+)?\b/gi, "")
    .replace(/\$?\d{2,6}\s*(?:-|–|to)\s*\$?\d{2,6}\b/g, "")
    .replace(/\$\d+(?:,\d{3})*(?:\.\d+)?/g, "")
  ;

  tokens.keywords = keywords
    .split(/\s+/)
    .map((k) => k.replace(/[^a-zA-Z0-9.#+\-&']/g, "").trim())
    .filter((k) => k.length >= 2);

  return tokens;
}

/** Score a listing against parsed search tokens. Returns a relevance score. */
function searchScore(listing, parsed) {
  let score = 0;
  const { keywords, maxPrice, minPrice, locations } = parsed;

  // ── Price matching ──
  if (maxPrice !== null && listing.price && listing.price > 0) {
    if (listing.price <= maxPrice) score += 15;
    // Bonus for being well under the max
    if (listing.price <= maxPrice * 0.5) score += 5;
  }
  if (minPrice !== null && listing.price && listing.price > 0) {
    if (listing.price >= minPrice) score += 10;
  }

  // ── Location matching ──
  const listingText = `${listing.title} ${listing.location || ""}`.toLowerCase();
  for (const loc of locations) {
    if (listingText.includes(loc)) score += 20;
  }

  // ── Keyword matching against all listing properties ──
  const searchable = [
    listing.title,
    listing.location,
    listing.brand,
    listing.make,
    listing.model,
    listing.subcategory,
    listing.condition,
    listing.body,
    listing.transmission,
    listing.fuel,
    listing.drive,
    listing.listingType,
    listing.leaseTerm,
    ...(listing.amenities || []),
    listing.category
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const kw of keywords) {
    const lowerKw = kw.toLowerCase();
    // Direct match in title = high score
    if (listing.title?.toLowerCase().includes(lowerKw)) score += 25;
    // Match in other structured fields
    else if (listing.brand?.toLowerCase().includes(lowerKw)) score += 20;
    else if (listing.make?.toLowerCase().includes(lowerKw)) score += 20;
    else if (listing.model?.toLowerCase().includes(lowerKw)) score += 18;
    else if (listing.subcategory?.toLowerCase().includes(lowerKw)) score += 15;
    else if (listing.condition?.toLowerCase().includes(lowerKw)) score += 12;
    else if (listing.body?.toLowerCase().includes(lowerKw)) score += 12;
    else if (listing.category?.toLowerCase().includes(lowerKw)) score += 10;
    else if (listing.location?.toLowerCase().includes(lowerKw)) score += 8;
    // Partial/fuzzy match in full text
    else if (searchable.includes(lowerKw)) score += 5;
  }

  // ── Boost for category relevance ──
  // If the query strongly suggests a category
  const catHints = {
    cars: ["bmw", "audi", "mercedes", "toyota", "honda", "ford", "car", "truck", "suv", "sedan", "coupe", "vin", "mileage", "transmission", "awd", "fwd", "4wd", "v6", "v8"],
    housing: ["apartment", "rent", "lease", "bedroom", "studio", "bath", "condo", "duplex", "loft", "no fee", "landlord", "brooklyn", "manhattan", "queens"],
    computers: ["macbook", "laptop", "desktop", "monitor", "ram", "ssd", "gb", "intel", "amd", "chromebook", "apple", "dell", "hp", "lenovo", "asus"],
    electronics: ["speaker", "headphone", "tv", "audio", "amplifier", "receiver", "bose", "sonos", "yamaha", "airpods", "kindle"],
    phones: ["iphone", "samsung", "galaxy", "unlocked", "cell", "mobile", "smartphone", "moto", "pixel", "phone case"]
  };

  for (const kw of keywords) {
    const lowerKw = kw.toLowerCase();
    for (const [cat, hints] of Object.entries(catHints)) {
      if (hints.some((h) => lowerKw.includes(h) || h.includes(lowerKw))) {
        if (listing.category === cat) score += 8;
      }
    }
  }

  return score;
}

/** Perform a full-text search across all listings */
function performSearch(query, category = "All categories") {
  const parsed = parseSearchQuery(query);
  
  let listings = appState.listings;
  
  // Filter by category if not "All"
  if (category !== "All categories") {
    const catMap = {
      "Cars & trucks": "cars",
      "Apartments": "housing",
      "Computers": "computers",
      "Electronics": "electronics",
      "Phones": "phones"
    };
    const mapped = catMap[category];
    if (mapped) listings = listings.filter((l) => l.category === mapped);
  }

  // Score each listing
  const scored = listings
    .map((listing) => ({
      listing,
      score: searchScore(listing, parsed)
    }))
    .filter((item) => item.score > 0);

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  searchResults.query = query;
  searchResults.category = category;
  searchResults.parsed = parsed;
  searchResults.results = scored;

  return scored;
}

const categoryLabelMap = {
  housing: "Housing / apartments",
  computers: "Electronics / computers",
  electronics: "Electronics / audio & video",
  phones: "Phones / mobile devices",
  cars: "Cars & trucks"
};

function categoryArt(listing) {
  const arts = {
    cars: "art-car",
    housing: "art-apartment",
    computers: "art-laptop",
    electronics: "art-wheel",
    phones: "art-smartphone"
  };
  return arts[listing.category] || "art-car";
}

function searchResultCard(scoredItem) {
  const { listing, score } = scoredItem;
  return `
    <article class="listing-card horizontal" data-detail-id="${escapeHtml(listing.id)}" data-detail-category="${escapeHtml(listing.category)}">
      <div class="visual-art ${photoClass(listing, categoryArt(listing))}"${photoStyle(listing)}></div>
      <div class="listing-body">
        <div class="listing-topline">
          <span class="badge badge-green">${escapeHtml(categoryLabelMap[listing.category] || listing.category)}</span>
          <span class="badge">${escapeHtml(listing.location || "New York")}</span>
        </div>
        <h3>${escapeHtml(listing.title)}</h3>
        <p>${escapeHtml(listingSubtitle(listing))}</p>
        <div class="badge-row">
          ${listingBadges(listing)}
        </div>
        <div class="listing-bottom">
          <span class="price">${formatPrice(listing.price, listing.category === "housing" ? "/mo" : "")}</span>
        </div>
      </div>
    </article>
  `;
}

function listingSubtitle(listing) {
  const cat = listing.category;
  if (cat === "cars") {
    return [listing.make, listing.model, listing.body, listing.transmission, listing.fuel]
      .filter(Boolean).join(" · ");
  }
  if (cat === "housing") {
    const beds = listing.bedrooms !== undefined ? `${listing.bedrooms} BR` : null;
    return [beds, listing.listingType, listing.leaseTerm].filter(Boolean).join(" · ");
  }
  if (cat === "computers") {
    return [listing.brand, listing.subcategory, listing.screen ? `${listing.screen}"` : null]
      .filter(Boolean).join(" · ");
  }
  if (cat === "electronics") {
    return [listing.subcategory, listing.brand, listing.condition].filter(Boolean).join(" · ");
  }
  if (cat === "phones") {
    return [listing.subcategory, listing.brand, listing.storageGb ? `${listing.storageGb}GB` : null]
      .filter(Boolean).join(" · ");
  }
  return listing.subcategory || listing.category || "";
}

function listingBadges(listing) {
  const badges = [];
  const cat = listing.category;
  if (cat === "cars") {
    if (listing.year) badges.push(`<span class="badge">${listing.year}</span>`);
    if (listing.mileage) badges.push(`<span class="badge">${Math.round(listing.mileage / 1000)}k mi</span>`);
    if (listing.titleStatus === "Clean") badges.push(`<span class="badge badge-green">Clean title</span>`);
  }
  if (cat === "housing") {
    const amens = (listing.amenities || []).slice(0, 3);
    amens.forEach((a) => badges.push(`<span class="badge">${escapeHtml(a)}</span>`));
    if (listing.bathrooms) badges.push(`<span class="badge">${listing.bathrooms} bath</span>`);
  }
  if (cat === "computers") {
    if (listing.ramGb) badges.push(`<span class="badge">${listing.ramGb}GB</span>`);
    if (listing.storageGb) badges.push(`<span class="badge">${listing.storageGb}GB</span>`);
    if (listing.condition) badges.push(`<span class="badge">${escapeHtml(listing.condition)}</span>`);
  }
  if (cat === "electronics" && listing.condition) {
    badges.push(`<span class="badge">${escapeHtml(listing.condition)}</span>`);
  }
  if (cat === "phones") {
    if (listing.storageGb) badges.push(`<span class="badge">${listing.storageGb}GB</span>`);
    if (listing.unlocked) badges.push(`<span class="badge badge-green">Unlocked</span>`);
    if (listing.condition) badges.push(`<span class="badge">${escapeHtml(listing.condition)}</span>`);
  }
  return badges.join("");
}

function renderSearchResults() {
  const container = document.querySelector("#search-listing-list");
  const heading = document.querySelector("#search-heading");
  const status = document.querySelector("#search-status");
  const eyebrow = document.querySelector("#search-eyebrow");

  if (!container) return;

  const scored = searchResults.results || [];
  
  if (eyebrow) {
    eyebrow.textContent = searchResults.category !== "All categories"
      ? `Search · ${searchResults.category}`
      : "Search results";
  }

  if (heading) {
    heading.textContent = scored.length
      ? `Results for "${searchResults.query}"`
      : `No results for "${searchResults.query}"`;
  }

  if (status) {
    status.textContent = scored.length
      ? `Showing ${scored.length} result${scored.length !== 1 ? "s" : ""}`
      : "";
  }

  if (!scored.length) {
    container.innerHTML = emptyState("Try different keywords, adjust your price range, or browse a specific category.");
    return;
  }

  container.innerHTML = scored.map(searchResultCard).join("");
}

let carModelsByMake = {
  "Any make": ["Any model"]
};

let carFilterSets = {
  makes: ["Any make", "BMW", "Toyota", "Honda", "Ford"],
  models: ["Any model", "X3", "X5", "Civic", "Rogue", "GLC 300"],
  colors: ["Black", "White", "Silver", "Blue", "Red", "Green", "Tan", "Gray"],
  bodies: ["SUV", "Sedan", "Wagon"]
};

const carFilters = new Set([]);
const carActiveFilters = document.querySelector("#car-active-filters");
const carMakeSelect = document.querySelector("#car-make");
const carModelSelect = document.querySelector("#car-model");
const carYearFrom = document.querySelector("#car-year-from");
const carYearTo = document.querySelector("#car-year-to");
const carPriceMin = document.querySelector("#car-price-min");
const carPriceMax = document.querySelector("#car-price-max");
const carSortSelect = document.querySelector("#cars [aria-label='Sort car listings']");

// Range filter state
const carRangeFilters = { yearFrom: null, yearTo: null, priceMin: null, priceMax: null };

const housingDefaults = [];
const housingActiveFilters = document.querySelector("#housing-active-filters");
const housingRentMin = document.querySelector("#housing-rent-min");
const housingRentMax = document.querySelector("#housing-rent-max");
const housingLocation = document.querySelector("#housing-location");
const housingSortSelect = document.querySelector(".sort-select");
const housingRanges = { rentMin: null, rentMax: null };
const housingListingTypes = ["For rent", "For sale", "Short-term"];
const housingBedroomValues = ["Studio", "1 BR", "2 BR", "3 BR", "4+ BR"];
const housingFurnishedValues = ["Furnished", "Unfurnished"];
const housingLeaseValues = ["Short-term lease", "Month-to-month", "1 year+"];
let housingNeighborhoods = ["Brooklyn", "Williamsburg", "Park Slope", "Astoria", "Flatbush", "Kensington", "Bensonhurst", "Bath Beach"];
const housingFilters = new Set(readHousingFilters());

const baseComputerTabs = ["Laptops", "Desktops", "Monitors", "Components", "Accessories"];
let computerFilterSets = {
  tabs: baseComputerTabs,
  brands: ["Any brand", "Apple", "Dell", "HP", "Lenovo"],
  screens: ["Any size", "13\"", "14\"", "15\"", "16\""]
};

const computerFilters = {
  tabs: new Set(),
  brand: "Any brand",
  screen: "Any size",
  yearFrom: null,
  yearTo: null,
  priceMin: null,
  priceMax: null,
  ram: "Any RAM",
  storage: "Any storage",
  condition: "Any condition",
  excludes: {
    Cases: false,
    Keyboards: false,
    Repair: false
  }
};

const computerBrandSelect = document.querySelector("#computer-brand");
const computerSortSelect = document.querySelector("#computers [aria-label='Sort computer listings']");
const computerYearFrom = document.querySelector("#computer-year-from");
const computerYearTo = document.querySelector("#computer-year-to");
const computerPriceMin = document.querySelector("#computer-price-min");
const computerPriceMax = document.querySelector("#computer-price-max");
const computerSpecSelects = Array.from(document.querySelectorAll("#computers .select-grid select"));
const computerTabs = document.querySelector(".computer-tabs");
const computerScreenGroup = document.querySelector("#computers .filter-panel .chip-group");
const computerActiveFilters = document.querySelector("#computers .active-filters");
const compareButton = document.querySelector("#compare-button");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(value, suffix = "") {
  if (!Number.isFinite(Number(value))) return "Price unavailable";
  const main = `$${Number(value).toLocaleString()}`;
  if (!suffix) return main;
  return `${main}<span class="price-suffix">${suffix}</span>`;
}

function goToRoute(route) {
  const nextRoute = route || "home";
  pages.forEach((page) => page.classList.toggle("is-active", page.dataset.page === nextRoute));
  routeLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.routeLink === nextRoute));
  if (window.location.hash.replace("#", "") !== nextRoute) {
    window.location.hash = nextRoute;
  }
  window.scrollTo({ top: 0 });
  requestAnimationFrame(() => window.scrollTo({ top: 0 }));
  if (nextRoute === "detail") renderDetail();
}

function currentRoute() {
  const route = window.location.hash.replace("#", "");
  return pages.some((page) => page.dataset.page === route) ? route : "home";
}

function lower(value) {
  return String(value || "").toLowerCase();
}

function textIncludes(listing, value) {
  const haystack = `${listing.title} ${listing.location}`.toLowerCase();
  return haystack.includes(lower(value));
}

function numberFromFilter(value) {
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function filterChip(label, scope) {
  return `
    <span class="filter-chip">
      ${escapeHtml(label)}
      <button type="button" aria-label="Remove ${escapeHtml(label)}" data-remove-${scope}="${escapeHtml(label)}">
        <svg class="icon-sm"><use href="#i-x"></use></svg>
      </button>
    </span>
  `;
}

function photoClass(listing, fallbackClass) {
  const hasImage = listing.image || (listing.images && listing.images.length);
  if (!hasImage) return fallbackClass;
  return `real-photo ${fallbackClass}`;
}


function photoStyle(listing) {
  const src = listing.image || (listing.images && listing.images[0]);
  return src ? ` style="--photo: url('${escapeHtml(src)}')"` : "";
}

function emptyState(message) {
  return `<div class="empty-state"><strong>No matching listings</strong><span>${escapeHtml(message)}</span></div>`;
}

function sortListings(listings, sortValue, category) {
  const sorted = [...listings];
  if (sortValue === "Lowest price") {
    return sorted.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
  }
  if (sortValue === "Newest") {
    return sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
  }
  if (sortValue === "Best value" || (category === "computers" && sortValue === "Best value")) {
    return sorted.sort((a, b) => valueScore(b) - valueScore(a));
  }
  return sorted.sort((a, b) => bestMatchScore(b, category) - bestMatchScore(a, category));
}

function bestMatchScore(listing, category) {
  let score = 0;
  if (category === "cars") {
    if (listing.make === "BMW") score += 5;
    if (listing.model === "X3") score += 6;
    if (listing.body === "SUV") score += 4;
    if (listing.year && listing.year < 2020) score += 3;
  }
  if (category === "housing") {
    if (listing.bedrooms === 1) score += 6;
    if (listing.price && listing.price <= 2500) score += 5;
    if (textIncludes(listing, "Brooklyn")) score += 4;
  }
  if (category === "computers" || category === "electronics" || category === "phones") {
    score += valueScore(listing);
  }
  return score;
}

function valueScore(listing) {
  const specs = (listing.ramGb || 4) + (listing.storageGb || 128) / 128 + (listing.year || 2014) / 500;
  return specs / Math.max(1, listing.price || 9999);
}

function readHousingFilters() {
  try {
    const stored = JSON.parse(localStorage.getItem("better-cl-housing-filters"));
    return Array.isArray(stored) && stored.length ? stored : housingDefaults;
  } catch {
    return housingDefaults;
  }
}

function saveHousingFilters() {
  localStorage.setItem("better-cl-housing-filters", JSON.stringify(Array.from(housingFilters)));
}

function replaceFilterGroup(set, values, nextValue, ignoreValues = []) {
  values.forEach((value) => set.delete(value));
  if (nextValue && !ignoreValues.includes(nextValue)) set.add(nextValue);
}

function normalizeLocation(value) {
  const clean = value.trim();
  if (!clean) return "";
  return clean.split(",")[0].trim();
}

function categoryListings(category) {
  return appState.listings.filter((listing) => listing.category === category);
}

function uniqueSorted(items, readValue) {
  return Array.from(new Set(items.map(readValue).filter(Boolean).map(String)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}

function topValues(items, readValue, limit = 10) {
  const counts = new Map();
  items.map(readValue).filter(Boolean).map(String).forEach((value) => {
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { numeric: true, sensitivity: "base" }))
    .slice(0, limit)
    .map(([value]) => value);
}

function setSelectOptions(select, options, preferredValue) {
  if (!select) return "";
  const safeOptions = options.length ? options : [preferredValue].filter(Boolean);
  const previousValue = select.value;
  const nextValue = safeOptions.includes(preferredValue)
    ? preferredValue
    : safeOptions.includes(previousValue)
      ? previousValue
      : safeOptions[0];
  select.innerHTML = safeOptions
    .map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`)
    .join("");
  select.value = nextValue;
  return nextValue;
}

function buttonList(values, selectedValue, extraAttributes = "") {
  return values
    .map((value) => `
      <button class="chip ${value === selectedValue ? "is-selected" : ""}" type="button" ${extraAttributes} data-value="${escapeHtml(value)}">
        ${escapeHtml(value.replace(" BR", ""))}
      </button>
    `)
    .join("");
}

function deriveFilterOptionsFromData() {
  const cars = categoryListings("cars");
  const housing = categoryListings("housing");
  const computers = categoryListings("computers");
  const electronics = categoryListings("electronics");
  const phones = categoryListings("phones");

  const makes = uniqueSorted(cars, (listing) => listing.make);
  const models = uniqueSorted(cars, (listing) => listing.model);
  const bodies = uniqueSorted(cars, (listing) => listing.body);

  carFilterSets = {
    ...carFilterSets,
    makes: ["Any make", ...makes],
    models: ["Any model", ...models],
    bodies: bodies.length ? bodies : carFilterSets.bodies
  };

  carModelsByMake = {
    "Any make": ["Any model", ...models]
  };
  makes.forEach((make) => {
    carModelsByMake[make] = ["Any model", ...uniqueSorted(cars.filter((listing) => listing.make === make), (listing) => listing.model)];
  });

  housingNeighborhoods = uniqueSorted(housing, (listing) => normalizeLocation(listing.location || ""));

  computerFilterSets = {
    tabs: Array.from(new Set([...baseComputerTabs, ...uniqueSorted(computers, (listing) => listing.subcategory)])),
    brands: ["Any brand", ...uniqueSorted(computers, (listing) => listing.brand)],
    screens: ["Any size", ...uniqueSorted(computers, (listing) => listing.screen ? `${listing.screen}"` : "")]
  };

  electronicsFilterSets = {
    subcategories: uniqueSorted(electronics, (l) => l.subcategory),
    brands: ["Any brand", ...uniqueSorted(electronics, (l) => l.brand)],
    conditions: uniqueSorted(electronics, (l) => l.condition)
  };

  phoneFilterSets = {
    subcategories: uniqueSorted(phones, (l) => l.subcategory),
    brands: ["Any brand", ...uniqueSorted(phones, (l) => l.brand)],
    storages: uniqueSorted(phones, (l) => l.storageGb ? String(l.storageGb) : null)
  };
}

function renderCarBodyOptions() {
  const group = document.querySelector("[data-car-group='body']");
  if (!group) return;
  group.innerHTML = carFilterSets.bodies
    .map((body) => `<button class="chip ${carFilters.has(body) ? "is-selected" : ""}" type="button" data-value="${escapeHtml(body)}">${escapeHtml(body)}</button>`)
    .join("");
}

function renderHousingNeighborhoodOptions() {
  const quickLinks = document.querySelector("#housing .quick-links");
  if (!quickLinks) return;
  const values = topValues(categoryListings("housing"), (listing) => normalizeLocation(listing.location || ""), 9);
  quickLinks.innerHTML = values
    .map((value) => `<button class="chip ${housingFilters.has(value) ? "is-selected" : ""}" type="button" data-housing-filter="${escapeHtml(value)}">${escapeHtml(value)}</button>`)
    .join("");
}

function renderComputerOptionControls() {
  if (computerTabs) {
    computerTabs.innerHTML = computerFilterSets.tabs
      .map((tab) => `<button class="${computerFilters.tabs.has(tab) ? "is-selected" : ""}" type="button">${escapeHtml(tab)}</button>`)
      .join("");
  }
  if (!computerFilterSets.brands.includes(computerFilters.brand)) computerFilters.brand = "Any brand";
  computerFilters.brand = setSelectOptions(computerBrandSelect, computerFilterSets.brands, computerFilters.brand) || computerFilters.brand;
  if (!computerFilterSets.screens.includes(computerFilters.screen)) computerFilters.screen = computerFilterSets.screens.includes("13\"") ? "13\"" : "Any size";
  if (computerScreenGroup) {
    computerScreenGroup.innerHTML = buttonList(computerFilterSets.screens, computerFilters.screen);
  }
}

function updateCarModelOptions(make) {
  if (!carModelSelect) return;
  const options = carModelsByMake[make] || carModelsByMake["Any make"];
  carModelSelect.innerHTML = options.map((model) => `<option value="${escapeHtml(model)}">${escapeHtml(model)}</option>`).join("");
  const activeModel = Array.from(carFilters).find((filter) => carFilterSets.models.includes(filter));
  if (activeModel && !options.includes(activeModel)) carFilters.delete(activeModel);
  carModelSelect.value = options.includes(activeModel) ? activeModel : "Any model";
}

function syncCarControls() {
  const activeMake = Array.from(carFilters).find((filter) => carFilterSets.makes.includes(filter)) || "Any make";
  if (carMakeSelect) setSelectOptions(carMakeSelect, carFilterSets.makes, activeMake);
  updateCarModelOptions(activeMake);
  if (carYearFrom) carYearFrom.value = carRangeFilters.yearFrom ?? "";
  if (carYearTo) carYearTo.value = carRangeFilters.yearTo ?? "";
  if (carPriceMin) carPriceMin.value = carRangeFilters.priceMin ?? "";
  if (carPriceMax) carPriceMax.value = carRangeFilters.priceMax ?? "";
  renderCarBodyOptions();
  document.querySelectorAll("[data-car-group='body'] .chip").forEach((chip) => {
    chip.classList.toggle("is-selected", carFilters.has(chip.dataset.value));
  });
  document.querySelectorAll("[data-car-group='color'] .swatch").forEach((swatch) => {
    swatch.classList.toggle("is-selected", carFilters.has(swatch.dataset.value));
  });
}

function matchesCar(listing) {
  if (listing.category !== "cars") return false;
  for (const filter of carFilters) {
    if (filter === "Any make" || filter === "Any model") continue;
    if (carFilterSets.makes.includes(filter) && lower(listing.make) !== lower(filter) && !textIncludes(listing, filter)) return false;
    if (carFilterSets.models.includes(filter) && lower(listing.model) !== lower(filter) && !textIncludes(listing, filter)) return false;
    if (carFilterSets.bodies.includes(filter) && lower(listing.body) !== lower(filter) && !textIncludes(listing, filter)) return false;
    if (carFilterSets.colors.includes(filter) && listing.color && lower(listing.color) !== lower(filter)) return false;
    if (carFilterSets.colors.includes(filter) && !listing.color && !textIncludes(listing, filter)) return false;
  }
  // Year range
  if (carRangeFilters.yearFrom && listing.year && listing.year < carRangeFilters.yearFrom) return false;
  if (carRangeFilters.yearTo && listing.year && listing.year > carRangeFilters.yearTo) return false;
  // Price range
  if (carRangeFilters.priceMin !== null && listing.price && listing.price < carRangeFilters.priceMin) return false;
  if (carRangeFilters.priceMax !== null && listing.price && listing.price > carRangeFilters.priceMax) return false;
  return true;
}

function carCard(listing) {
  return `
    <article class="listing-card horizontal" data-detail-id="${escapeHtml(listing.id)}" data-detail-category="cars">
      <div class="visual-art ${photoClass(listing, listing.body === "Truck" ? "art-truck" : listing.color === "Silver" ? "silver-car" : "art-car")}"${photoStyle(listing)}></div>
      <div class="listing-body">
        <div class="listing-topline">
          <span class="year-badge">${escapeHtml(listing.year || "Year n/a")}</span>
        </div>
        <h3>${escapeHtml(listing.title)}</h3>
        <p>${escapeHtml([listing.location, listing.mileage ? `${listing.mileage.toLocaleString()} miles` : null, listing.transmission, listing.body].filter(Boolean).join(" · "))}</p>
        <div class="listing-bottom">
          <span class="price">${formatPrice(listing.price)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderCarFilters() {
  if (!carActiveFilters) return;
  syncCarControls();
  const rangeChips = [];
  if (carRangeFilters.yearFrom !== null) rangeChips.push(`Year ≥ ${carRangeFilters.yearFrom}`);
  if (carRangeFilters.yearTo !== null) rangeChips.push(`Year ≤ ${carRangeFilters.yearTo}`);
  if (carRangeFilters.priceMin !== null) rangeChips.push(`Min $${carRangeFilters.priceMin}`);
  if (carRangeFilters.priceMax !== null) rangeChips.push(`Max $${carRangeFilters.priceMax}`);
  carActiveFilters.innerHTML = [
    ...Array.from(carFilters)
      .filter((filter) => !["Any make", "Any model"].includes(filter))
      .map((filter) => filterChip(filter, "car")),
    ...rangeChips.map((chip) => `<span class="filter-chip">${escapeHtml(chip)}</span>`)
  ].join("");
  const matches = sortListings(appState.listings.filter(matchesCar), carSortSelect?.value || "Best match", "cars");
  const container = document.querySelector("#cars .listing-list");
  if (container) {
    container.innerHTML = matches.length ? matches.map(carCard).join("") : emptyState("Try removing model, body, or year filters.");
  }
  // Update status bar
  const statusEl = document.querySelector("#car-status");
  if (statusEl) statusEl.textContent = `Showing ${matches.length} listing${matches.length !== 1 ? "s" : ""}`;
}

function syncHousingControls() {
  renderHousingNeighborhoodOptions();
  document.querySelectorAll("[data-housing-filter]").forEach((control) => {
    control.classList.toggle("is-selected", housingFilters.has(control.dataset.housingFilter));
  });
  if (housingRentMin) housingRentMin.value = housingRanges.rentMin ?? "";
  if (housingRentMax) housingRentMax.value = housingRanges.rentMax ?? "";
}

function bedroomLabel(value) {
  if (value === 0) return "Studio";
  if (value === 1) return "1 BR";
  if (value && value >= 4) return "4+ BR";
  return value ? `${value} BR` : "BR n/a";
}

function normalizedLease(value) {
  return lower(value).replace(" lease", "").trim();
}

function isKnownHousingFilter(filter) {
  return housingListingTypes.includes(filter)
    || housingBedroomValues.includes(filter)
    || housingFurnishedValues.includes(filter)
    || housingLeaseValues.includes(filter);
}

function matchesHousing(listing) {
  if (listing.category !== "housing") return false;
  for (const filter of housingFilters) {
    if (housingListingTypes.includes(filter) && listing.listingType && lower(listing.listingType) !== lower(filter)) return false;
    if (housingBedroomValues.includes(filter) && bedroomLabel(listing.bedrooms) !== filter) return false;
    if (filter === "Furnished" && listing.furnished !== true) return false;
    if (filter === "Unfurnished" && listing.furnished === true) return false;
    if (housingLeaseValues.includes(filter) && listing.leaseTerm && normalizedLease(listing.leaseTerm) !== normalizedLease(filter)) return false;
    if (!isKnownHousingFilter(filter) && !textIncludes(listing, filter)) return false;
  }
  // Rent range
  if (housingRanges.rentMin !== null && listing.price && listing.price < housingRanges.rentMin) return false;
  if (housingRanges.rentMax !== null && listing.price && listing.price > housingRanges.rentMax) return false;
  return true;
}

function housingCard(listing) {
  const amenities = (listing.amenities || []).slice(0, 3);
  const noFee = lower(listing.title).includes("no fee") || amenities.some((item) => lower(item).includes("no fee"));
  return `
    <article class="listing-card horizontal apartment-card" data-detail-id="${escapeHtml(listing.id)}" data-detail-category="housing">
      <div class="visual-art ${photoClass(listing, listing.bedrooms === 0 ? "art-loft" : listing.bedrooms >= 2 ? "art-townhouse" : "art-apartment")}"${photoStyle(listing)}></div>
      <div class="listing-body">
        <div class="listing-topline">
          <span class="year-badge">${bedroomLabel(listing.bedrooms)}</span>
          ${noFee ? '<span class="badge badge-green">No fee</span>' : ''}
        </div>
        <h3>${escapeHtml(listing.title)}</h3>
        <p>${escapeHtml([listing.location, listing.bathrooms ? `${listing.bathrooms} bath` : null, listing.leaseTerm].filter(Boolean).join(" · "))}</p>
        <div class="badge-row">
          ${amenities.map((item) => `<span class="badge">${escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="listing-bottom">
          <span class="price">${formatPrice(listing.price, "/mo")}</span>
        </div>
      </div>
    </article>
  `;
}

function renderHousingFilters() {
  if (!housingActiveFilters) return;
  syncHousingControls();
  const rangeChips = [];
  if (housingRanges.rentMin !== null) rangeChips.push(`Min $${housingRanges.rentMin}`);
  if (housingRanges.rentMax !== null) rangeChips.push(`Max $${housingRanges.rentMax}`);
  housingActiveFilters.innerHTML = [
    ...Array.from(housingFilters).map((filter) => filterChip(filter, "housing")),
    ...rangeChips.map((chip) => `<span class="filter-chip">${escapeHtml(chip)}</span>`)
  ].join("");
  saveHousingFilters();
  const matches = sortListings(appState.listings.filter(matchesHousing), housingSortSelect?.value || "Best match", "housing");
  const container = document.querySelector("#housing .listing-list");
  if (container) {
    container.innerHTML = matches.length ? matches.map(housingCard).join("") : emptyState("Try a broader neighborhood, bedroom, or rent range.");
  }
  // Update status bar
  const statusEl = document.querySelector("#housing-status");
  if (statusEl) statusEl.textContent = `Showing ${matches.length} listing${matches.length !== 1 ? "s" : ""}`;
}

function screenNumber(value) {
  return Number(String(value).replace(/[^\d.]/g, ""));
}

function specMin(value) {
  return Number(String(value).match(/\d+/)?.[0] || 0);
}

function conditionRank(value) {
  const ranks = {
    fair: 1,
    good: 2,
    "very good": 3,
    excellent: 4,
    "open box": 5
  };
  return ranks[lower(value)] || 0;
}

function excludedComputer(listing) {
  const title = lower(listing.title);
  return (computerFilters.excludes.Cases && /\b(case|cover|sleeve|bag|stand|dock|adapter)\b/.test(title))
    || (computerFilters.excludes.Keyboards && /\b(keyboard|keys)\b/.test(title))
    || (computerFilters.excludes.Repair && /\b(repair|parts|locked|display assembly)\b/.test(title));
}

function matchesComputer(listing) {
  if (listing.category !== "computers") return false;
  if (computerFilters.tabs.size > 0 && listing.subcategory) {
    const match = Array.from(computerFilters.tabs).some((tab) => lower(listing.subcategory) === lower(tab));
    if (!match) return false;
  }
  if (computerFilters.brand && computerFilters.brand !== "Any brand" && lower(listing.brand) !== lower(computerFilters.brand) && !textIncludes(listing, computerFilters.brand)) return false;
  if ((computerFilters.brand === "Apple") && !textIncludes(listing, "MacBook") && !textIncludes(listing, "Apple")) return false;
  if (excludedComputer(listing)) return false;
  const selectedScreen = screenNumber(computerFilters.screen);
  if (selectedScreen && listing.screen && listing.screen !== selectedScreen) return false;
  // Year range
  if (computerFilters.yearFrom && listing.year && listing.year < computerFilters.yearFrom) return false;
  if (computerFilters.yearTo && listing.year && listing.year > computerFilters.yearTo) return false;
  // Price range
  if (computerFilters.priceMin !== null && listing.price && listing.price < computerFilters.priceMin) return false;
  if (computerFilters.priceMax !== null && listing.price && listing.price > computerFilters.priceMax) return false;
  const selectedRam = specMin(computerFilters.ram);
  if (selectedRam && listing.ramGb && listing.ramGb < selectedRam) return false;
  const selectedStorage = specMin(computerFilters.storage);
  if (selectedStorage && listing.storageGb && listing.storageGb < selectedStorage) return false;
  if (computerFilters.condition === "Good+" && listing.condition && conditionRank(listing.condition) < conditionRank("Good")) return false;
  if (computerFilters.condition === "Excellent" && listing.condition && conditionRank(listing.condition) < conditionRank("Excellent")) return false;
  if (computerFilters.condition === "Open box" && listing.condition !== "Open box") return false;
  return true;
}

function computerSpecs(listing) {
  return [
    listing.year || null,
    listing.ramGb ? `${listing.ramGb}GB RAM` : null,
    listing.storageGb ? `${listing.storageGb}GB SSD` : null,
    listing.screen ? `${listing.screen}"` : null,
    listing.condition
  ].filter(Boolean);
}

function computerCard(listing) {
  const compared = appState.compareIds.has(listing.id);
  const bestValue = valueScore(listing) > 0.04 || listing.price <= 200;
  return `
    <article class="listing-card horizontal compare-card ${compared ? "is-compared" : ""}" data-detail-id="${escapeHtml(listing.id)}" data-detail-category="computers">
      <label class="compare-check" onclick="event.stopPropagation()"><input type="checkbox" ${compared ? "checked" : ""} data-compare-id="${escapeHtml(listing.id)}" /> Compare</label>
      <div class="visual-art ${photoClass(listing, listing.subcategory === "Accessories" ? "light-laptop" : "art-laptop")}"${photoStyle(listing)}></div>
      <div class="listing-body">
        <div class="listing-topline">
          ${bestValue ? '<span class="badge badge-green">Best value</span>' : ''}
          <span class="badge">${escapeHtml(listing.condition || "Condition n/a")}</span>
        </div>
        <h3>${escapeHtml(listing.title)}</h3>
        <p>${escapeHtml([listing.brand, ...computerSpecs(listing)].filter(Boolean).join(" · "))}</p>
        <div class="badge-row">
          ${computerSpecs(listing).slice(0, 3).map((item) => `<span class="badge">${escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="listing-bottom">
          <span class="price">${formatPrice(listing.price)}</span>
        </div>
      </div>
    </article>
  `;
}

function syncComputerControls() {
  renderComputerOptionControls();
  document.querySelectorAll(".computer-tabs button").forEach((tab) => {
    tab.classList.toggle("is-selected", computerFilters.tabs.has(tab.textContent.trim()));
  });
  if (computerBrandSelect) computerBrandSelect.value = computerFilters.brand;
  document.querySelectorAll("#computers .chip-group .chip").forEach((chip) => {
    chip.classList.toggle("is-selected", chip.textContent.trim() === computerFilters.screen);
  });
}

function updateCompareState() {
  if (compareButton) compareButton.textContent = `Compare (${appState.compareIds.size})`;
}

function renderComputerActiveFilters() {
  if (!computerActiveFilters) return;
  const active = [
    ...Array.from(computerFilters.tabs),
    computerFilters.brand !== "Any brand" ? computerFilters.brand : null,
    computerFilters.screen !== "Any size" ? computerFilters.screen : null,
    computerFilters.yearFrom ? `Year ≥ ${computerFilters.yearFrom}` : null,
    computerFilters.yearTo ? `Year ≤ ${computerFilters.yearTo}` : null,
    computerFilters.priceMin !== null ? `Min $${computerFilters.priceMin}` : null,
    computerFilters.priceMax !== null ? `Max $${computerFilters.priceMax}` : null,
    computerFilters.ram !== "Any RAM" ? computerFilters.ram : null,
    computerFilters.storage !== "Any storage" ? computerFilters.storage : null,
    computerFilters.condition !== "Any condition" ? computerFilters.condition : null,
    ...Object.entries(computerFilters.excludes)
      .filter(([, enabled]) => enabled)
      .map(([label]) => `No ${label.toLowerCase()}`)
  ].filter(Boolean);
  computerActiveFilters.innerHTML = active.map((filter) => `<span class="filter-chip">${escapeHtml(filter)}</span>`).join("");
}

function renderComputerFilters() {
  syncComputerControls();
  const matches = sortListings(appState.listings.filter(matchesComputer), computerSortSelect?.value || "Best value", "computers");
  // Update status bar
  const statusEl = document.querySelector("#computers-status");
  if (statusEl) statusEl.textContent = `Showing ${matches.length} listing${matches.length !== 1 ? "s" : ""}`;
  const visibleCompareCount = matches.filter((listing) => appState.compareIds.has(listing.id)).length;
  if (visibleCompareCount === 0 && matches.length) {
    appState.compareIds = new Set(matches.slice(0, 2).map((listing) => listing.id));
  }
  const container = document.querySelector("#computers .listing-list");
  if (container) {
    container.innerHTML = matches.length ? matches.map(computerCard).join("") : emptyState("Try a different screen size or disable an exclude option.");
  }
  updateCompareState();
  renderComputerActiveFilters();
}

/* ── Electronics ── */

let electronicsFilterSets = {
  subcategories: ["Audio", "Headphones", "TV & video", "Other electronics"],
  brands: ["Any brand", "Apple", "Bose", "LG", "Yamaha"],
  conditions: ["New", "Used - Good", "Used - Fair", "Open box"]
};

const electronicsFilters = {
  subcategory: null,
  brand: "Any brand",
  condition: null,
  priceMin: null,
  priceMax: null
};

const electronicsBrandSelect = document.querySelector("#electronics-brand");
const electronicsPriceMin = document.querySelector("#electronics-price-min");
const electronicsPriceMax = document.querySelector("#electronics-price-max");
const electronicsSortSelect = document.querySelector("#electronics .sort-select");
const electronicsActiveFilters = document.querySelector("#electronics-active-filters");
const electronicsSubcategoryGroup = document.querySelector("#electronics-subcategory-group");

// Electronics matching
function matchesElectronics(listing) {
  if (listing.category !== "electronics") return false;
  
  // Subcategory
  if (electronicsFilters.subcategory && listing.subcategory && 
      lower(listing.subcategory) !== lower(electronicsFilters.subcategory)) return false;
  
  // Brand
  if (electronicsFilters.brand !== "Any brand" && listing.brand && 
      lower(listing.brand) !== lower(electronicsFilters.brand) && !textIncludes(listing, electronicsFilters.brand)) return false;
  
  // Condition
  if (electronicsFilters.condition && listing.condition) {
    if (lower(listing.condition) !== lower(electronicsFilters.condition)) return false;
  }
  if (electronicsFilters.condition && !listing.condition) return false;
  
  // Price range
  if (electronicsFilters.priceMin !== null && listing.price && listing.price < electronicsFilters.priceMin) return false;
  if (electronicsFilters.priceMax !== null && listing.price && listing.price > electronicsFilters.priceMax) return false;
  
  return true;
}

function electronicsCard(listing) {
  const subcat = listing.subcategory || "Other";
  const artMap = {
    "Audio": "art-wheel",
    "Headphones": "art-laptop",
    "TV & video": "art-dashboard",
    "Other electronics": "art-suv"
  };
  const art = artMap[subcat] || "art-laptop";
  return `
    <article class="listing-card horizontal" data-detail-id="${escapeHtml(listing.id)}" data-detail-category="electronics">
      <div class="visual-art ${photoClass(listing, art)}"${photoStyle(listing)}></div>
      <div class="listing-body">
        <div class="listing-topline">
          <span class="badge badge-green">${escapeHtml(subcat)}</span>
          ${listing.brand ? `<span class="badge">${escapeHtml(listing.brand)}</span>` : ''}
        </div>
        <h3>${escapeHtml(listing.title)}</h3>
        <p>${escapeHtml([listing.location, listing.condition].filter(Boolean).join(" · "))}</p>
        <div class="listing-bottom">
          <span class="price">${formatPrice(listing.price)}</span>
        </div>
      </div>
    </article>
  `;
}

function syncElectronicsControls() {
  // Subcategory chips
  if (electronicsSubcategoryGroup) {
    electronicsSubcategoryGroup.innerHTML = electronicsFilterSets.subcategories
      .map((sub) => `<button class="chip ${sub === electronicsFilters.subcategory ? "is-selected" : ""}" type="button" data-electronics-sub="${escapeHtml(sub)}">${escapeHtml(sub)}</button>`)
      .join("");
  }
  // Brand select
  if (electronicsBrandSelect) {
    setSelectOptions(electronicsBrandSelect, electronicsFilterSets.brands, electronicsFilters.brand);
  }
  // Condition chips
  document.querySelectorAll("[data-electronics-condition]").forEach((chip) => {
    chip.classList.toggle("is-selected", chip.dataset.electronicsCondition === electronicsFilters.condition);
  });
  // Price range inputs
  if (electronicsPriceMin) electronicsPriceMin.value = electronicsFilters.priceMin ?? "";
  if (electronicsPriceMax) electronicsPriceMax.value = electronicsFilters.priceMax ?? "";
}

function renderElectronicsActiveFilters() {
  if (!electronicsActiveFilters) return;
  const active = [];
  if (electronicsFilters.subcategory) active.push(electronicsFilters.subcategory);
  if (electronicsFilters.brand !== "Any brand") active.push(electronicsFilters.brand);
  if (electronicsFilters.condition) active.push(electronicsFilters.condition);
  if (electronicsFilters.priceMin !== null) active.push(`Min $${electronicsFilters.priceMin}`);
  if (electronicsFilters.priceMax !== null) active.push(`Max $${electronicsFilters.priceMax}`);
  electronicsActiveFilters.innerHTML = active.map((f) => `<span class="filter-chip">${escapeHtml(f)}</span>`).join("");
}

function renderElectronicsFilters() {
  syncElectronicsControls();
  const matches = sortListings(appState.listings.filter(matchesElectronics), electronicsSortSelect?.value || "Best value", "electronics");
  const statusEl = document.querySelector("#electronics-status");
  if (statusEl) statusEl.textContent = `Showing ${matches.length} listing${matches.length !== 1 ? "s" : ""}`;
  const container = document.querySelector("#electronics-listing-list");
  if (container) {
    container.innerHTML = matches.length ? matches.map(electronicsCard).join("") : emptyState("Try a different category or remove some filters.");
  }
  renderElectronicsActiveFilters();
}

/* ── Phones ── */

let phoneFilterSets = {
  subcategories: ["iPhone", "Samsung Galaxy", "Cases & covers", "Accessories", "Other phones"],
  brands: ["Any brand", "Apple", "Samsung", "Motorola", "LG"],
  storages: ["64", "128", "256", "512"]
};

const phoneFilters = {
  subcategory: null,
  brand: "Any brand",
  storage: null,
  unlocked: null,
  condition: null,
  priceMin: null,
  priceMax: null
};

const phoneBrandSelect = document.querySelector("#phones-brand");
const phonePriceMin = document.querySelector("#phones-price-min");
const phonePriceMax = document.querySelector("#phones-price-max");
const phoneSortSelect = document.querySelector("#phones .sort-select");
const phoneActiveFilters = document.querySelector("#phones-active-filters");
const phoneSubcategoryGroup = document.querySelector("#phones-subcategory-group");

// Phones matching
function matchesPhones(listing) {
  if (listing.category !== "phones") return false;
  
  // Subcategory
  if (phoneFilters.subcategory && listing.subcategory) {
    const matchSub = phoneFilters.subcategory === "Accessories"
      ? ["Cases & covers", "Audio accessories", "Phone accessories"].some(s => lower(listing.subcategory) === lower(s))
      : lower(listing.subcategory) === lower(phoneFilters.subcategory);
    if (!matchSub) return false;
  }
  if (phoneFilters.subcategory && !listing.subcategory) return false;
  
  // Brand
  if (phoneFilters.brand !== "Any brand" && listing.brand && 
      lower(listing.brand) !== lower(phoneFilters.brand)) return false;
  
  // Storage
  if (phoneFilters.storage && listing.storageGb && listing.storageGb < Number(phoneFilters.storage)) return false;
  if (phoneFilters.storage && !listing.storageGb) return false;
  
  // Unlocked
  if (phoneFilters.unlocked !== null && listing.unlocked !== undefined && listing.unlocked !== phoneFilters.unlocked) return false;
  
  // Condition
  if (phoneFilters.condition && listing.condition && lower(listing.condition) !== lower(phoneFilters.condition)) return false;
  if (phoneFilters.condition && !listing.condition) return false;
  
  // Price range
  if (phoneFilters.priceMin !== null && listing.price && listing.price < phoneFilters.priceMin) return false;
  if (phoneFilters.priceMax !== null && listing.price && listing.price > phoneFilters.priceMax) return false;
  
  return true;
}

function phoneCard(listing) {
  const subcat = listing.subcategory || "Phone";
  const isCase = /\b(case|cover)\b/i.test(listing.title || "");
  const isAccessory = listing.itemType === "Accessory" || /\b(charger|cable|adapter|stand)\b/i.test(listing.title || "");
  const isPhone = listing.itemType === "Phone" || /iPhone|Galaxy|Moto/i.test(listing.title || "");
  const art = isPhone ? "art-smartphone" : isCase ? "art-watch" : "art-sim";
  return `
    <article class="listing-card horizontal" data-detail-id="${escapeHtml(listing.id)}" data-detail-category="phones">
      <div class="visual-art ${photoClass(listing, art)}"${photoStyle(listing)}></div>
      <div class="listing-body">
        <div class="listing-topline">
          <span class="badge badge-green">${escapeHtml(subcat)}</span>
          ${listing.unlocked ? '<span class="badge">Unlocked</span>' : ''}
        </div>
        <h3>${escapeHtml(listing.title)}</h3>
        <p>${escapeHtml([listing.location, listing.brand, listing.condition, listing.storageGb ? `${listing.storageGb}GB` : null].filter(Boolean).join(" · "))}</p>
        <div class="listing-bottom">
          <span class="price">${formatPrice(listing.price)}</span>
        </div>
      </div>
    </article>
  `;
}

function syncPhoneControls() {
  // Subcategory chips
  if (phoneSubcategoryGroup) {
    phoneSubcategoryGroup.innerHTML = phoneFilterSets.subcategories
      .map((sub) => `<button class="chip ${sub === phoneFilters.subcategory ? "is-selected" : ""}" type="button" data-phones-sub="${escapeHtml(sub)}">${escapeHtml(sub)}</button>`)
      .join("");
  }
  // Brand select
  if (phoneBrandSelect) {
    setSelectOptions(phoneBrandSelect, phoneFilterSets.brands, phoneFilters.brand);
  }
  // Storage chips
  document.querySelectorAll("[data-phones-storage]").forEach((chip) => {
    chip.classList.toggle("is-selected", chip.dataset.phonesStorage === phoneFilters.storage);
  });
  // Unlocked chips
  document.querySelectorAll("[data-phones-unlocked]").forEach((chip) => {
    chip.classList.toggle("is-selected", String(chip.dataset.phonesUnlocked) === String(phoneFilters.unlocked));
  });
  // Condition chips
  document.querySelectorAll("[data-phones-condition]").forEach((chip) => {
    chip.classList.toggle("is-selected", chip.dataset.phonesCondition === phoneFilters.condition);
  });
  // Price range inputs
  if (phonePriceMin) phonePriceMin.value = phoneFilters.priceMin ?? "";
  if (phonePriceMax) phonePriceMax.value = phoneFilters.priceMax ?? "";
}

function renderPhonesActiveFilters() {
  if (!phoneActiveFilters) return;
  const active = [];
  if (phoneFilters.subcategory) active.push(phoneFilters.subcategory);
  if (phoneFilters.brand !== "Any brand") active.push(phoneFilters.brand);
  if (phoneFilters.storage) active.push(`${phoneFilters.storage}GB`);
  if (phoneFilters.unlocked === true) active.push("Unlocked");
  if (phoneFilters.unlocked === false) active.push("Carrier");
  if (phoneFilters.condition) active.push(phoneFilters.condition);
  if (phoneFilters.priceMin !== null) active.push(`Min $${phoneFilters.priceMin}`);
  if (phoneFilters.priceMax !== null) active.push(`Max $${phoneFilters.priceMax}`);
  phoneActiveFilters.innerHTML = active.map((f) => `<span class="filter-chip">${escapeHtml(f)}</span>`).join("");
}

function renderPhonesFilters() {
  syncPhoneControls();
  const matches = sortListings(appState.listings.filter(matchesPhones), phoneSortSelect?.value || "Best value", "phones");
  const statusEl = document.querySelector("#phones-status");
  if (statusEl) statusEl.textContent = `Showing ${matches.length} listing${matches.length !== 1 ? "s" : ""}`;
  const container = document.querySelector("#phones-listing-list");
  if (container) {
    container.innerHTML = matches.length ? matches.map(phoneCard).join("") : emptyState("Try a different type or remove some filters.");
  }
  renderPhonesActiveFilters();
}

function renderHomeListings() {
  const container = document.querySelector("#home .listing-grid");
  if (!container) return;
  const picks = [
    sortListings(appState.listings.filter((item) => item.category === "cars"), "Best match", "cars")[0],
    sortListings(appState.listings.filter((item) => item.category === "housing"), "Best match", "housing")[0],
    sortListings(appState.listings.filter((item) => item.category === "computers" && !excludedComputer(item)), "Best value", "computers")[0]
  ].filter(Boolean);
  container.innerHTML = picks.map((listing) => {
    const artMap = { housing: "art-apartment", computers: "art-laptop", electronics: "art-wheel", phones: "art-smartphone", cars: "art-car" };
    const art = artMap[listing.category] || "art-car";
    return `
      <article class="listing-card" data-detail-id="${escapeHtml(listing.id)}" data-detail-category="${escapeHtml(listing.category)}">
        <div class="visual-art ${photoClass(listing, art)}"${photoStyle(listing)}></div>
        <div class="listing-body">
          <div class="listing-topline">
            <span class="price">${formatPrice(listing.price, listing.category === "housing" ? "/mo" : "")}</span>
          </div>
          <h3>${escapeHtml(listing.title)}</h3>
          <p>${escapeHtml(listing.location)}</p>
          <div class="badge-row">
            <span class="badge">${escapeHtml(listing.category)}</span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderMiniListings() {
  const mini = document.querySelector(".hero-visual");
  if (!mini) return;
  const picks = [
    sortListings(appState.listings.filter((item) => item.category === "housing"), "Best match", "housing")[0],
    sortListings(appState.listings.filter((item) => item.category === "cars"), "Best match", "cars")[0],
    sortListings(appState.listings.filter((item) => item.category === "computers" && !excludedComputer(item)), "Best value", "computers")[0]
  ].filter(Boolean);
  mini.innerHTML = picks.map((listing, index) => {
    const artMap = { housing: "art-apartment", computers: "art-laptop", electronics: "art-wheel", phones: "art-smartphone", cars: "art-car" };
    const art = artMap[listing.category] || "art-car";
    return `
      <article class="mini-listing ${index === 1 ? "offset" : ""}" data-detail-id="${escapeHtml(listing.id)}" data-detail-category="${escapeHtml(listing.category)}">
        <div class="visual-art ${photoClass(listing, art)}"${photoStyle(listing)}></div>
        <div>
          <strong>${escapeHtml(listing.title)}</strong>
          <span>${formatPrice(listing.price, listing.category === "housing" ? "/mo" : "")} · ${escapeHtml(listing.location)}</span>
        </div>
      </article>
    `;
  }).join("");
}

function sellerInitials(name) {
  return name.split(" ").map((s) => s[0]).join("").toUpperCase().slice(0, 2) || "CL";
}

function randomSellerName() {
  const firstNames = ["Marcus", "James", "Sarah", "Alex", "Jessica", "David", "Emily", "Michael", "Rachel", "Chris", "Amanda", "Daniel", "Sophie", "Tom", "Lena", "Omar", "Priya", "Carlos", "Yuki", "Fiona"];
  const lastNames = ["J.", "K.", "R.", "M.", "W.", "P.", "C.", "D.", "A.", "L.", "S.", "B.", "G.", "T.", "N.", "H.", "F.", "Z.", "I.", "O."];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

let detailGalleryIndex = 0;
let detailGalleryPhotos = [];

function setMainPhoto(index) {
  const art = document.querySelector("#detail-art");
  if (!art || !detailGalleryPhotos.length) return;
  detailGalleryIndex = Math.max(0, Math.min(index, detailGalleryPhotos.length - 1));
  const photo = detailGalleryPhotos[detailGalleryIndex];
  if (photo.type === "real") {
    art.className = "visual-art detail-art real-photo";
    art.style.setProperty("--photo", `url('${photo.url}')`);
  } else {
    art.className = `visual-art detail-art ${photo.url}`;
    art.style.setProperty("--photo", "");
  }
  // Update thumbs
  document.querySelectorAll("#detail-thumbs .thumb").forEach((thumb, i) => {
    thumb.classList.toggle("is-selected", i === detailGalleryIndex);
  });
  // Update counter
  const counter = document.querySelector("#detail-photo-counter");
  if (counter) counter.textContent = `${detailGalleryIndex + 1} / ${detailGalleryPhotos.length}`;
}

function buildGalleryPhotos(listing) {
  const photos = [];
  if (listing.images && listing.images.length) {
    listing.images.forEach((img) => photos.push({ type: "real", url: img }));
  } else if (listing.image) {
    photos.push({ type: "real", url: listing.image });
  }
  // Decorative arts based on category
  const cat = listing.category || "cars";
  if (cat === "cars") {
    const arts = ["art-car", "art-dashboard", "art-wheel", "art-suv", "art-truck"];
    arts.forEach((artClass) => photos.push({ type: "deco", url: artClass }));
  } else if (cat === "housing") {
    const arts = ["art-apartment", "art-loft", "art-townhouse", "art-dashboard", "art-wheel"];
    arts.forEach((artClass) => photos.push({ type: "deco", url: artClass }));
  } else if (cat === "computers") {
    const arts = ["art-laptop", "dark-laptop", "light-laptop", "art-dashboard", "art-wheel"];
    arts.forEach((artClass) => photos.push({ type: "deco", url: artClass }));
  } else if (cat === "electronics") {
    const arts = ["art-laptop", "art-wheel", "art-dashboard", "art-suv", "art-smartphone"];
    arts.forEach((artClass) => photos.push({ type: "deco", url: artClass }));
  } else if (cat === "phones") {
    const arts = ["art-smartphone", "art-sim", "art-watch", "art-dashboard", "art-wheel"];
    arts.forEach((artClass) => photos.push({ type: "deco", url: artClass }));
  }
  return photos;
}

function renderDetail() {
  const category = appState.selectedDetailCategory || "cars";
  const listings = appState.listings.filter((item) => item.category === category);
  const listing = listings.find((item) => item.id === appState.selectedDetailId) || listings[0];
  if (!listing) return;

  // Build gallery photos and reset index
  detailGalleryPhotos = buildGalleryPhotos(listing);
  detailGalleryIndex = 0;

  // Breadcrumb — determine previous page
  const breadcrumbLink = document.querySelector("#detail-breadcrumb-link");
  if (breadcrumbLink) {
    breadcrumbLink.href = `#${category}`;
    breadcrumbLink.setAttribute("data-route-link", category);
    const labelMap = { housing: "housing", computers: "computers", electronics: "electronics", phones: "phones", cars: "cars" };
    const label = labelMap[category] || "cars";
    breadcrumbLink.innerHTML = `<svg class="icon-sm"><use href="#i-x" style="transform: rotate(135deg)"></use></svg> Back to ${label}`;
  }

  // Category labels
  const categoryLabelMap = {
    housing: "Housing / apartments",
    computers: "Electronics / computers",
    electronics: "Electronics / audio & video",
    phones: "Phones / mobile devices",
    cars: "Cars & trucks"
  };
  const categoryLabel = categoryLabelMap[category] || "Listings";
  const categoryIconMap = { housing: "i-home", computers: "i-laptop", electronics: "i-headphones", phones: "i-smartphone", cars: "i-car" };
  const categoryIcon = categoryIconMap[category] || "i-tag";

  // Title & price section
  const title = document.querySelector("#detail-title");
  const price = document.querySelector("#detail-price");
  const muted = document.querySelector("#detail-muted");
  const eyebrow = document.querySelector("#detail-eyebrow");

  if (title) title.textContent = listing.title;
  if (price) price.innerHTML = formatPrice(listing.price, category === "housing" ? "/mo" : "");
  if (eyebrow) eyebrow.textContent = `${categoryLabel} / ${listing.location || "New York"}`;

  // Build muted spec line per category
  if (muted) {
    let specs = [];
    if (category === "cars") {
      specs = [listing.body, listing.transmission, listing.fuel, listing.mileage ? `${listing.mileage.toLocaleString()} mi` : null];
    } else if (category === "housing") {
      specs = [
        listing.bedrooms !== undefined ? `${listing.bedrooms} BR` : null,
        listing.bathrooms ? `${listing.bathrooms} bath` : null,
        listing.leaseTerm,
        listing.furnished ? "Furnished" : null
      ];
    } else if (category === "computers") {
      specs = [
        listing.brand,
        listing.screen ? `${listing.screen}"` : null,
        listing.ramGb ? `${listing.ramGb}GB RAM` : null,
        listing.storageGb ? `${listing.storageGb}GB` : null,
        listing.condition
      ];
    } else if (category === "electronics") {
      specs = [listing.subcategory, listing.brand, listing.condition];
    } else if (category === "phones") {
      specs = [listing.subcategory, listing.brand, listing.condition, listing.storageGb ? `${listing.storageGb}GB` : null, listing.unlocked ? "Unlocked" : null];
    }
    muted.textContent = specs.filter(Boolean).join(" · ") || "Details parsed from listing";
  }

  // Vehicle details grid (adapt icons/cards per category)
  const detailCardGrid = document.querySelector("#detail-card-grid");
  const detailCardHeading = document.querySelector("#detail-card-heading");
  if (detailCardHeading) detailCardHeading.textContent = category === "cars" ? "Vehicle details" : category === "housing" ? "Apartment details" : category === "phones" ? "Phone specs" : "Product specs";
  if (detailCardGrid) {
    let cards = [];
    if (category === "cars") {
      cards = [
        { icon: "i-car", label: "Year", value: listing.year || "n/a" },
        { icon: "i-gauge", label: "Mileage", value: listing.mileage ? `${Math.round(listing.mileage / 1000)}k mi` : "n/a" },
        { icon: "i-tag", label: "Transmission", value: listing.transmission || "n/a" },
        { icon: "i-fuel", label: "Fuel", value: listing.fuel || "n/a" },
        { icon: "i-car", label: "Body", value: listing.body || "n/a" },
        { icon: "i-map", label: "Drive", value: listing.drive || "n/a" },
        { icon: "i-shield", label: "Title", value: listing.titleStatus || "n/a" },
        { icon: "i-map", label: "Location", value: listing.location || "n/a" }
      ];
    } else if (category === "housing") {
      cards = [
        { icon: "i-home", label: "Bedrooms", value: listing.bedrooms !== undefined ? `${listing.bedrooms}` : "n/a" },
        { icon: "i-building", label: "Bathrooms", value: listing.bathrooms ? `${listing.bathrooms}` : "n/a" },
        { icon: "i-tag", label: "Type", value: listing.listingType || "n/a" },
        { icon: "i-id", label: "Lease", value: listing.leaseTerm || "n/a" },
        { icon: "i-shield", label: "Furnished", value: listing.furnished ? "Yes" : "No" },
        { icon: "i-check", label: "Price", value: formatPrice(listing.price) },
        { icon: "i-map", label: "Location", value: listing.location || "n/a" },
        { icon: "i-building", label: "Sq. Ft.", value: listing.sqft ? `${listing.sqft}` : "n/a" }
      ];
    } else if (category === "computers") {
      cards = [
        { icon: "i-laptop", label: "Brand", value: listing.brand || "n/a" },
        { icon: "i-tag", label: "Year", value: listing.year || "n/a" },
        { icon: "i-tag", label: "Screen", value: listing.screen ? `${listing.screen}"` : "n/a" },
        { icon: "i-gauge", label: "RAM", value: listing.ramGb ? `${listing.ramGb} GB` : "n/a" },
        { icon: "i-id", label: "Storage", value: listing.storageGb ? `${listing.storageGb} GB` : "n/a" },
        { icon: "i-shield", label: "Condition", value: listing.condition || "n/a" },
        { icon: "i-tag", label: "Subcategory", value: listing.subcategory || "n/a" },
        { icon: "i-map", label: "Location", value: listing.location || "n/a" }
      ];
    } else if (category === "electronics") {
      cards = [
        { icon: "i-headphones", label: "Type", value: listing.subcategory || "n/a" },
        { icon: "i-tag", label: "Brand", value: listing.brand || "n/a" },
        { icon: "i-shield", label: "Condition", value: listing.condition || "n/a" },
        { icon: "i-check", label: "Price", value: formatPrice(listing.price) },
        { icon: "i-map", label: "Location", value: listing.location || "n/a" },
        { icon: "i-tag", label: "Category", value: "Electronics" }
      ];
    } else if (category === "phones") {
      cards = [
        { icon: "i-smartphone", label: "Type", value: listing.subcategory || "n/a" },
        { icon: "i-tag", label: "Brand", value: listing.brand || "n/a" },
        { icon: "i-id", label: "Storage", value: listing.storageGb ? `${listing.storageGb} GB` : "n/a" },
        { icon: "i-sim", label: "Unlocked", value: listing.unlocked ? "Yes" : (listing.unlocked === false ? "Carrier" : "n/a") },
        { icon: "i-shield", label: "Condition", value: listing.condition || "n/a" },
        { icon: "i-map", label: "Location", value: listing.location || "n/a" }
      ];
    }
    detailCardGrid.innerHTML = cards.map((card) => `
      <div class="detail-card">
        <svg class="icon"><use href="#${card.icon}"></use></svg>
        <span>${card.label}</span>
        <strong>${escapeHtml(String(card.value))}</strong>
      </div>
    `).join("");
  }

  // Vehicle history section
  const vinLabel = document.querySelector("#detail-vin-label");
  const vinText = document.querySelector("#detail-vin-text");
  const historySection = document.querySelector(".vehicle-history");
  if (vinLabel) vinLabel.textContent = `Listing ID: ${listing.id.replace(/^(car|housing|computer|electronics|phones)-/, "")}`;
  if (vinText) {
    if (category === "cars") {
      vinText.textContent = "VIN and vehicle history are not included in Craigslist search results. Open the original listing to verify before contacting the seller.";
    } else if (category === "housing") {
      vinText.textContent = "Lease terms, deposit requirements, and broker fees should be verified directly with the landlord or agent via the original listing.";
    } else if (category === "computers") {
      vinText.textContent = "Serial number, warranty status, and full specifications should be confirmed with the seller via the original listing.";
    } else if (category === "electronics") {
      vinText.textContent = "Model number, condition, and accessories should be confirmed with the seller via the original listing.";
    } else if (category === "phones") {
      vinText.textContent = "IMEI/ESN, carrier unlock status, and battery health should be confirmed with the seller via the original listing.";
    } else {
      vinText.textContent = "Serial number, warranty status, and full specifications should be confirmed with the seller via the original listing.";
    }
  }
  // Update the "From source" badge
  if (historySection) {
    const badge = historySection.querySelector(".badge");
    if (badge) badge.textContent = category === "cars" ? "VIN available" : "Source listing";
  }

  // Seller profile (works for all categories)
  const sellerName = document.querySelector("#seller-name");
  const sellerAvatar = document.querySelector("#seller-avatar");
  const sellerRating = document.querySelector("#seller-rating");
  const sellerMeta = document.querySelector("#seller-meta");
  const sellerPriceValue = document.querySelector("#seller-price-value");
  const sellerNoteText = document.querySelector("#seller-note-text");
  const sellerNoteSection = document.querySelector("#seller-note-section");

  // Category-specific heading for seller note
  if (sellerNoteSection) {
    const heading = sellerNoteSection.querySelector("h2");
    if (heading) {
      heading.textContent = category === "cars" ? "Seller's note"
        : category === "housing" ? "Landlord's note"
        : "Seller's note";
    }
  }

  // Generate a consistent seller name per listing ID
  const seed = listing.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const firstNames = ["Marcus", "James", "Sarah", "Alex", "Jessica", "David", "Emily", "Michael", "Rachel", "Chris", "Amanda", "Daniel", "Sophie", "Tom", "Lena", "Omar", "Priya", "Carlos", "Yuki", "Fiona"];
  const lastNames = ["J.", "K.", "R.", "M.", "W.", "P.", "C.", "D.", "A.", "L.", "S.", "B.", "G.", "T.", "N.", "H.", "F.", "Z.", "I.", "O."];
  const name = `${firstNames[seed % firstNames.length]} ${lastNames[seed % lastNames.length]}`;
  const initials = sellerInitials(name);
  const rating = (4 + (seed % 10) / 10).toFixed(1);
  const year = 2017 + (seed % 6);
  const sales = 10 + (seed % 40);

  if (sellerName) sellerName.textContent = name;
  if (sellerAvatar) sellerAvatar.textContent = initials;
  if (sellerRating) sellerRating.innerHTML = `&#9733; ${rating}`;
  if (sellerMeta) sellerMeta.textContent = `member since ${year} · ${sales} completed sales`;
  if (sellerPriceValue) sellerPriceValue.innerHTML = formatPrice(listing.price, category === "housing" ? "/mo" : "");

  // Seller note text per category
  if (sellerNoteText) {
    if (category === "cars") {
      sellerNoteText.textContent = `This ${listing.year || ""} ${listing.make || ""} ${listing.model || ""} is well-maintained with ${listing.mileage ? `${listing.mileage.toLocaleString()} miles` : "service records available"}. ${listing.transmission || ""} transmission, ${listing.fuel || "gas"} engine, and a ${listing.titleStatus || "clean"} title. Open the original listing to verify details and contact the seller.`;
    } else if (category === "housing") {
      const amenitiesList = (listing.amenities || []).join(", ");
      sellerNoteText.textContent = `This ${listing.bedrooms !== undefined ? `${listing.bedrooms}-bedroom` : ""} ${listing.listingType || "apartment"} in ${listing.location || "New York"} is available for ${listing.leaseTerm || "lease"}. ${listing.furnished ? "Furnished unit. " : ""}${amenitiesList ? `Amenities include ${amenitiesList}. ` : ""}Contact the landlord to schedule a viewing and verify lease terms.`;
    } else if (category === "electronics") {
      sellerNoteText.textContent = `This ${listing.brand || ""} ${listing.subcategory || "electronic device"} is in ${listing.condition || "good"} condition. ${listing.subcategory === "Headphones" ? "Includes original accessories where available. " : ""}${listing.subcategory === "Audio" ? "Test with your own source before purchase. " : ""}${listing.subcategory === "TV & video" ? "Verify screen condition and included cables. " : ""}Open the original listing to verify details and contact the seller.`;
    } else if (category === "phones") {
      const unlockInfo = listing.unlocked ? "Fully unlocked and ready for any carrier. " : (listing.unlocked === false ? "Carrier-locked; verify compatibility with your provider. " : "");
      sellerNoteText.textContent = `This ${listing.brand || ""} ${listing.subcategory || "phone"}${listing.storageGb ? ` with ${listing.storageGb}GB storage` : ""} is in ${listing.condition || "good"} condition. ${unlockInfo}Open the original listing to confirm IMEI/ESN, battery health, and contact the seller.`;
    } else {
      sellerNoteText.textContent = `This ${listing.brand || ""} ${listing.subcategory || "device"} (${listing.year || "year n/a"}) is in ${listing.condition || "good"} condition with ${listing.ramGb || ""}${listing.ramGb ? "GB RAM, " : ""}${listing.storageGb ? `${listing.storageGb}GB storage` : "storage available"}. Open the original listing to verify specs and contact the seller.`;
    }
  }

  // CTA button
  const cta = document.querySelector("#seller-cta-btn");
  if (cta) {
    if (category === "housing") {
      cta.innerHTML = '<svg class="icon"><use href="#i-mail"></use></svg> Contact Landlord';
    } else {
      cta.innerHTML = '<svg class="icon"><use href="#i-mail"></use></svg> Contact Seller';
    }
    cta.onclick = () => {
      if (listing.url) window.open(listing.url, "_blank", "noopener");
    };
  }

  // View report / source button
  const reportBtn = document.querySelector("#view-report-btn");
  if (reportBtn) {
    reportBtn.textContent = category === "cars" ? "View on Craigslist" : "View original listing";
    reportBtn.onclick = () => {
      if (listing.url) window.open(listing.url, "_blank", "noopener");
    };
  }

  // Highlights / badges per category
  const highlights = document.querySelector("#detail-highlights");
  if (highlights) {
    let chips = [];
    if (category === "cars") {
      chips = [
        listing.titleStatus === "Clean" ? '✓ Clean title' : null,
        listing.mileage && listing.mileage < 50000 ? '✓ Low miles' : null,
        listing.mileage && listing.mileage < 100000 ? '✓ Under 100k mi' : null,
        listing.drive || null,
        listing.transmission || null
      ];
    } else if (category === "housing") {
      chips = [
        listing.listingType || null,
        listing.furnished ? "Furnished" : null,
        listing.leaseTerm || null,
        ...(listing.amenities || []).slice(0, 2)
      ];
    } else if (category === "computers") {
      chips = [
        listing.brand || null,
        listing.condition || null,
        listing.screen ? `${listing.screen}"` : null,
        listing.ramGb ? `${listing.ramGb}GB` : null,
        listing.storageGb ? `${listing.storageGb}GB` : null
      ];
    } else if (category === "electronics") {
      chips = [
        listing.subcategory || null,
        listing.brand || null,
        listing.condition || null
      ];
    } else if (category === "phones") {
      chips = [
        listing.subcategory || null,
        listing.brand || null,
        listing.storageGb ? `${listing.storageGb}GB` : null,
        listing.unlocked ? "Unlocked" : null,
        listing.condition || null
      ];
    }
    chips = chips.filter(Boolean);
    if (!chips.length) chips.push("Verified listing");
    highlights.innerHTML = chips.slice(0, 5).map((chip) => `<span class="badge badge-green">${escapeHtml(chip)}</span>`).join("");
  }

  // Safety banner — adapt header per category
  const safetyBanner = document.querySelector(".safety-banner");
  if (safetyBanner) {
    if (category === "housing") {
      safetyBanner.innerHTML = `
        <div><strong>Tour the unit in person</strong><span>Never pay before seeing the apartment.</span></div>
        <div><strong>Verify lease terms</strong><span>Read the lease before signing or paying.</span></div>
        <div><strong>Watch for scams</strong><span>No deposits without a signed lease.</span></div>
      `;
    } else if (category === "computers") {
      safetyBanner.innerHTML = `
        <div><strong>Meet in a public place</strong><span>Use a cafe or transit station.</span></div>
        <div><strong>Test before you buy</strong><span>Boot up, check screen, test keyboard.</span></div>
        <div><strong>Use cash in person</strong><span>Avoid wiring money or deposits.</span></div>
      `;
    } else if (category === "electronics") {
      safetyBanner.innerHTML = `
        <div><strong>Test before buying</strong><span>Check speakers, screens, and inputs.</span></div>
        <div><strong>Meet in a public place</strong><span>Use a cafe or well-lit street.</span></div>
        <div><strong>Verify authenticity</strong><span>Check serial numbers for brand items.</span></div>
      `;
    } else if (category === "phones") {
      safetyBanner.innerHTML = `
        <div><strong>Verify IMEI/ESN</strong><span>Check it's not blacklisted or stolen.</span></div>
        <div><strong>Test before buying</strong><span>Check screen, cameras, buttons, battery.</span></div>
        <div><strong>Meet at carrier store</strong><span>Verify unlock status in person.</span></div>
      `;
    } else {
      safetyBanner.innerHTML = `
        <div><strong>Meet in a public place</strong><span>Use busy daylight pickup spots.</span></div>
        <div><strong>Verify paperwork</strong><span>Match VIN, title, and seller ID.</span></div>
        <div><strong>Avoid payment pressure</strong><span>No wires or deposits before inspection.</span></div>
      `;
    }
  }

  // Set the main photo
  const art = document.querySelector("#detail-art");
  if (art) setMainPhoto(0);

  // Thumbnails + gallery nav arrows
  const gallery = document.querySelector(".detail-gallery");
  const thumbs = document.querySelector("#detail-thumbs");
  const navLeft = gallery?.querySelector(".gallery-nav-left");
  const navRight = gallery?.querySelector(".gallery-nav-right");
  const counter = document.querySelector("#detail-photo-counter");

  if (thumbs) {
    thumbs.innerHTML = detailGalleryPhotos.slice(0, 8).map((photo, i) => `
      <button class="thumb ${i === 0 ? 'is-selected' : ''}" type="button" data-photo-index="${i}">
        <span class="visual-art ${photo.type === "real" ? "real-photo" : photo.url}" style="${photo.type === "real" ? `--photo: url('${escapeHtml(photo.url)}')` : ""}"></span>
      </button>
    `).join("");
  }

  if (counter) counter.textContent = `1 / ${detailGalleryPhotos.length}`;

  // Wire up thumb clicks
  thumbs?.querySelectorAll(".thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      const index = parseInt(thumb.dataset.photoIndex, 10);
      setMainPhoto(index);
    });
  });

  // Wire up nav arrows
  if (navLeft) {
    navLeft.onclick = () => setMainPhoto(detailGalleryIndex - 1);
  }
  if (navRight) {
    navRight.onclick = () => setMainPhoto(detailGalleryIndex + 1);
  }

  // Lightbox
  const lightbox = document.querySelector("#lightbox");
  const lightboxImg = document.querySelector("#lightbox-image");
  const lightboxCounter = document.querySelector("#lightbox-counter");
  const lightboxOverlay = document.querySelector("#lightbox-overlay");
  const lightboxClose = document.querySelector(".lightbox-close");
  const lightboxNavLeft = document.querySelector(".lightbox-nav-left");
  const lightboxNavRight = document.querySelector(".lightbox-nav-right");

  let lbPhotos = [...detailGalleryPhotos];
  let lbIndex = 0;

  function updateLightboxImage(index) {
    const idx = Math.max(0, Math.min(index, lbPhotos.length - 1));
    lbIndex = idx;
    const photo = lbPhotos[idx];
    if (photo.type === "real") {
      lightboxImg.src = photo.url;
      lightboxImg.alt = "Photo enlarged";
    } else {
      lightboxImg.src = "";
      lightboxImg.alt = "Decorative illustration";
    }
    if (lightboxCounter) lightboxCounter.textContent = `${idx + 1} / ${lbPhotos.length}`;
  }

  function openLightbox(index) {
    if (!lightbox || !lightboxImg) return;
    lbPhotos = [...detailGalleryPhotos];
    updateLightboxImage(index);
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  const mainArt = document.querySelector("#detail-art");
  if (mainArt) {
    mainArt.style.cursor = "pointer";
    mainArt.addEventListener("click", () => openLightbox(detailGalleryIndex));
  }

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightboxOverlay) lightboxOverlay.addEventListener("click", closeLightbox);

  if (lightboxNavLeft) {
    lightboxNavLeft.onclick = () => updateLightboxImage(lbIndex - 1);
  }
  if (lightboxNavRight) {
    lightboxNavRight.onclick = () => updateLightboxImage(lbIndex + 1);
  }

  // Keyboard handler for lightbox only
  document.removeEventListener("keydown", window._lbKeydown);
  window._lbKeydown = function lbKeydown(e) {
    if (!lightbox?.classList.contains("is-open")) return;
    if (e.key === "Escape") { closeLightbox(); e.preventDefault(); return; }
    if (e.key === "ArrowLeft") { updateLightboxImage(lbIndex - 1); e.preventDefault(); }
    if (e.key === "ArrowRight") { updateLightboxImage(lbIndex + 1); e.preventDefault(); }
  };
  document.addEventListener("keydown", window._lbKeydown);
}

function renderAll() {
  renderHomeListings();
  renderMiniListings();
  renderCarFilters();
  renderHousingFilters();
  renderComputerFilters();
  renderElectronicsFilters();
  renderPhonesFilters();
  renderDetail();
}

async function loadListings() {
  const normalizePayload = (payload, fallbackMode = "seed") => {
    if (Array.isArray(payload) && payload.length) {
      return { generatedAt: "local", mode: fallbackMode, source: "Local listings.json", listings: payload };
    }
    if (Array.isArray(payload?.listings) && payload.listings.length) return payload;
    return null;
  };
  const isHttp = window.location.protocol.startsWith("http");
  const sources = isHttp ? ["/api/listings", "data/listings.json"] : ["data/listings.json"];
  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: "no-store" });
      if (response.ok) {
        const payload = normalizePayload(await response.json(), source.includes("api") ? "live" : "seed");
        if (payload) return payload;
      }
    } catch {
      // Fall through to the next source or embedded seed.
    }
  }
  return fallbackData;
}

routeLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    goToRoute(link.dataset.routeLink);
  });
});

document.addEventListener("click", (event) => {
  const detailLink = event.target.closest("[data-detail-id]");
  if (detailLink) {
    appState.selectedDetailId = detailLink.dataset.detailId;
    appState.selectedDetailCategory = detailLink.dataset.detailCategory || "cars";
    localStorage.setItem("better-cl-selected-detail-id", appState.selectedDetailId);
    localStorage.setItem("better-cl-selected-detail-category", appState.selectedDetailCategory);
    goToRoute("detail");
  }
});

window.addEventListener("hashchange", () => {
  goToRoute(currentRoute());
});

document.querySelector("#home-search")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = document.querySelector("#home-query").value.trim();
  if (!query) return;
  performSearch(query);
  renderSearchResults();
  goToRoute("search");
});

carMakeSelect?.addEventListener("change", (event) => {
  replaceFilterGroup(carFilters, carFilterSets.makes, event.target.value, ["Any make"]);
  replaceFilterGroup(carFilters, carFilterSets.models, "Any model", ["Any model"]);
  renderCarFilters();
});

carModelSelect?.addEventListener("change", (event) => {
  replaceFilterGroup(carFilters, carFilterSets.models, event.target.value, ["Any model"]);
  renderCarFilters();
});

carSortSelect?.addEventListener("change", renderCarFilters);

// Car range filter inputs
[carYearFrom, carYearTo, carPriceMin, carPriceMax].forEach((el) => {
  el?.addEventListener("change", () => {
    carRangeFilters.yearFrom = carYearFrom?.value ? Number(carYearFrom.value) : null;
    carRangeFilters.yearTo = carYearTo?.value ? Number(carYearTo.value) : null;
    carRangeFilters.priceMin = carPriceMin?.value ? Number(carPriceMin.value) : null;
    carRangeFilters.priceMax = carPriceMax?.value ? Number(carPriceMax.value) : null;
    renderCarFilters();
  });
});

document.querySelector("[data-car-group='body']")?.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip) return;
  replaceFilterGroup(carFilters, carFilterSets.bodies, chip.dataset.value);
  renderCarFilters();
});

document.querySelectorAll("[data-car-group='color'] .swatch").forEach((swatch) => {
  swatch.addEventListener("click", () => {
    if (carFilters.has(swatch.dataset.value)) {
      carFilters.delete(swatch.dataset.value);
    } else {
      replaceFilterGroup(carFilters, carFilterSets.colors, swatch.dataset.value);
    }
    renderCarFilters();
  });
});

carActiveFilters?.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-car]");
  if (!removeButton) return;
  carFilters.delete(removeButton.dataset.removeCar);
  renderCarFilters();
});

document.querySelector("#housing")?.addEventListener("click", (event) => {
  const control = event.target.closest("[data-housing-filter]");
  if (!control) return;
  const value = control.dataset.housingFilter;
  if (housingListingTypes.includes(value)) {
    // Toggle within listing type group
    if (housingFilters.has(value)) housingFilters.delete(value);
    else replaceFilterGroup(housingFilters, housingListingTypes, value);
  } else if (housingBedroomValues.includes(value)) {
    // Toggle within bedroom group
    if (housingFilters.has(value)) housingFilters.delete(value);
    else replaceFilterGroup(housingFilters, housingBedroomValues, value);
  } else if (housingFurnishedValues.includes(value)) {
    if (housingFilters.has(value)) housingFilters.delete(value);
    else replaceFilterGroup(housingFilters, housingFurnishedValues, value);
  } else if (housingLeaseValues.includes(value)) {
    // Toggle within lease term group
    if (housingFilters.has(value)) housingFilters.delete(value);
    else replaceFilterGroup(housingFilters, housingLeaseValues, value);
  } else if (housingFilters.has(value)) {
    housingFilters.delete(value);
  } else {
    housingFilters.add(value);
  }
  renderHousingFilters();
});

housingSortSelect?.addEventListener("change", renderHousingFilters);

// Housing rent range inputs
[housingRentMin, housingRentMax].forEach((el) => {
  el?.addEventListener("change", () => {
    housingRanges.rentMin = housingRentMin?.value ? Number(housingRentMin.value) : null;
    housingRanges.rentMax = housingRentMax?.value ? Number(housingRentMax.value) : null;
    renderHousingFilters();
  });
});

housingLocation?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const location = normalizeLocation(event.target.value);
  if (location) housingFilters.add(location);
  renderHousingFilters();
});

housingLocation?.addEventListener("blur", (event) => {
  const location = normalizeLocation(event.target.value);
  if (location) housingFilters.add(location);
  renderHousingFilters();
});

housingActiveFilters?.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-housing]");
  if (!removeButton) return;
  housingFilters.delete(removeButton.dataset.removeHousing);
  renderHousingFilters();
});

computerTabs?.addEventListener("click", (event) => {
  const tab = event.target.closest("button");
  if (!tab) return;
  const value = tab.textContent.trim();
  // Toggle: if already selected, remove it; otherwise add it
  if (computerFilters.tabs.has(value)) {
    computerFilters.tabs.delete(value);
  } else {
    computerFilters.tabs.add(value);
  }
  renderComputerFilters();
});

computerBrandSelect?.addEventListener("change", (event) => {
  computerFilters.brand = event.target.value;
  renderComputerFilters();
});

computerScreenGroup?.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip) return;
  const value = chip.dataset.value || chip.textContent.trim();
  // Toggle: if already selected, reset to "Any size"
  if (computerFilters.screen === value) {
    computerFilters.screen = "Any size";
  } else {
    computerFilters.screen = value;
  }
  renderComputerFilters();
});

computerSpecSelects.forEach((select, index) => {
  select.addEventListener("change", () => {
    const keys = ["year", "ram", "storage", "condition"];
    computerFilters[keys[index]] = select.value;
    renderComputerFilters();
  });
});

computerSortSelect?.addEventListener("change", renderComputerFilters);

// Computer year/price range inputs
[computerYearFrom, computerYearTo, computerPriceMin, computerPriceMax].forEach((el) => {
  el?.addEventListener("change", () => {
    computerFilters.yearFrom = computerYearFrom?.value ? Number(computerYearFrom.value) : null;
    computerFilters.yearTo = computerYearTo?.value ? Number(computerYearTo.value) : null;
    computerFilters.priceMin = computerPriceMin?.value ? Number(computerPriceMin.value) : null;
    computerFilters.priceMax = computerPriceMax?.value ? Number(computerPriceMax.value) : null;
    renderComputerFilters();
  });
});

document.querySelectorAll(".exclude-box input").forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    const label = checkbox.closest("label")?.textContent.trim();
    if (label) computerFilters.excludes[label] = checkbox.checked;
    renderComputerFilters();
  });
});

document.querySelector("#computers .listing-list")?.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-compare-id]");
  if (!checkbox) return;
  if (checkbox.checked) appState.compareIds.add(checkbox.dataset.compareId);
  else appState.compareIds.delete(checkbox.dataset.compareId);
  renderComputerFilters();
});



/* ── Electronics Event Listeners ── */

document.querySelector("#electronics")?.addEventListener("click", (event) => {
  const subChip = event.target.closest("[data-electronics-sub]");
  if (subChip) {
    const value = subChip.dataset.electronicsSub;
    electronicsFilters.subcategory = electronicsFilters.subcategory === value ? null : value;
    renderElectronicsFilters();
  }
  const condChip = event.target.closest("[data-electronics-condition]");
  if (condChip) {
    const value = condChip.dataset.electronicsCondition;
    electronicsFilters.condition = electronicsFilters.condition === value ? null : value;
    renderElectronicsFilters();
  }
});

electronicsBrandSelect?.addEventListener("change", (event) => {
  electronicsFilters.brand = event.target.value;
  renderElectronicsFilters();
});

electronicsSortSelect?.addEventListener("change", renderElectronicsFilters);

// Electronics price range inputs
[electronicsPriceMin, electronicsPriceMax].forEach((el) => {
  el?.addEventListener("change", () => {
    electronicsFilters.priceMin = electronicsPriceMin?.value ? Number(electronicsPriceMin.value) : null;
    electronicsFilters.priceMax = electronicsPriceMax?.value ? Number(electronicsPriceMax.value) : null;
    renderElectronicsFilters();
  });
});

/* ── Phones Event Listeners ── */

document.querySelector("#phones")?.addEventListener("click", (event) => {
  const subChip = event.target.closest("[data-phones-sub]");
  if (subChip) {
    const value = subChip.dataset.phonesSub;
    phoneFilters.subcategory = phoneFilters.subcategory === value ? null : value;
    renderPhonesFilters();
  }
  const storageChip = event.target.closest("[data-phones-storage]");
  if (storageChip) {
    const value = storageChip.dataset.phonesStorage;
    phoneFilters.storage = phoneFilters.storage === value ? null : value;
    renderPhonesFilters();
  }
  const unlockedChip = event.target.closest("[data-phones-unlocked]");
  if (unlockedChip) {
    const value = unlockedChip.dataset.phonesUnlocked;
    phoneFilters.unlocked = String(phoneFilters.unlocked) === value ? null : value === "true";
    renderPhonesFilters();
  }
  const condChip = event.target.closest("[data-phones-condition]");
  if (condChip) {
    const value = condChip.dataset.phonesCondition;
    phoneFilters.condition = phoneFilters.condition === value ? null : value;
    renderPhonesFilters();
  }
});

phoneBrandSelect?.addEventListener("change", (event) => {
  phoneFilters.brand = event.target.value;
  renderPhonesFilters();
});

phoneSortSelect?.addEventListener("change", renderPhonesFilters);

// Phones price range inputs
[phonePriceMin, phonePriceMax].forEach((el) => {
  el?.addEventListener("change", () => {
    phoneFilters.priceMin = phonePriceMin?.value ? Number(phonePriceMin.value) : null;
    phoneFilters.priceMax = phonePriceMax?.value ? Number(phonePriceMax.value) : null;
    renderPhonesFilters();
  });
});

// Keyboard navigation for detail gallery (only when lightbox is NOT open)
document.addEventListener("keydown", (event) => {
  const detailPage = document.querySelector("#detail.is-active");
  const lightbox = document.querySelector("#lightbox");
  if (!detailPage) return;
  // Skip if lightbox is open — it has its own keyboard handler
  if (lightbox?.classList.contains("is-open")) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    setMainPhoto(detailGalleryIndex - 1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    setMainPhoto(detailGalleryIndex + 1);
  }
});

loadListings().then((payload) => {
  appState.data = payload;
  appState.listings = payload.listings;
  deriveFilterOptionsFromData();
  renderAll();
  goToRoute(currentRoute());
});

/* ── Dark Mode Toggle ── */

function applyTheme(dark) {
  document.documentElement.classList.toggle("dark", dark);
  const btn = document.querySelector(".theme-toggle");
  if (btn) {
    btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    btn.setAttribute("title", dark ? "Switch to light mode" : "Switch to dark mode");
  }
}

function initTheme() {
  // 1. Manual preference takes priority
  const stored = localStorage.getItem("better-cl-theme");
  if (stored === "dark" || stored === "light") {
    applyTheme(stored === "dark");
    return;
  }
  // 2. Fall back to system preference
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(prefersDark);
}

document.addEventListener("click", (event) => {
  const toggle = event.target.closest(".theme-toggle");
  if (!toggle) return;
  const isDark = document.documentElement.classList.contains("dark");
  const next = !isDark;
  applyTheme(next);
  localStorage.setItem("better-cl-theme", next ? "dark" : "light");
});

initTheme();
