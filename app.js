const pages = Array.from(document.querySelectorAll("[data-page]"));
const routeLinks = Array.from(document.querySelectorAll("[data-route-link]"));

const fallbackData = {
  generatedAt: null,
  mode: "empty",
  source: "No embedded mock data. Listings load from data/listings.json or /api/listings.",
  listings: []
};

const appState = {
  data: fallbackData,
  listings: fallbackData.listings,
  selectedDetailId: localStorage.getItem("better-cl-selected-detail-id") || "car-7939679011",
  selectedDetailCategory: localStorage.getItem("better-cl-selected-detail-category") || "cars",
  compareIds: new Set(["computer-7910839552", "computer-7939653842"])
};

let carModelsByMake = {
  "Any make": ["Any model"]
};

let carFilterSets = {
  makes: ["Any make", "BMW", "Toyota", "Honda", "Ford"],
  models: ["Any model", "X3", "X5", "Civic", "Rogue", "GLC 300"],
  years: ["Any year", "Before 2020", "2020 or newer", "2016 or newer"],
  colors: ["Black", "White", "Silver", "Blue", "Red", "Green", "Tan", "Gray"],
  bodies: ["SUV", "Sedan", "Wagon"]
};

const carFilters = new Set([]);
const carActiveFilters = document.querySelector("#car-active-filters");
const carMakeSelect = document.querySelector("#car-make");
const carModelSelect = document.querySelector("#car-model");
const carYearSelect = document.querySelector("#car-year");
const carSortSelect = document.querySelector("#cars [aria-label='Sort car listings']");

const housingDefaults = [];
const housingActiveFilters = document.querySelector("#housing-active-filters");
const housingPrice = document.querySelector("#housing-price");
const housingLocation = document.querySelector("#housing-location");
const housingSortSelect = document.querySelector(".sort-select");
const housingKnownPrices = ["Under $2,500", "Under $3,000", "Any price"];
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
  tab: null,
  brand: "Any brand",
  screen: "Any size",
  year: "Any year",
  ram: "Any RAM",
  storage: "Any storage",
  condition: "Any condition",
  maxPrice: Infinity,
  excludes: {
    Cases: false,
    Keyboards: false,
    Repair: false
  }
};

const computerBrandSelect = document.querySelector("#computer-brand");
const computerSortSelect = document.querySelector("#computers [aria-label='Sort computer listings']");
const computerSpecSelects = Array.from(document.querySelectorAll("#computers .select-grid select"));
const computerTabs = document.querySelector(".computer-tabs");
const computerScreenGroup = document.querySelector("#computers .filter-panel .chip-group");
const computerActiveFilters = document.querySelector("#computers .active-filters");
const compareButton = document.querySelector("#compare-button");

const categoryMeta = {
  cars: { label: "Cars & trucks", nav: "cars", art: "art-car", icon: "i-car" },
  housing: { label: "Housing / apartments", nav: "housing", art: "art-apartment", icon: "i-home", suffix: "/mo" },
  electronics: { label: "Electronics", nav: "electronics", art: "art-dashboard", icon: "i-tag" },
  computers: { label: "Computers", nav: "computers", art: "art-laptop", icon: "i-laptop" },
  phones: { label: "Phones", nav: "phones", art: "light-laptop", icon: "i-id" }
};
const goodsCategories = ["electronics", "phones"];
const goodsSortSelects = Object.fromEntries(goodsCategories.map((category) => [
  category,
  document.querySelector(`#${category} [aria-label='Sort ${category} listings']`)
]));
const goodsFilterState = {
  electronics: {
    subcategory: "All electronics",
    brand: "Any brand",
    condition: "Any condition"
  },
  phones: {
    itemType: "All phone listings",
    subcategory: "All phone categories",
    brand: "Any brand",
    condition: "Any condition"
  }
};

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

function metaForCategory(category) {
  return categoryMeta[category] || { label: "Craigslist listing", nav: category || "home", art: "art-dashboard", icon: "i-tag" };
}

function artForListing(listing) {
  if (listing.category === "cars") return listing.body === "Truck" ? "art-truck" : listing.color === "Silver" ? "silver-car" : "art-car";
  if (listing.category === "housing") return listing.bedrooms === 0 ? "art-loft" : listing.bedrooms >= 2 ? "art-townhouse" : "art-apartment";
  if (listing.category === "computers") return listing.subcategory === "Accessories" ? "light-laptop" : "art-laptop";
  return metaForCategory(listing.category).art;
}

