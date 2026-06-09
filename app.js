const pages = Array.from(document.querySelectorAll("[data-page]"));
const routeLinks = Array.from(document.querySelectorAll("[data-route-link]"));

function goToRoute(route) {
  const nextRoute = route || "home";
  pages.forEach((page) => page.classList.toggle("is-active", page.dataset.page === nextRoute));
  routeLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.routeLink === nextRoute));
  if (window.location.hash.replace("#", "") !== nextRoute) {
    window.location.hash = nextRoute;
  }
  window.scrollTo({ top: 0 });
  requestAnimationFrame(() => window.scrollTo({ top: 0 }));
}

function currentRoute() {
  const route = window.location.hash.replace("#", "");
  return pages.some((page) => page.dataset.page === route) ? route : "home";
}

routeLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    goToRoute(link.dataset.routeLink);
  });
});

window.addEventListener("hashchange", () => goToRoute(currentRoute()));
goToRoute(currentRoute());

document.querySelector("#home-search")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = document.querySelector("#home-query").value.toLowerCase();
  if (query.includes("mac") || query.includes("computer") || query.includes("laptop")) {
    goToRoute("computers");
  } else if (query.includes("apartment") || query.includes("brooklyn") || query.includes("rent") || query.includes("br")) {
    goToRoute("housing");
  } else if (query.includes("car") || query.includes("bmw") || query.includes("truck")) {
    goToRoute("cars");
  } else {
    goToRoute("cars");
  }
});

function filterChip(label, scope) {
  return `
    <span class="filter-chip">
      ${label}
      <button type="button" aria-label="Remove ${label}" data-remove-${scope}="${label}">
        <svg class="icon-sm"><use href="#i-x"></use></svg>
      </button>
    </span>
  `;
}

const carFilterSets = {
  makes: ["BMW", "Toyota", "Honda", "Ford"],
  models: ["X3", "X5", "3 Series", "5 Series"],
  years: ["Before 2020", "2020 or newer", "2016 or newer"],
  colors: ["Black", "White", "Silver", "Blue", "Red", "Green", "Tan", "Gray"],
  bodies: ["SUV", "Sedan", "Truck", "Coupe", "Wagon"]
};

const carFilters = new Set(["BMW", "X3", "SUV", "Before 2020", "Black"]);
const carActiveFilters = document.querySelector("#car-active-filters");
const carCount = document.querySelector("#car-count");

function removeCarGroup(values) {
  values.forEach((value) => carFilters.delete(value));
}

function renderCarFilters() {
  if (!carActiveFilters) return;
  carActiveFilters.innerHTML = Array.from(carFilters).map((filter) => filterChip(filter, "car")).join("");
  const count = Math.max(24, 138 - carFilters.size * 2);
  if (carCount) carCount.textContent = `${count} matches`;

  document.querySelectorAll("[data-car-group='body'] .chip").forEach((chip) => {
    chip.classList.toggle("is-selected", carFilters.has(chip.dataset.value));
  });
  document.querySelectorAll("[data-car-group='color'] .swatch").forEach((swatch) => {
    swatch.classList.toggle("is-selected", carFilters.has(swatch.dataset.value));
  });
}

document.querySelector("#car-make")?.addEventListener("change", (event) => {
  removeCarGroup(carFilterSets.makes);
  carFilters.add(event.target.value);
  renderCarFilters();
});

document.querySelector("#car-model")?.addEventListener("change", (event) => {
  removeCarGroup(carFilterSets.models);
  carFilters.add(event.target.value);
  renderCarFilters();
});

document.querySelector("#car-year")?.addEventListener("change", (event) => {
  removeCarGroup(carFilterSets.years);
  carFilters.add(event.target.value);
  renderCarFilters();
});

document.querySelectorAll("[data-car-group='body'] .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    removeCarGroup(carFilterSets.bodies);
    carFilters.add(chip.dataset.value);
    renderCarFilters();
  });
});

document.querySelectorAll("[data-car-group='color'] .swatch").forEach((swatch) => {
  swatch.addEventListener("click", () => {
    removeCarGroup(carFilterSets.colors);
    carFilters.add(swatch.dataset.value);
    renderCarFilters();
  });
});

