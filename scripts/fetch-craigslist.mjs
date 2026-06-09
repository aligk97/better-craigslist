import { mkdir, writeFile } from "node:fs/promises";

const categories = {
  cars: {
    label: "Cars",
    url: "https://newyork.craigslist.org/search/cta",
    limit: 20
  },
  housing: {
    label: "Housing",
    url: "https://newyork.craigslist.org/search/apa",
    limit: 20
  },
  electronics: {
    label: "Electronics",
    url: "https://newyork.craigslist.org/search/ela",
    limit: 20
  },
  computers: {
    label: "Computers",
    url: "https://newyork.craigslist.org/search/sya",
    limit: 20
  },
  phones: {
    label: "Phones",
    url: "https://newyork.craigslist.org/search/moa",
    limit: 20
  }
};

const knownMakes = [
  "Acura", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet", "Chrysler", "Dodge", "Ford",
  "Genesis", "GMC", "Honda", "Hyundai", "Infiniti", "Jeep", "Kia", "Lexus", "Mazda",
  "Mercedes-Benz", "Mercedes", "Mini", "Nissan", "Porsche", "Ram", "Subaru", "Tesla",
  "Toyota", "Volkswagen", "Volvo"
];

const computerBrands = ["Apple", "Dell", "HP", "Lenovo", "Asus", "Acer", "Microsoft", "Samsung", "LG"];
const phoneBrands = ["Apple", "iPhone", "Samsung", "Google", "Motorola", "LG", "OnePlus", "Nokia", "TCL", "Moto"];
const electronicsBrands = ["Sony", "Samsung", "LG", "Bose", "Canon", "Nikon", "Panasonic", "Yamaha", "Denon", "JBL", "Apple", "Dell"];
const computerAccessoryPattern = /\b(case|cover|sleeve|bag|keyboard|mouse|trackpad|charger|charging|adapter|cable|cord|dock|hub|stand|speaker|headphone|earbud|parts|repair|for parts|locked|display assembly|battery|fan|shredder)\b/i;
const phoneAccessoryPattern = /\b(case|cover|screen protector|protector|charger|charging|cable|cord|adapter|mount|holder|stand|wallet|battery|stylus|strap|airpod|airpods|earbuds|headphones|soundbar|subwoofer)\b/i;

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripTags(value = "") {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " "));
}

