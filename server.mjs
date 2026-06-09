import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);

const craigslistSources = {
  cars: "https://newyork.craigslist.org/search/cta?query=BMW%20X3&max_price=25000",
  housing: "https://newyork.craigslist.org/search/apa?query=brooklyn%201%20br&max_price=2500",
  computers: "https://newyork.craigslist.org/search/sya?query=macbook&max_price=300"
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function decodeHtml(value = "") {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function moneyToNumber(value) {
  if (typeof value === "number") return value;
  if (!value) return null;
  const clean = String(value).replace(/[^\d.]/g, "");
  return clean ? Math.round(Number(clean)) : null;
}

function extractJsonLd(html) {
  const match = html.match(/<script[^>]+id=["']ld_searchpage_results["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1].trim());
    return Array.isArray(parsed.itemListElement) ? parsed.itemListElement : [];
  } catch {
    return [];
  }
}

function extractStaticResults(html) {
  const results = [];
  const pattern = /<li class="cl-static-search-result" title="([^"]*)">\s*<a href="([^"]+)">[\s\S]*?<div class="title">([\s\S]*?)<\/div>[\s\S]*?<div class="price">\s*([^<]*)<\/div>[\s\S]*?<div class="location">\s*([^<]*)<\/div>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    results.push({
      title: decodeHtml(match[3] || match[1]),
      url: decodeHtml(match[2]),
      price: moneyToNumber(match[4]),
      location: decodeHtml(match[5])
    });
  }
  return results;
}

function firstImage(item) {
  if (Array.isArray(item.image) && item.image.length) return item.image[0];
  if (typeof item.image === "string") return item.image;
  return null;
}

function listingId(category, url, index) {
  const fromUrl = url?.match(/\/(\d+)\.html/i)?.[1];
  return fromUrl ? `${category}-${fromUrl}` : `${category}-live-${index}`;
}

function inferYear(title) {
  const years = String(title).match(/\b(19[7-9]\d|20[0-3]\d)\b/g);
  return years ? Number(years[0]) : null;
}

function inferMake(title) {
  const makes = ["BMW", "Toyota", "Honda", "Ford", "Cadillac", "Hyundai", "Land Rover", "Fiat"];
  const lower = title.toLowerCase();
  return makes.find((make) => lower.includes(make.toLowerCase())) || null;
}

function inferModel(title, make) {
  const lower = title.toLowerCase();
  const models = {
    BMW: ["X3", "X5", "X7", "X6", "M3", "3 Series", "5 Series", "2 Series"],
    Toyota: ["RAV4", "Tacoma", "FJ Cruiser"],
    Honda: ["Civic", "Accord", "CR-V"],
    Ford: ["Mustang", "Transit", "F450", "Focus"]
  };
  const options = models[make] || Object.values(models).flat();
  return options.find((model) => lower.includes(model.toLowerCase())) || null;
}

function inferBody(title) {
  const lower = title.toLowerCase();
  if (/(suv|x3|x5|x6|x7|rav4|explorer|range rover|cr-v)/.test(lower)) return "SUV";
  if (/(truck|pickup|tacoma|f450|transit|box truck|van)/.test(lower)) return "Truck";
  if (/(coupe|mustang|convertible)/.test(lower)) return "Coupe";
  if (/(wagon|hatch)/.test(lower)) return "Wagon";
  if (/(sedan|series|sonata|civic|accord|fiat)/.test(lower)) return "Sedan";
  return null;
}

function inferBedrooms(title, item) {
  if (Number.isFinite(item?.numberOfBedrooms)) return Number(item.numberOfBedrooms);
  const lower = String(title).toLowerCase();
  if (lower.includes("studio")) return 0;
  const match = lower.match(/\b([1-4])\s*(bed|br|bedroom)\b/);
  return match ? Number(match[1]) : null;
}