function detailLinkAttrs(listing) {
  return `href="#detail" data-detail-id="${escapeHtml(listing.id)}" data-detail-category="${escapeHtml(listing.category)}"`;
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
  if (category === "computers") {
    score += valueScore(listing);
  }
  if (category === "electronics" || category === "phones") {
    if (listing.image) score += 2;
    if (listing.price) score += Math.max(0, 5 - Math.log10(listing.price + 1));
    if (listing.condition === "New" || listing.condition === "Excellent") score += 2;
    if (listing.brand) score += 1;
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
    .map((value) => `<button type="button" data-housing-filter="${escapeHtml(value)}">${escapeHtml(value)}</button>`)
    .join("");
}

function renderComputerOptionControls() {
  if (computerTabs) {
    computerTabs.innerHTML = computerFilterSets.tabs
      .map((tab) => `<button class="${tab === computerFilters.tab ? "is-selected" : ""}" type="button">${escapeHtml(tab)}</button>`)
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
  const activeYear = Array.from(carFilters).find((filter) => carFilterSets.years.includes(filter)) || "Any year";
  if (carMakeSelect) setSelectOptions(carMakeSelect, carFilterSets.makes, activeMake);
  updateCarModelOptions(activeMake);
  if (carYearSelect) carYearSelect.value = activeYear;
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
    if (filter === "Any make" || filter === "Any model" || filter === "Any year") continue;
    if (carFilterSets.makes.includes(filter) && lower(listing.make) !== lower(filter) && !textIncludes(listing, filter)) return false;
    if (carFilterSets.models.includes(filter) && lower(listing.model) !== lower(filter) && !textIncludes(listing, filter)) return false;
    if (carFilterSets.bodies.includes(filter) && lower(listing.body) !== lower(filter) && !textIncludes(listing, filter)) return false;
    if (carFilterSets.colors.includes(filter) && listing.color && lower(listing.color) !== lower(filter)) return false;
    if (carFilterSets.colors.includes(filter) && !listing.color && !textIncludes(listing, filter)) return false;
    if (filter === "Before 2020" && listing.year && listing.year >= 2020) return false;
    if (filter === "2020 or newer" && listing.year && listing.year < 2020) return false;
    if (filter === "2016 or newer" && listing.year && listing.year < 2016) return false;
  }
  return true;
}

function carCard(listing) {
  const sourceBadge = appState.data.mode === "live" ? "Live Craigslist" : "Seeded Craigslist";
  return `
    <article class="listing-card horizontal">
      <div class="visual-art ${photoClass(listing, listing.body === "Truck" ? "art-truck" : listing.color === "Silver" ? "silver-car" : "art-car")}"${photoStyle(listing)}></div>
      <div class="listing-body">
        <div class="listing-topline">
          <span class="year-badge">${escapeHtml(listing.year || "Year n/a")}</span>
          <span class="badge badge-green">${sourceBadge}</span>
        </div>
        <h3><a href="#detail" data-detail-id="${escapeHtml(listing.id)}">${escapeHtml(listing.title)}</a></h3>
        <p>${escapeHtml([listing.location, listing.mileage ? `${listing.mileage.toLocaleString()} miles` : null, listing.transmission, listing.body].filter(Boolean).join(" · "))}</p>
        <div class="listing-bottom">
          <span class="price">${formatPrice(listing.price)}</span>
          <a class="seller-rating" href="${escapeHtml(listing.url || "#")}" target="_blank" rel="noreferrer">Open source</a>
        </div>
      </div>
    </article>
  `;
}

function renderCarFilters() {
  if (!carActiveFilters) return;
  syncCarControls();
  carActiveFilters.innerHTML = Array.from(carFilters)
    .filter((filter) => !["Any make", "Any model", "Any year"].includes(filter))
    .map((filter) => filterChip(filter, "car"))
    .join("");
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
  if (housingPrice) {
    const activePrice = housingKnownPrices.find((price) => housingFilters.has(price));
    housingPrice.value = activePrice || "Any price";
  }
}

function bedroomLabel(value) {
  if (value === 0) return "Studio";
  if (value === 1) return "1 BR";
  if (value && value >= 4) return "4+ BR";
  return value ? `${value} BR` : "BR n/a";
}

function priceLimitFromFilter(filter) {
  if (!String(filter).startsWith("Under")) return null;
  const amount = String(filter).replace(/[^\d]/g, "");
  return amount ? Number(amount) : null;
}

function normalizedLease(value) {
  return lower(value).replace(" lease", "").trim();
}

function isKnownHousingFilter(filter) {
  return housingListingTypes.includes(filter)
    || housingBedroomValues.includes(filter)
    || housingFurnishedValues.includes(filter)
    || housingLeaseValues.includes(filter)
    || housingKnownPrices.includes(filter);
}

function matchesHousing(listing) {
  if (listing.category !== "housing") return false;
  for (const filter of housingFilters) {
    const priceLimit = priceLimitFromFilter(filter);
    if (housingListingTypes.includes(filter) && listing.listingType && lower(listing.listingType) !== lower(filter)) return false;
    if (housingBedroomValues.includes(filter) && bedroomLabel(listing.bedrooms) !== filter) return false;
    if (priceLimit && listing.price && listing.price > priceLimit) return false;
    if (filter === "Furnished" && listing.furnished !== true) return false;
    if (filter === "Unfurnished" && listing.furnished === true) return false;
    if (housingLeaseValues.includes(filter) && listing.leaseTerm && normalizedLease(listing.leaseTerm) !== normalizedLease(filter)) return false;
    if (!isKnownHousingFilter(filter) && !textIncludes(listing, filter)) return false;
  }
  return true;
}

function housingCard(listing) {
  const amenities = (listing.amenities || []).slice(0, 3);
  const noFee = lower(listing.title).includes("no fee") || amenities.some((item) => lower(item).includes("no fee"));
  return `
    <article class="listing-card horizontal apartment-card">
      <div class="visual-art ${photoClass(listing, listing.bedrooms === 0 ? "art-loft" : listing.bedrooms >= 2 ? "art-townhouse" : "art-apartment")}"${photoStyle(listing)}></div>
      <div class="listing-body">
        <div class="listing-topline">
          <span class="year-badge">${bedroomLabel(listing.bedrooms)}</span>
          <span class="badge ${noFee ? "badge-green" : ""}">${noFee ? "No fee" : "Craigslist source"}</span>
        </div>
        <h3><a href="#detail" data-detail-id="${escapeHtml(listing.id)}" data-detail-category="housing">${escapeHtml(listing.title)}</a></h3>
        <p>${escapeHtml([listing.location, listing.bathrooms ? `${listing.bathrooms} bath` : null, listing.leaseTerm].filter(Boolean).join(" · "))}</p>
        <div class="badge-row">
          ${amenities.map((item) => `<span class="badge">${escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="listing-bottom">
          <span class="price">${formatPrice(listing.price, "/mo")}</span>
          <a class="seller-rating" href="${escapeHtml(listing.url || "#")}" target="_blank" rel="noreferrer">Open source</a>
        </div>
      </div>
    </article>
  `;
}

function renderHousingFilters() {
  if (!housingActiveFilters) return;
  syncHousingControls();
  housingActiveFilters.innerHTML = Array.from(housingFilters).map((filter) => filterChip(filter, "housing")).join("");
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
  if (computerFilters.tab && listing.subcategory && lower(listing.subcategory) !== lower(computerFilters.tab)) return false;
  if (computerFilters.brand && computerFilters.brand !== "Any brand" && lower(listing.brand) !== lower(computerFilters.brand) && !textIncludes(listing, computerFilters.brand)) return false;
  if ((computerFilters.brand === "Apple") && !textIncludes(listing, "MacBook") && !textIncludes(listing, "Apple")) return false;
  if (listing.price && listing.price > computerFilters.maxPrice) return false;
  if (excludedComputer(listing)) return false;
  const selectedScreen = screenNumber(computerFilters.screen);
  if (selectedScreen && listing.screen && listing.screen !== selectedScreen) return false;
  const selectedYear = specMin(computerFilters.year);
  if (selectedYear && listing.year && listing.year < selectedYear) return false;
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
    <article class="listing-card horizontal compare-card ${compared ? "is-compared" : ""}">
      <label class="compare-check"><input type="checkbox" ${compared ? "checked" : ""} data-compare-id="${escapeHtml(listing.id)}" /> Compare</label>
      <div class="visual-art ${photoClass(listing, listing.subcategory === "Accessories" ? "light-laptop" : "art-laptop")}"${photoStyle(listing)}></div>
      <div class="listing-body">
        <div class="listing-topline">
          <span class="badge ${bestValue ? "badge-green" : ""}">${bestValue ? "Best value" : "Craigslist source"}</span>
          <span class="badge">${escapeHtml(listing.condition || "Condition n/a")}</span>
        </div>
        <h3><a href="#detail" data-detail-id="${escapeHtml(listing.id)}" data-detail-category="computers">${escapeHtml(listing.title)}</a></h3>
        <p>${escapeHtml([listing.brand, ...computerSpecs(listing)].filter(Boolean).join(" · "))}</p>
        <div class="badge-row">
          ${computerSpecs(listing).slice(0, 3).map((item) => `<span class="badge">${escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="listing-bottom">
          <span class="price">${formatPrice(listing.price)}</span>
          <a class="seller-rating" href="${escapeHtml(listing.url || "#")}" target="_blank" rel="noreferrer">Open source</a>
        </div>
      </div>
    </article>
  `;
}

function syncComputerControls() {
  renderComputerOptionControls();
  document.querySelectorAll(".computer-tabs button").forEach((tab) => {
    tab.classList.toggle("is-selected", tab.textContent.trim() === computerFilters.tab);
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
  const priceLabel = Number.isFinite(computerFilters.maxPrice) ? `Under $${computerFilters.maxPrice}` : null;
  const active = [
    computerFilters.tab,
    computerFilters.brand !== "Any brand" ? computerFilters.brand : null,
    computerFilters.screen !== "Any size" ? computerFilters.screen : null,
    computerFilters.year !== "Any year" ? computerFilters.year : null,
    computerFilters.ram !== "Any RAM" ? computerFilters.ram : null,
    computerFilters.storage !== "Any storage" ? computerFilters.storage : null,
    computerFilters.condition !== "Any condition" ? computerFilters.condition : null,
    priceLabel,
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

function goodsBadges(listing) {
  return [
    listing.itemType,
    listing.subcategory,
    listing.brand,
    listing.condition,
    listing.storageGb ? `${listing.storageGb}GB` : null,
    listing.unlocked ? "Unlocked" : null
  ].filter(Boolean).slice(0, 4);
}

function goodsFilterOptions(category) {
  const rows = categoryListings(category);
  const subcategoryPrefix = category === "electronics" ? "All electronics" : "All phone categories";
  return {
    itemTypes: category === "phones" ? ["All phone listings", ...uniqueSorted(rows, (listing) => listing.itemType)] : [],
    subcategories: [subcategoryPrefix, ...uniqueSorted(rows, (listing) => listing.subcategory)],
    brands: ["Any brand", ...uniqueSorted(rows, (listing) => listing.brand)],
    conditions: ["Any condition", ...uniqueSorted(rows, (listing) => listing.condition)]
  };
}

function renderGoodsFilterControls(category) {
  const state = goodsFilterState[category];
  const options = goodsFilterOptions(category);
  const panel = document.querySelector(`#${category} .goods-filter-panel`);
  if (!state || !panel) return;

  if (category === "phones" && !options.itemTypes.includes(state.itemType)) state.itemType = "All phone listings";
  if (!options.subcategories.includes(state.subcategory)) state.subcategory = category === "electronics" ? "All electronics" : "All phone categories";
  if (!options.brands.includes(state.brand)) state.brand = "Any brand";
  if (!options.conditions.includes(state.condition)) state.condition = "Any condition";

  const itemTypeBlock = category === "phones" ? `
    <div class="filter-block">
      <span class="filter-label">Listing type</span>
      <div class="chip-group" data-goods-filter="${category}" data-goods-key="itemType">
        ${options.itemTypes.map((value) => `<button class="chip ${state.itemType === value ? "is-selected" : ""}" type="button" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("")}
      </div>
    </div>
  ` : "";

  panel.innerHTML = `
    ${itemTypeBlock}
    <div class="filter-block">
      <span class="filter-label">Detailed category</span>
      <div class="chip-group" data-goods-filter="${category}" data-goods-key="subcategory">
        ${options.subcategories.map((value) => `<button class="chip ${state.subcategory === value ? "is-selected" : ""}" type="button" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("")}
      </div>
    </div>
    <div class="filter-block two-col">
      <label>Brand
        <select data-goods-filter="${category}" data-goods-key="brand">
          ${options.brands.map((value) => `<option value="${escapeHtml(value)}" ${state.brand === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
        </select>
      </label>
      <label>Condition
        <select data-goods-filter="${category}" data-goods-key="condition">
          ${options.conditions.map((value) => `<option value="${escapeHtml(value)}" ${state.condition === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
        </select>
      </label>
    </div>
  `;
}

function matchesGoods(listing, category) {
  if (listing.category !== category) return false;
  const state = goodsFilterState[category];
  if (!state) return true;
  if (category === "phones" && state.itemType !== "All phone listings" && listing.itemType !== state.itemType) return false;
  const allSubcategory = category === "electronics" ? "All electronics" : "All phone categories";
  if (state.subcategory !== allSubcategory && listing.subcategory !== state.subcategory) return false;
  if (state.brand !== "Any brand" && listing.brand !== state.brand) return false;
  if (state.condition !== "Any condition" && listing.condition !== state.condition) return false;
  return true;
}

function renderGoodsActiveFilters(category) {
  const container = document.querySelector(`#${category} .goods-active-filters`);
  const state = goodsFilterState[category];
  if (!container || !state) return;
  const allSubcategory = category === "electronics" ? "All electronics" : "All phone categories";
  const active = [
    category === "electronics" ? "Craigslist electronics" : "Craigslist phones",
    category === "phones" && state.itemType !== "All phone listings" ? state.itemType : null,
    state.subcategory !== allSubcategory ? state.subcategory : null,
    state.brand !== "Any brand" ? state.brand : null,
    state.condition !== "Any condition" ? state.condition : null
  ].filter(Boolean);
  container.innerHTML = active.map((filter) => `<span class="filter-chip">${escapeHtml(filter)}</span>`).join("");
}

function goodsCard(listing) {
  const meta = metaForCategory(listing.category);
  const badges = goodsBadges(listing);
  return `
    <article class="listing-card horizontal">
      <div class="visual-art ${photoClass(listing, artForListing(listing))}"${photoStyle(listing)}></div>
      <div class="listing-body">
        <div class="listing-topline">
          <span class="badge badge-green">${escapeHtml(meta.label)}</span>
          <span class="badge">Craigslist source</span>
        </div>
        <h3><a ${detailLinkAttrs(listing)}>${escapeHtml(listing.title)}</a></h3>
        <p>${escapeHtml([listing.location, listing.subcategory, listing.brand].filter(Boolean).join(" · "))}</p>
        <div class="badge-row">
          ${badges.map((item) => `<span class="badge">${escapeHtml(item)}</span>`).join("")}
        </div>
        <div class="listing-bottom">
          <span class="price">${formatPrice(listing.price)}</span>
          <a class="seller-rating" href="${escapeHtml(listing.url || "#")}" target="_blank" rel="noreferrer">Open source</a>
        </div>
      </div>
    </article>
  `;
}

function renderGoodsCategory(category) {
  const meta = metaForCategory(category);
  renderGoodsFilterControls(category);
  const sortValue = goodsSortSelects[category]?.value || "Best match";
  const matches = sortListings(appState.listings.filter((listing) => matchesGoods(listing, category)), sortValue, category);
  const status = document.querySelector(`#${category}-status`);
  const container = document.querySelector(`#${category} .listing-list`);
  if (status) status.textContent = `Showing ${matches.length} listing${matches.length !== 1 ? "s" : ""}`;
  if (container) {
    container.innerHTML = matches.length ? matches.map(goodsCard).join("") : emptyState(`No ${meta.label.toLowerCase()} listings were loaded from Craigslist.`);
  }
  renderGoodsActiveFilters(category);
}

function renderHomeListings() {
  const container = document.querySelector("#home .listing-grid");
  if (!container) return;
  const picks = [
    sortListings(appState.listings.filter((item) => item.category === "cars"), "Best match", "cars")[0],
    sortListings(appState.listings.filter((item) => item.category === "housing"), "Best match", "housing")[0],
    sortListings(appState.listings.filter((item) => item.category === "electronics"), "Best match", "electronics")[0],
    sortListings(appState.listings.filter((item) => item.category === "computers" && !excludedComputer(item)), "Best value", "computers")[0],
    sortListings(appState.listings.filter((item) => item.category === "phones"), "Best match", "phones")[0]
  ].filter(Boolean);
  container.innerHTML = picks.map((listing) => {
    const meta = metaForCategory(listing.category);
    return `
      <article class="listing-card">
        <div class="visual-art ${photoClass(listing, artForListing(listing))}"${photoStyle(listing)}></div>
        <div class="listing-body">
          <div class="listing-topline">
            <span class="price">${formatPrice(listing.price, listing.category === "housing" ? "/mo" : "")}</span>
            <span class="badge badge-green">Craigslist</span>
          </div>
          <h3><a ${detailLinkAttrs(listing)}>${escapeHtml(listing.title)}</a></h3>
          <p>${escapeHtml(listing.location)}</p>
          <div class="badge-row">
            <span class="badge">Craigslist source</span>
            <span class="badge">${escapeHtml(meta.label)}</span>
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
    const art = listing.category === "housing" ? "art-apartment" : listing.category === "computers" ? "art-laptop" : "art-car";
    return `
      <article class="mini-listing ${index === 1 ? "offset" : ""}">
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
  } else {
    const arts = [metaForCategory(cat).art, "art-dashboard", "art-wheel", "light-laptop", "dark-laptop"];
    arts.forEach((artClass) => photos.push({ type: "deco", url: artClass }));
  }
  return photos;
}

function renderDetail() {
  const category = appState.selectedDetailCategory || "cars";
  const meta = metaForCategory(category);
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
    breadcrumbLink.innerHTML = `<svg class="icon-sm"><use href="#i-x" style="transform: rotate(135deg)"></use></svg> Back to ${escapeHtml(meta.label.toLowerCase())}`;
  }

  // Category labels
  const categoryLabel = meta.label;
  const categoryIcon = meta.icon;

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
    } else {
      specs = [
        listing.brand,
        listing.subcategory,
        listing.storageGb ? `${listing.storageGb}GB` : null,
        listing.unlocked ? "Unlocked" : null,
        listing.condition
      ];
    }
    muted.textContent = specs.filter(Boolean).join(" · ") || "Details parsed from listing";
  }

  // Vehicle details grid (adapt icons/cards per category)
  const detailCardGrid = document.querySelector("#detail-card-grid");
  const detailCardHeading = document.querySelector("#detail-card-heading");
  if (detailCardHeading) detailCardHeading.textContent = category === "cars" ? "Vehicle details" : category === "housing" ? "Apartment details" : "Product specs";
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
    } else {
      cards = [
        { icon: categoryIcon, label: "Listing type", value: listing.itemType || categoryLabel },
        { icon: "i-tag", label: "Detailed category", value: listing.subcategory || "n/a" },
        { icon: "i-laptop", label: "Brand", value: listing.brand || "n/a" },
        { icon: "i-shield", label: "Condition", value: listing.condition || "n/a" },
        { icon: "i-id", label: "Storage", value: listing.storageGb ? `${listing.storageGb} GB` : "n/a" },
        { icon: "i-check", label: "Unlocked", value: listing.unlocked ? "Yes" : "n/a" },
        { icon: "i-check", label: "Price", value: formatPrice(listing.price) },
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
  if (vinLabel) vinLabel.textContent = `Listing ID: ${listing.id.replace(/^(car|housing|computer|computers|electronics|phones)-/, "")}`;
  if (vinText) {
    if (category === "cars") {
      vinText.textContent = "VIN and vehicle history are not included in Craigslist search results. Open the original listing to verify before contacting the seller.";
    } else if (category === "housing") {
      vinText.textContent = "Lease terms, deposit requirements, and broker fees should be verified directly with the landlord or agent via the original listing.";
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
    } else {
      const specs = [
        listing.year || null,
        listing.ramGb ? `${listing.ramGb}GB RAM` : null,
        listing.storageGb ? `${listing.storageGb}GB storage` : null,
        listing.unlocked ? "unlocked" : null
      ].filter(Boolean).join(", ");
      sellerNoteText.textContent = `This ${listing.brand || ""} ${listing.subcategory || "item"} is listed in ${listing.condition || "available"} condition${specs ? ` with ${specs}` : ""}. Open the original Craigslist listing to verify details and contact the seller.`;
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
    } else {
      chips = [
        listing.subcategory || null,
        listing.brand || null,
        listing.condition || null,
        listing.storageGb ? `${listing.storageGb}GB` : null,
        listing.unlocked ? "Unlocked" : null
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
    } else if (category === "electronics" || category === "phones") {
      safetyBanner.innerHTML = `
        <div><strong>Meet in a public place</strong><span>Use a cafe, station, or staffed pickup spot.</span></div>
        <div><strong>Test the item first</strong><span>Power on, inspect ports, and verify condition.</span></div>
        <div><strong>Avoid payment pressure</strong><span>No deposits or shipping requests before inspection.</span></div>
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
  goodsCategories.forEach(renderGoodsCategory);
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
  const query = document.querySelector("#home-query").value.toLowerCase();
  if (query.includes("phone") || query.includes("iphone") || query.includes("samsung")) {
    goToRoute("phones");
  } else if (query.includes("electronic") || query.includes("speaker") || query.includes("camera") || query.includes("tv")) {
    goToRoute("electronics");
  } else if (query.includes("mac") || query.includes("computer") || query.includes("laptop")) {
    goToRoute("computers");
  } else if (query.includes("apartment") || query.includes("brooklyn") || query.includes("rent") || query.includes("br")) {
    goToRoute("housing");
  } else {
    goToRoute("cars");
  }
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

carYearSelect?.addEventListener("change", (event) => {
  replaceFilterGroup(carFilters, carFilterSets.years, event.target.value, ["Any year"]);
  renderCarFilters();
});

carSortSelect?.addEventListener("change", renderCarFilters);

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
    replaceFilterGroup(housingFilters, housingListingTypes, value);
  } else if (housingBedroomValues.includes(value)) {
    replaceFilterGroup(housingFilters, housingBedroomValues, value);
  } else if (housingFurnishedValues.includes(value)) {
    if (housingFilters.has(value)) housingFilters.delete(value);
    else replaceFilterGroup(housingFilters, housingFurnishedValues, value);
  } else if (housingLeaseValues.includes(value)) {
    replaceFilterGroup(housingFilters, housingLeaseValues, value);
  } else if (housingFilters.has(value)) {
    housingFilters.delete(value);
  } else {
    housingFilters.add(value);
  }
  renderHousingFilters();
});

housingPrice?.addEventListener("change", (event) => {
  replaceFilterGroup(housingFilters, housingKnownPrices, event.target.value, ["Any price"]);
  renderHousingFilters();
});

housingSortSelect?.addEventListener("change", renderHousingFilters);

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
  computerFilters.tab = tab.textContent.trim();
  renderComputerFilters();
});

computerBrandSelect?.addEventListener("change", (event) => {
  computerFilters.brand = event.target.value;
  renderComputerFilters();
});

computerScreenGroup?.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip) return;
  computerFilters.screen = chip.dataset.value || chip.textContent.trim();
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

goodsCategories.forEach((category) => {
  goodsSortSelects[category]?.addEventListener("change", () => renderGoodsCategory(category));
});

document.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-goods-filter][data-goods-key] .chip");
  if (!chip) return;
  const group = chip.closest("[data-goods-filter][data-goods-key]");
  const category = group?.dataset.goodsFilter;
  const key = group?.dataset.goodsKey;
  if (!category || !key || !goodsFilterState[category]) return;
  goodsFilterState[category][key] = chip.dataset.value || chip.textContent.trim();
  renderGoodsCategory(category);
});

document.addEventListener("change", (event) => {
  const control = event.target.closest("select[data-goods-filter][data-goods-key]");
  if (!control) return;
  const category = control.dataset.goodsFilter;
  const key = control.dataset.goodsKey;
  if (!category || !key || !goodsFilterState[category]) return;
  goodsFilterState[category][key] = control.value;
  renderGoodsCategory(category);
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
