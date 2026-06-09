const pages = Array.from(document.querySelectorAll("[data-page]"));
const routeLinks = Array.from(document.querySelectorAll("[data-route-link]"));

const fallbackData = {
  generatedAt: "2026-06-09",
  mode: "embedded-seed",
  source: "Embedded seed from Craigslist New York search results; run the local server for live refresh.",
  listings: [
    { id: "car-7939679011", category: "cars", title: "2019 BMW X3 - Great Deal!-new jersey", price: 16495, location: "Woodside", url: "https://newyork.craigslist.org/jsy/ctd/d/woodside-2019-bmw-x3-great-deal-new/7939679011.html", image: "https://images.craigslist.org/01414_hFwmJPd8ZQr_0ew0aS_600x450.jpg", year: 2019, make: "BMW", model: "X3", body: "SUV", mileage: 96139, transmission: "Automatic", fuel: "Gas", drive: "AWD", titleStatus: "Clean" },
    { id: "car-7939358963", category: "cars", title: "2008 BMW X3 3.0si AWD 4dr SUV", price: 4600, location: "Trenton", url: "https://newyork.craigslist.org/brx/ctd/d/trenton-2008-bmw-x3-30si-awd-4dr-suv/7939358963.html", image: "https://images.craigslist.org/00O0O_kIrb7fk3h8z_0dI0ah_600x450.jpg", year: 2008, make: "BMW", model: "X3", body: "SUV", transmission: "Automatic", fuel: "Gas", drive: "AWD", titleStatus: "Clean" },
    { id: "car-7939275196", category: "cars", title: "An Impressive 2019 BMW X3 with 96,139 Miles-long island", price: 15900, location: "Freeport", url: "https://newyork.craigslist.org/lgi/ctd/d/roosevelt-an-impressive-2019-bmw-x3/7939275196.html", image: null, year: 2019, make: "BMW", model: "X3", body: "SUV", mileage: 96139, transmission: "Automatic", fuel: "Gas", drive: "AWD", titleStatus: "Clean" },
    { id: "car-7939066504", category: "cars", title: "2019 BMW X5 xDrive40i AWD Fully Loaded (Camera, Panorama, Navi)", price: 20990, location: "Brooklyn", url: "https://newyork.craigslist.org/brk/cto/d/brooklyn-2019-bmw-x5-xdrive40i-awd/7939066504.html", image: null, year: 2019, make: "BMW", model: "X5", body: "SUV", transmission: "Automatic", fuel: "Gas", drive: "AWD", titleStatus: "Clean" },
    { id: "car-7938805789", category: "cars", title: "BMW X3 2014", price: 7500, location: "Nassau County", url: "https://newyork.craigslist.org/lgi/cto/d/melville-bmw-x3-2014/7938805789.html", image: null, year: 2014, make: "BMW", model: "X3", body: "SUV", transmission: "Automatic", fuel: "Gas", drive: "AWD", titleStatus: "Clean" },
    { id: "car-7938716285", category: "cars", title: "2020 BMW X3 M40i", price: 24995, location: "Floral Park", url: "https://newyork.craigslist.org/brk/ctd/d/floral-park-2020-bmw-x3-m40i/7938716285.html", image: null, year: 2020, make: "BMW", model: "X3", body: "SUV", transmission: "Automatic", fuel: "Gas", drive: "AWD", titleStatus: "Clean" },
    { id: "housing-7939394454", category: "housing", listingType: "For rent", title: "2 Bed/1 Bath Basement Appartment available in Brooklyn", price: 1800, location: "Kensington", url: "https://newyork.craigslist.org/brk/apa/d/brooklyn-bed-bath-basement-appartment/7939394454.html", image: null, bedrooms: 2, bathrooms: 1, furnished: false, leaseTerm: "1 year+", amenities: ["Basement", "Brooklyn"] },
    { id: "housing-7939342197", category: "housing", listingType: "For rent", title: "A Brooklyn 1-Bed With Comfort, Convenience, and a Little Extra Space", price: 2495, location: "Brooklyn", url: "https://newyork.craigslist.org/brk/apa/d/brooklyn-brooklyn-bed-with-comfort/7939342197.html", image: null, bedrooms: 1, bathrooms: 1, furnished: false, leaseTerm: "1 year+", amenities: ["Extra space", "Transit"] },
    { id: "housing-7939064569", category: "housing", listingType: "For rent", title: "Amazing Bright Large 1 BR Bensonhurst / Bath Beach NO Fee", price: 2156, location: "Bensonhurst / Bath Beach", url: "https://newyork.craigslist.org/brk/apa/d/brooklyn-amazing-bright-large-br/7939064569.html", image: null, bedrooms: 1, bathrooms: 1, furnished: false, leaseTerm: "1 year+", amenities: ["No fee", "Bright", "Large"] },
    { id: "housing-7939061463", category: "housing", listingType: "For rent", title: "Cozy 1 Bedroom | Prime Flatbush Brooklyn Location", price: 1964, location: "Flatbush", url: "https://newyork.craigslist.org/brk/apa/d/brooklyn-cozy-bedroom-prime-flatbush/7939061463.html", image: null, bedrooms: 1, bathrooms: 1, furnished: false, leaseTerm: "1 year+", amenities: ["Prime location", "Flatbush"] },
    { id: "housing-7938719015", category: "housing", listingType: "For rent", title: "Renovated Studio 1 Block to Brooklyn College - Separate Eat-In Kitchen", price: 1600, location: "Flatbush", url: "https://newyork.craigslist.org/brk/apa/d/brooklyn-renovated-studio-block-to/7938719015.html", image: null, bedrooms: 0, bathrooms: 1, furnished: false, leaseTerm: "1 year+", amenities: ["Renovated", "Eat-in kitchen"] },
    { id: "computer-7910839552", category: "computers", subcategory: "Laptops", title: "MacBook Air Early 2015", price: 100, location: "Bedford Hills", url: "https://newyork.craigslist.org/wch/sys/d/bedford-hills-macbook-air-early-2015/7910839552.html", image: "https://images.craigslist.org/00N0N_fqw41Jmgnln_0CI0t2_600x450.jpg", brand: "Apple", year: 2015, screen: 13, ramGb: 8, storageGb: 128, condition: "Good" },
    { id: "computer-7939700366", category: "computers", subcategory: "Laptops", title: "Macbook Pro 15 Touch Bar 2.7ghz i7 processor 16 500GB", price: 200, location: "Brooklyn", url: "https://newyork.craigslist.org/brk/sys/d/staten-island-macbook-pro-15-touch-bar/7939700366.html", image: "https://images.craigslist.org/00x0x_kguRKCy7oPA_0pO0ew_600x450.jpg", brand: "Apple", year: 2016, screen: 15, ramGb: 16, storageGb: 500, condition: "Good" },
    { id: "computer-7938258973", category: "computers", subcategory: "Accessories", title: "NEW Case MacBook Air 15 inch 2024 2023 M3 M2 Model A3114 A2941", price: 12, location: "Ridgewood 11385 Queens", url: "https://newyork.craigslist.org/que/sys/d/ridgewood-new-case-macbook-air-15-inch/7938258973.html", image: "https://images.craigslist.org/00g0g_lJXrRjwIdYH_08w0ak_600x450.jpg", brand: "Apple", year: 2024, screen: 15, ramGb: null, storageGb: null, condition: "Open box" },
    { id: "computer-7939653842", category: "computers", subcategory: "Laptops", title: "MacBook Pro 13", price: 290, location: "New York", url: "https://newyork.craigslist.org/mnh/sys/d/new-york-macbook-pro-13/7939653842.html", image: "https://images.craigslist.org/00f0f_lm7NSjDsRQ5_0t20CI_600x450.jpg", brand: "Apple", year: null, screen: 13, ramGb: null, storageGb: null, condition: "Good" },
    { id: "computer-7939646209", category: "computers", subcategory: "Laptops", title: "Apple Macbook Pro 16 - A2141 - 6-core i7, 16G, 512G - works well!", price: 270, location: "Bushwick", url: "https://newyork.craigslist.org/brk/sys/d/brooklyn-apple-macbook-pro-16-core-i7/7939646209.html", image: "https://images.craigslist.org/00i0i_22jAxlCUK1s_0CI0t2_600x450.jpg", brand: "Apple", year: 2019, screen: 16, ramGb: 16, storageGb: 512, condition: "Good" },
    { id: "computer-7939623274", category: "computers", subcategory: "Laptops", title: "Macbook Air 13 2015 i5 SSD", price: 120, location: "Staten Island", url: "https://newyork.craigslist.org/stn/sys/d/staten-island-macbook-air-i5-ssd/7939623274.html", image: "https://images.craigslist.org/00D0D_5Pa8t6J0ud1_0jm0o9_600x450.jpg", brand: "Apple", year: 2015, screen: 13, ramGb: 8, storageGb: 128, condition: "Good" }
  ]
};