carActiveFilters?.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-car]");
  if (!removeButton) return;
  carFilters.delete(removeButton.dataset.removeCar);
  renderCarFilters();
});

renderCarFilters();

const housingDefaults = ["Brooklyn", "1 BR", "Under $2,500", "1 year+", "For rent"];
const housingActiveFilters = document.querySelector("#housing-active-filters");
const housingPrice = document.querySelector("#housing-price");
const housingLocation = document.querySelector("#housing-location");
const housingKnownPrices = ["Under $2,500", "Under $3,000", "Any price"];
const housingListingTypes = ["For rent", "For sale", "Short-term"];
const housingBedroomValues = ["Studio", "1 BR", "2 BR", "3 BR", "4+ BR"];

function readHousingFilters() {
  try {
    const stored = JSON.parse(localStorage.getItem("better-cl-housing-filters"));
    return Array.isArray(stored) && stored.length ? stored : housingDefaults;
  } catch {
    return housingDefaults;
  }
}

const housingFilters = new Set(readHousingFilters());

function saveHousingFilters() {
  localStorage.setItem("better-cl-housing-filters", JSON.stringify(Array.from(housingFilters)));
}

function replaceHousingGroup(values, nextValue) {
  values.forEach((value) => housingFilters.delete(value));
  if (nextValue && nextValue !== "Any price") housingFilters.add(nextValue);
}

function normalizeLocation(value) {
  const clean = value.trim();
  if (!clean) return "";
  return clean.split(",")[0].trim();
}

function renderHousingFilters() {
  if (!housingActiveFilters) return;
  housingActiveFilters.innerHTML = Array.from(housingFilters).map((filter) => filterChip(filter, "housing")).join("");
  document.querySelectorAll("[data-housing-filter]").forEach((control) => {
    control.classList.toggle("is-selected", housingFilters.has(control.dataset.housingFilter));
  });
  if (housingPrice) {
    const activePrice = housingKnownPrices.find((price) => housingFilters.has(price));
    housingPrice.value = activePrice || "Any price";
  }
  saveHousingFilters();
}

document.querySelectorAll("[data-housing-filter]").forEach((control) => {
  control.addEventListener("click", () => {
    const value = control.dataset.housingFilter;
    if (housingListingTypes.includes(value)) {
      replaceHousingGroup(housingListingTypes, value);
    } else if (housingBedroomValues.includes(value)) {
      replaceHousingGroup(housingBedroomValues, value);
    } else if (housingFilters.has(value)) {
      housingFilters.delete(value);
    } else {
      housingFilters.add(value);
    }
    renderHousingFilters();
  });
});

housingPrice?.addEventListener("change", (event) => {
  replaceHousingGroup(housingKnownPrices, event.target.value);
  renderHousingFilters();
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

renderHousingFilters();

document.querySelectorAll(".computer-tabs button").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".computer-tabs button").forEach((button) => button.classList.remove("is-selected"));
    tab.classList.add("is-selected");
  });
});

document.querySelectorAll("#computers .chip-group .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    chip.parentElement.querySelectorAll(".chip").forEach((button) => button.classList.remove("is-selected"));
    chip.classList.add("is-selected");
  });
});

const compareButton = document.querySelector("#compare-button");

function updateCompareState() {
  const cards = Array.from(document.querySelectorAll(".compare-card"));
  const count = cards.reduce((total, card) => {
    const checked = Boolean(card.querySelector(".compare-check input")?.checked);
    card.classList.toggle("is-compared", checked);
    return total + (checked ? 1 : 0);
  }, 0);
  if (compareButton) compareButton.textContent = `Compare (${count})`;
}

document.querySelectorAll(".compare-check input").forEach((checkbox) => {
  checkbox.addEventListener("change", updateCompareState);
});

updateCompareState();

document.querySelectorAll(".thumb").forEach((thumb) => {
  thumb.addEventListener("click", () => {
    document.querySelectorAll(".thumb").forEach((button) => button.classList.remove("is-selected"));
    thumb.classList.add("is-selected");
  });
});