function parsePrice(value = "") {
  const match = String(value).match(/\$([\d,]+)/);
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

function idFromUrl(url, category, index) {
  return `${category}-${url.match(/\/(\d+)\.html/)?.[1] || `live-${index + 1}`}`;
}

function firstMatch(text, values) {
  const normalized = text.toLowerCase();
  return values.find((value) => normalized.includes(value.toLowerCase())) || null;
}

function parseSearchResults(html, category) {
  const blocks = html.match(/<li class="cl-static-search-result"[\s\S]*?<\/li>/g) || [];
  return blocks.map((block, index) => {
    const url = decodeHtml(block.match(/<a href="([^"]+)"/)?.[1] || "");
    const title = stripTags(block.match(/<div class="title">([\s\S]*?)<\/div>/)?.[1] || "");
    const price = parsePrice(stripTags(block.match(/<div class="price">([\s\S]*?)<\/div>/)?.[1] || ""));
    const location = stripTags(block.match(/<div class="location">([\s\S]*?)<\/div>/)?.[1] || "New York");
    const image = decodeHtml(block.match(/<img[^>]+src="([^"]+)"/)?.[1] || "");
    return normalizeListing({ id: idFromUrl(url, category, index), category, title, price, location, url, image: image || null });
  }).filter((listing) => listing.title && listing.url);
}

function uniqueImages(urls) {
  return Array.from(new Set(urls.filter(Boolean).map((url) => decodeHtml(url))))
    .filter((url) => /^https:\/\/images\.craigslist\.org\/.+\.(jpg|jpeg|webp|png)$/i.test(url));
}

function parseListingImages(html) {
  const images = [];
  const imgListSource = html.match(/var\s+imgList\s*=\s*(\[[\s\S]*?\]);/)?.[1];
  if (imgListSource) {
    try {
      const imgList = JSON.parse(imgListSource);
      imgList.forEach((image) => {
        images.push(image.url);
      });
    } catch {
      // Fall through to regex extraction below.
    }
  }

  const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1];
  if (ogImage) images.unshift(ogImage);

  for (const match of html.matchAll(/https:\/\/images\.craigslist\.org\/[^"' <>)]+/g)) {
    const url = match[0].replace(/&quot;.*$/, "");
    if (/_600x450\.(jpg|jpeg|webp|png)$/i.test(url)) images.push(url);
  }

  return uniqueImages(images);
}

async function fetchListingImages(listing) {
  if (!listing.url) return listing;
  try {
    const response = await fetch(listing.url, {
      headers: {
        "accept": "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0 (compatible; BetterCraigslistDataBot/1.0)"
      }
    });
    if (!response.ok) return listing;
    const html = await response.text();
    const images = parseListingImages(html);
    if (!images.length) return listing;
    return {
      ...listing,
      image: images[0],
      images
    };
  } catch {
    return listing;
  }
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function normalizeListing(listing) {
  if (listing.category === "cars") return normalizeCar(listing);
  if (listing.category === "housing") return normalizeHousing(listing);
  if (listing.category === "computers") return normalizeComputer(listing);
  if (listing.category === "phones") return normalizePhone(listing);
  return normalizeElectronics(listing);
}

function normalizeCar(listing) {
  const title = listing.title;
  const year = Number(title.match(/\b(19[8-9]\d|20[0-3]\d)\b/)?.[1]) || null;
  const make = firstMatch(title, knownMakes);
  const makeIndex = make ? title.toLowerCase().indexOf(make.toLowerCase()) : -1;
  const afterMake = makeIndex >= 0 ? title.slice(makeIndex + make.length).trim().split(/\s+/).slice(0, 2).join(" ") : "";
  const model = afterMake ? afterMake.replace(/[^\w -]/g, "").trim() || null : null;
  const lowerTitle = title.toLowerCase();
  const body = lowerTitle.includes("suv") ? "SUV"
    : lowerTitle.includes("sedan") ? "Sedan"
      : lowerTitle.includes("truck") || lowerTitle.includes("pickup") ? "Truck"
        : lowerTitle.includes("wagon") ? "Wagon"
          : lowerTitle.includes("coupe") ? "Coupe"
            : null;
  const mileageMatch = title.match(/([\d,]+)\s*(k|mi|miles)/i);
  const mileage = mileageMatch ? Number(mileageMatch[1].replace(/,/g, "")) * (mileageMatch[2].toLowerCase() === "k" ? 1000 : 1) : null;
  return {
    ...listing,
    year,
    make: make === "Mercedes" ? "Mercedes-Benz" : make,
    model,
    body,
    mileage,
    transmission: null,
    fuel: null,
    drive: /\bawd\b/i.test(title) ? "AWD" : /\bfwd\b/i.test(title) ? "FWD" : /\brwd\b/i.test(title) ? "RWD" : null,
    titleStatus: /\bclean\b/i.test(title) ? "Clean" : null
  };
}

function normalizeHousing(listing) {
  const title = listing.title.toLowerCase();
  const bedMatch = listing.title.match(/(\d+)\s*(br|bed|bd|bedroom)/i);
  const bathMatch = listing.title.match(/(\d+(?:\.\d+)?)\s*(ba|bath)/i);
  const studio = /\bstudio\b/i.test(listing.title);
  const amenities = [
    title.includes("no fee") ? "No fee" : null,
    title.includes("backyard") ? "Backyard" : null,
    title.includes("parking") ? "Parking" : null,
    title.includes("laundry") ? "Laundry" : null,
    title.includes("duplex") ? "Duplex" : null
  ].filter(Boolean);
  return {
    ...listing,
    listingType: "For rent",
    bedrooms: studio ? 0 : bedMatch ? Number(bedMatch[1]) : null,
    bathrooms: bathMatch ? Number(bathMatch[1]) : null,
    furnished: /\bfurnished\b/i.test(listing.title),
    leaseTerm: null,
    amenities
  };
}

function normalizeComputer(listing) {
  const title = listing.title;
  const lower = title.toLowerCase();
  const isAudio = /\b(speaker|headphone|earbud)\b/i.test(title);
  const isRepair = /\b(parts?|repair|for parts|locked|display assembly|battery|fan)\b/i.test(title);
  const isInput = /\b(keyboard|mouse|trackpad)\b/i.test(title);
  const isCase = /\b(case|cover|sleeve|bag)\b/i.test(title);
  const isCable = /\b(charger|charging|adapter|cable|cord)\b/i.test(title);
  const isDock = /\b(dock|hub|stand)\b/i.test(title);
  const isOffice = /\b(shredder|printer|scanner)\b/i.test(title);
  const isMonitor = /\bmonitor\b/i.test(title)
    || (!isCable && /\b(lcd|led)\b.*\b(display|screen)\b|\b(display|screen)\b.*\b(lcd|led)\b/i.test(title));
  const subcategory = isAudio ? "Speakers & audio"
    : isRepair ? "Parts & repair"
      : isInput ? "Keyboards & mice"
        : isCase ? "Cases & sleeves"
          : isCable ? "Chargers & adapters"
            : isDock ? "Docks & stands"
              : isOffice ? "Office equipment"
                : isMonitor ? "Monitors"
                  : lower.includes("desktop") || lower.includes("imac") || lower.includes("tower") || lower.includes("pc built") ? "Desktops"
                    : lower.includes("chromebook") || lower.includes("macbook") || lower.includes("laptop") || lower.includes("notebook") ? "Laptops"
                      : lower.includes("gpu") || lower.includes("graphics") || lower.includes("motherboard") || lower.includes("ram") || lower.includes("ssd") || lower.includes("hard drive") || lower.includes("processor") || lower.includes("cpu") ? "Components"
                        : "Other computer gear";
  const itemType = ["Laptops", "Desktops", "Monitors", "Components"].includes(subcategory) && !computerAccessoryPattern.test(title)
    ? "Computer"
    : "Accessory";
  return {
    ...listing,
    itemType,
    subcategory,
    brand: firstMatch(title, computerBrands),
    year: Number(title.match(/\b(20[0-3]\d|19[9]\d)\b/)?.[1]) || null,
    screen: Number(title.match(/\b(11|12|13|14|15|16|17|19|20|21|22|24|27|32)(?:\s?\"|\s?inch|\s?in\b)/i)?.[1]) || null,
    ramGb: Number(title.match(/\b(4|8|12|16|24|32|64)\s?gb\s?(?:ram|memory)?/i)?.[1]) || null,
    storageGb: Number(title.match(/\b(128|256|500|512|1000|1tb|2tb)\s?(?:gb|tb)?\s?(?:ssd|storage|drive)?/i)?.[1]?.replace("1tb", "1000").replace("2tb", "2000")) || null,
    condition: inferCondition(title)
  };
}

function normalizeElectronics(listing) {
  const title = listing.title;
  const lower = title.toLowerCase();
  return {
    ...listing,
    subcategory: lower.includes("headphone") || lower.includes("airpod") || lower.includes("earbud") ? "Headphones"
      : lower.includes("speaker") || lower.includes("receiver") || lower.includes("amplifier") || lower.includes("amp") || lower.includes("soundbar") ? "Audio"
        : lower.includes("tv") || lower.includes("oled") || lower.includes("monitor") || lower.includes("projector") ? "TV & video"
          : lower.includes("camera") || lower.includes("lens") || lower.includes("canon") || lower.includes("nikon") ? "Cameras"
            : lower.includes("xbox") || lower.includes("playstation") || lower.includes("nintendo") ? "Gaming"
              : lower.includes("charger") || lower.includes("adapter") || lower.includes("cable") ? "Accessories"
                : "Other electronics",
    brand: firstMatch(title, electronicsBrands),
    condition: inferCondition(title)
  };
}

function normalizePhone(listing) {
  const title = listing.title;
  const lower = title.toLowerCase();
  const brand = firstMatch(title, phoneBrands);
  const isAccessory = phoneAccessoryPattern.test(title);
  const itemType = isAccessory ? "Accessory" : "Phone";
  return {
    ...listing,
    itemType,
    subcategory: isAccessory
      ? lower.includes("case") || lower.includes("cover") ? "Cases & covers"
        : lower.includes("charger") || lower.includes("cable") || lower.includes("adapter") ? "Chargers & cables"
          : lower.includes("screen protector") || lower.includes("protector") ? "Screen protectors"
            : lower.includes("airpod") || lower.includes("earbud") || lower.includes("headphone") || lower.includes("soundbar") || lower.includes("subwoofer") ? "Audio accessories"
              : "Phone accessories"
      : lower.includes("iphone") ? "iPhone"
        : lower.includes("samsung") || lower.includes("galaxy") ? "Samsung Galaxy"
          : lower.includes("pixel") || lower.includes("google") ? "Google Pixel"
            : "Other phones",
    brand: brand === "iPhone" ? "Apple" : brand === "Moto" ? "Motorola" : brand,
    storageGb: Number(title.match(/\b(32|64|128|256|512|1000)\s?(?:gb|gigs?)\b/i)?.[1]) || null,
    condition: inferCondition(title),
    unlocked: /\bunlocked\b/i.test(title)
  };
}

function inferCondition(title) {
  if (/\b(new|sealed|brand new)\b/i.test(title)) return "New";
  if (/\b(excellent|mint|like new)\b/i.test(title)) return "Excellent";
  if (/\b(good|works well)\b/i.test(title)) return "Good";
  if (/\b(fair|needs|parts|repair)\b/i.test(title)) return "Fair";
  return null;
}

async function fetchCategory(category, config) {
  const response = await fetch(config.url, {
    headers: {
      "accept": "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 (compatible; BetterCraigslistDataBot/1.0)"
    }
  });
  if (!response.ok) throw new Error(`${category} returned HTTP ${response.status}`);
  const html = await response.text();
  const listings = parseSearchResults(html, category).slice(0, config.limit);
  if (listings.length < config.limit) {
    throw new Error(`${category} produced ${listings.length}/${config.limit} listings`);
  }
  return mapWithConcurrency(listings, 5, fetchListingImages);
}

const allListings = [];
const sourceUrls = {};

for (const [category, config] of Object.entries(categories)) {
  const listings = await fetchCategory(category, config);
  allListings.push(...listings);
  sourceUrls[category] = config.url;
  console.log(`${category}: ${listings.length}`);
}

const payload = {
  generatedAt: new Date().toISOString(),
  mode: "craigslist-live-snapshot",
  source: "Fetched from Craigslist New York search result pages. Each category is capped at 20 listings.",
  sourceUrls,
  listings: allListings
};

await mkdir("data", { recursive: true });
await writeFile("data/listings.json", `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${allListings.length} listings to data/listings.json`);