function inferComputerSpecs(title) {
  const lower = String(title).toLowerCase();
  const screen = lower.match(/\b(11|12|13|13\.3|14|15|15\.4|16)\s*(inch|in|")\b/);
  const ram = lower.match(/\b(4|8|16|24|32)\s*g(?:b)?\s*(ram)?\b/);
  const storage = lower.match(/\b(64|128|250|256|500|512|1000|1tb)\s*(gb|g|tb)?\b/);
  return {
    brand: /apple|macbook/.test(lower) ? "Apple" : inferMake(title),
    subcategory: /(case|cover|sleeve|bag|keyboard|adapter|stand|dock|speaker|display assembly|parts)/.test(lower) ? "Accessories" : "Laptops",
    screen: screen ? Math.round(Number(screen[1])) : null,
    ramGb: ram ? Number(ram[1]) : null,
    storageGb: storage ? (String(storage[1]).toLowerCase() === "1tb" ? 1000 : Number(storage[1])) : null,
    condition: /(new|sealed|open box)/.test(lower) ? "Open box" : /(excellent|like new|10\/10)/.test(lower) ? "Excellent" : "Good"
  };
}

function normalizeListing(category, element, staticResult, index) {
  const item = element?.item || {};
  const offers = item.offers || {};
  const place = offers.availableAtOrFrom || {};
  const address = item.address || place.address || {};
  const title = decodeHtml(item.name || staticResult?.title || "Untitled listing");
  const price = moneyToNumber(offers.price ?? staticResult?.price);
  const location = decodeHtml(address.addressLocality || staticResult?.location || "New York");
  const url = staticResult?.url || null;
  const base = {
    id: listingId(category, url, index),
    category,
    title,
    price,
    location,
    url,
    image: firstImage(item),
    source: "Craigslist live",
    sourceUrl: craigslistSources[category]
  };

  if (category === "cars") {
    const make = inferMake(title);
    return {
      ...base,
      year: inferYear(title),
      make,
      model: inferModel(title, make),
      body: inferBody(title),
      mileage: Number(title.match(/([\d,]+)\s*(mi|miles)/i)?.[1]?.replace(/,/g, "")) || null,
      transmission: /manual/i.test(title) ? "Manual" : "Automatic",
      fuel: /electric|ev/i.test(title) ? "Electric" : "Gas",
      drive: /awd|xdrive|4x4/i.test(title) ? "AWD" : null,
      titleStatus: /clean/i.test(title) ? "Clean" : null
    };
  }

  if (category === "housing") {
    const lower = title.toLowerCase();
    return {
      ...base,
      listingType: "For rent",
      bedrooms: inferBedrooms(title, item),
      bathrooms: Number(item.numberOfBathroomsTotal) || null,
      furnished: /furnished/.test(lower),
      leaseTerm: /month.?to.?month/.test(lower) ? "Month-to-month" : "1 year+",
      amenities: [
        /no fee/.test(lower) ? "No fee" : null,
        /renovated/.test(lower) ? "Renovated" : null,
        /kitchen/.test(lower) ? "Kitchen" : null,
        location
      ].filter(Boolean)
    };
  }

  return {
    ...base,
    ...inferComputerSpecs(title)
  };
}

async function fetchCraigslist(category, sourceUrl) {
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 better-craigslist local prototype",
      "Accept": "text/html,application/xhtml+xml"
    }
  });
  if (!response.ok) throw new Error(`${category} source returned ${response.status}`);
  const html = await response.text();
  const elements = extractJsonLd(html);
  const staticResults = extractStaticResults(html);
  return elements
    .map((element, index) => normalizeListing(category, element, staticResults[index], index))
    .filter((listing) => listing.title && listing.price !== null)
    .slice(0, 80);
}

async function fallbackData(errorMessage = null) {
  const data = JSON.parse(await readFile(join(root, "data", "listings.json"), "utf8"));
  return {
    ...data,
    mode: errorMessage ? "seed-fallback" : data.mode,
    error: errorMessage
  };
}

async function listingsResponse() {
  const seed = await fallbackData();
  const categories = Object.entries(craigslistSources);
  const settled = await Promise.allSettled(
    categories.map(async ([category, sourceUrl]) => ({
      category,
      listings: await fetchCraigslist(category, sourceUrl)
    }))
  );
  const errors = [];
  const listings = settled.flatMap((result, index) => {
    const category = categories[index][0];
    if (result.status === "fulfilled" && result.value.listings.length) return result.value.listings;
    errors.push(`${category}: ${result.reason?.message || "empty source"}`);
    return seed.listings.filter((listing) => listing.category === category);
  });
  return {
    generatedAt: new Date().toISOString(),
    mode: errors.length ? "mixed-live" : "live",
    source: errors.length
      ? "Craigslist live search results with per-category seed fallback when a source is unavailable."
      : "Craigslist New York live search results parsed from public search result JSON-LD and static result markup.",
    sourceUrls: craigslistSources,
    errors,
    listings
  }
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const safePath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, safePath);
  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }
  try {
    const body = await readFile(filePath);
    send(res, 200, body, contentTypes[extname(filePath)] || "application/octet-stream");
  } catch {
    send(res, 404, "Not found");
  }
}

const server = createServer(async (req, res) => {
  if (req.url?.startsWith("/api/listings")) {
    try {
      send(res, 200, JSON.stringify(await listingsResponse()), "application/json; charset=utf-8");
    } catch (error) {
      send(res, 500, JSON.stringify({ error: error.message }), "application/json; charset=utf-8");
    }
    return;
  }
  await serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`better craigslist running at http://localhost:${port}`);
});