const appState = {
  data: fallbackData,
  listings: fallbackData.listings,
  selectedDetailId: localStorage.getItem("better-cl-selected-detail-id") || "car-7939679011",
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

const carFilters = new Set(["BMW", "X3", "SUV", "Before 2020"]);
const carActiveFilters = document.querySelector("#car-active-filters");
const carCount = document.querySelector("#car-count");
const carMakeSelect = document.querySelector("#car-make");
const carModelSelect = document.querySelector("#car-model");
const carYearSelect = document.querySelector("#car-year");
const carSortSelect = document.querySelector("#cars [aria-label='Sort car listings']");

const housingDefaults = ["Brooklyn", "1 BR", "Under $2,500", "1 year+", "For rent"];
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
  tab: "Laptops",
  brand: "Apple",
  screen: "13\"",
  year: "2015+",
  ram: "8GB+",
  storage: "256GB SSD+",
  condition: "Good+",
  maxPrice: 300,
  excludes: {
    Cases: true,
    Keyboards: true,
    Repair: true
  }
};

const computerBrandSelect = document.querySelector("#computer-brand");
const computerSortSelect = document.querySelector("#computers [aria-label='Sort computer listings']");
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
  return `$${Number(value).toLocaleString()}${suffix}`;
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
  if (!listing.image) return fallbackClass;
  return `real-photo ${fallbackClass}`;
}

function photoStyle(listing) {
  return listing.image ? ` style="--photo: url('${escapeHtml(listing.image)}')"` : "";
}

function sourceStatus(panelSelector, label) {
  const panel = document.querySelector(panelSelector);
  if (!panel) return;
  let status = panel.querySelector(".data-status");
  if (!status) {
    status = document.createElement("div");
    status.className = "data-status";
    panel.prepend(status);
  }
  const mode = appState.data.mode === "live"
    ? "Live Craigslist data"
    : appState.data.mode === "mixed-live"
      ? "Live + seed data"
      : "Seed data";
  status.innerHTML = `<strong>${mode}</strong><span>${escapeHtml(label)}</span>`;
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
  if (carCount) carCount.textContent = `${matches.length} matches`;
  const container = document.querySelector("#cars .listing-list");
  if (container) {
    container.innerHTML = matches.length ? matches.map(carCard).join("") : emptyState("Try removing model, body, or year filters.");
  }
  sourceStatus("#cars .results-panel", `${matches.length} car results filtered locally from ${appState.listings.filter((item) => item.category === "cars").length} records.`);
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
        <h3>${escapeHtml(listing.title)}</h3>
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
  sourceStatus("#housing .results-panel", `${matches.length} housing results filtered locally from ${appState.listings.filter((item) => item.category === "housing").length} records.`);
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
  if ((computerFilters.brand === "Any brand" || computerFilters.brand === "Apple") && !textIncludes(listing, "MacBook") && !textIncludes(listing, "Apple")) return false;
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
        <h3>${escapeHtml(listing.title)}</h3>
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
  const active = [
    computerFilters.tab,
    computerFilters.brand !== "Any brand" ? computerFilters.brand : null,
    computerFilters.brand === "Apple" || computerFilters.brand === "Any brand" ? "MacBook" : null,
    computerFilters.screen !== "Any size" ? computerFilters.screen : null,
    computerFilters.year,
    computerFilters.ram,
    computerFilters.storage,
    computerFilters.condition,
    `Under $${computerFilters.maxPrice}`,
    ...Object.entries(computerFilters.excludes)
      .filter(([, enabled]) => enabled)
      .map(([label]) => `No ${label.toLowerCase()}`)
  ].filter(Boolean);
  computerActiveFilters.innerHTML = active.map((filter) => `<span class="filter-chip">${escapeHtml(filter)}</span>`).join("");
}

function renderComputerFilters() {
  syncComputerControls();
  const matches = sortListings(appState.listings.filter(matchesComputer), computerSortSelect?.value || "Best value", "computers");
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
  const queryLabel = computerFilters.brand === "Apple" || computerFilters.brand === "Any brand" ? "MacBook" : `${computerFilters.brand} laptop`;
  sourceStatus("#computers .results-panel", `${matches.length} ${queryLabel} results filtered locally from ${appState.listings.filter((item) => item.category === "computers").length} records.`);
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
    const art = listing.category === "housing" ? "art-apartment" : listing.category === "computers" ? "art-laptop" : "art-car";
    const route = listing.category === "housing" ? "housing" : listing.category === "computers" ? "computers" : "detail";
    return `
      <article class="listing-card">
        <div class="visual-art ${photoClass(listing, art)}"${photoStyle(listing)}></div>
        <div class="listing-body">
          <div class="listing-topline">
            <span class="price">${formatPrice(listing.price, listing.category === "housing" ? "/mo" : "")}</span>
            <span class="badge badge-green">${appState.data.mode === "live" || appState.data.mode === "mixed-live" ? "Live" : "Real seed"}</span>
          </div>
          <h3><a href="#${route}" ${listing.category === "cars" ? `data-detail-id="${escapeHtml(listing.id)}"` : `data-route-link="${route}"`}>${escapeHtml(listing.title)}</a></h3>
          <p>${escapeHtml(listing.location)}</p>
          <div class="badge-row">
            <span class="badge">Craigslist source</span>
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

function renderDetail() {
  const cars = appState.listings.filter((item) => item.category === "cars");
  const listing = cars.find((item) => item.id === appState.selectedDetailId) || cars[0];
  if (!listing) return;
  const title = document.querySelector("#detail .detail-title-row h1");
  const price = document.querySelector("#detail .detail-price");
  const muted = document.querySelector("#detail .detail-title-row .muted");
  const eyebrow = document.querySelector("#detail .detail-title-row .eyebrow");
  const art = document.querySelector("#detail .detail-art");
  const historyTitle = document.querySelector(".vehicle-history h2");
  const historyText = document.querySelector(".vehicle-history p:last-child");
  const cta = document.querySelector(".seller-cta");
  const detailValues = Array.from(document.querySelectorAll("#detail .detail-card strong"));
  if (title) title.textContent = listing.title;
  if (price) price.textContent = formatPrice(listing.price);
  if (muted) muted.textContent = [listing.body, listing.transmission, listing.fuel].filter(Boolean).join(" · ") || "Vehicle details parsed from listing";
  if (eyebrow) eyebrow.textContent = `Cars & trucks / ${listing.location || "New York"}`;
  if (art) {
    art.className = `visual-art detail-art ${photoClass(listing, "art-car")}`;
    art.style.setProperty("--photo", listing.image ? `url('${listing.image}')` : "");
  }
  const values = [
    listing.year || "n/a",
    listing.mileage ? `${Math.round(listing.mileage / 1000)}k` : "n/a",
    listing.transmission || "n/a",
    listing.fuel || "n/a",
    listing.body || "n/a",
    "n/a",
    listing.drive || "n/a",
    listing.titleStatus || "n/a"
  ];
  detailValues.forEach((node, index) => {
    node.textContent = values[index];
  });
  if (historyTitle) historyTitle.textContent = listing.id.replace(/^car-/, "Listing ID ");
  if (historyText) historyText.textContent = "VIN and vehicle history are not included in Craigslist search results. Open the original listing to verify before contacting the seller.";
  if (cta) {
    cta.textContent = "Open Original Listing";
    cta.onclick = () => {
      if (listing.url) window.open(listing.url, "_blank", "noopener");
    };
  }
}

function renderAll() {
  renderHomeListings();
  renderMiniListings();
  renderCarFilters();
  renderHousingFilters();
  renderComputerFilters();
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
    localStorage.setItem("better-cl-selected-detail-id", appState.selectedDetailId);
    goToRoute("detail");
  }
});

window.addEventListener("hashchange", () => goToRoute(currentRoute()));

document.querySelector("#home-search")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = document.querySelector("#home-query").value.toLowerCase();
  if (query.includes("mac") || query.includes("computer") || query.includes("laptop")) {
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

document.querySelectorAll(".thumb").forEach((thumb) => {
  thumb.addEventListener("click", () => {
    document.querySelectorAll(".thumb").forEach((button) => button.classList.remove("is-selected"));
    thumb.classList.add("is-selected");
  });
});

loadListings().then((payload) => {
  appState.data = payload;
  appState.listings = payload.listings;
  deriveFilterOptionsFromData();
  renderAll();
  goToRoute(currentRoute());
});
