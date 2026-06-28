/**
 * Feature walkthrough recorder — Super Admin.
 *
 * Logs in as the Super Admin (full access to every module), selects the DEMO
 * institution, tours every screen, and performs the key actions. Records the
 * session to video and converts it to MP4 with ffmpeg (if installed).
 *
 * Setup + run (see SETUP.md §11):
 *   npm i -D playwright
 *   npx playwright install chromium
 *   brew install ffmpeg            # macOS (optional, for .mp4); apt-get install ffmpeg on Linux
 *   npm run db:setup               # schema + seed + demo data
 *   npm run dev                    # in a separate terminal
 *   npm run demo:record            # → recordings/walkthrough.mp4
 *
 * Env overrides:
 *   APP_URL   (default http://localhost:3000)
 *   DEMO_EMAIL / DEMO_PASSWORD (default superadmin@demo.edu / Admin@123)
 *   DEMO_INSTITUTION_ID (default the seeded DEMO tenant)
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync } from "node:fs";
import { resolve } from "node:path";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const EMAIL = process.env.DEMO_EMAIL ?? "superadmin@demo.edu";
const PASSWORD = process.env.DEMO_PASSWORD ?? "Admin@123";
const INSTITUTION_ID = process.env.DEMO_INSTITUTION_ID ?? "00000000-0000-0000-0000-000000000001";

const OUT_DIR = resolve("recordings");
const SIZE = { width: 1440, height: 900 };

// Every screen, in order.
const ROUTES = [
  ["Executive Dashboard", "/dashboard"],
  ["Students", "/students"],
  ["Admissions", "/admissions"],
  ["Subjects", "/subjects"],
  ["Departments", "/departments"],
  ["Attendance", "/attendance"],
  ["Internal Marks", "/internal-marks"],
  ["Semester Results", "/semester-results"],
  ["Companies", "/companies"],
  ["Recruitment Drives", "/recruitment-drives"],
  ["Placements", "/placements"],
  ["Risk", "/risk"],
  ["Statistics", "/stats"],
  ["Recommendations", "/recommendations"],
  ["Reports", "/reports"],
  ["Institutions", "/institutions"],
  ["Users", "/users"],
  ["Roles & Permissions", "/roles"],
  ["Audit Logs", "/audit-logs"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: OUT_DIR, size: SIZE } });
  // Super Admin is global → preset the active tenant so institution-scoped data loads.
  await context.addInitScript((id) => window.localStorage.setItem("active_institution_id", id), INSTITUTION_ID);
  const page = await context.newPage();

  // ---- Login (Super Admin — no institution code) ----
  console.log(`Logging in as ${EMAIL}…`);
  await page.goto(`${APP_URL}/login`, { waitUntil: "networkidle" });
  await fill(page, 'input[type="email"]', EMAIL);
  await fill(page, 'input[type="password"]', PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 }).catch(() => {});
  await sleep(1500);

  await clickIfPresent(page, page.getByRole("button", { name: /refresh data/i }));
  await sleep(2500);

  // ---- Tour every screen ----
  for (const [label, path] of ROUTES) {
    console.log(`• ${label}`);
    await page.goto(`${APP_URL}${path}`, { waitUntil: "networkidle" }).catch(() => {});
    await sleep(2000);
  }

  // ---- Exercise key features ----
  await safe("create form", async () => {
    await page.goto(`${APP_URL}/students`, { waitUntil: "networkidle" });
    await clickIfPresent(page, page.getByRole("button", { name: /^\+ new$/i }));
    await sleep(2000);
    await page.keyboard.press("Escape");
  });
  await safe("bulk upload modal", async () => {
    await clickIfPresent(page, page.getByRole("button", { name: /bulk upload/i }));
    await sleep(1800);
    await page.keyboard.press("Escape");
  });
  await safe("student detail", async () => {
    await page.goto(`${APP_URL}/students`, { waitUntil: "networkidle" });
    await clickIfPresent(page, page.getByRole("link", { name: /view/i }));
    await sleep(2200);
  });
  await safe("drive eligibility recompute", async () => {
    await page.goto(`${APP_URL}/recruitment-drives`, { waitUntil: "networkidle" });
    await clickIfPresent(page, page.getByRole("link", { name: /manage/i }));
    await sleep(1500);
    await clickIfPresent(page, page.getByRole("button", { name: /recompute/i }));
    await sleep(2500);
  });
  await safe("run statistics test", async () => {
    await page.goto(`${APP_URL}/stats`, { waitUntil: "networkidle" });
    await clickIfPresent(page, page.getByRole("button", { name: /^run /i }));
    await sleep(2500);
  });
  await safe("generate recommendations", async () => {
    await page.goto(`${APP_URL}/recommendations`, { waitUntil: "networkidle" });
    await clickIfPresent(page, page.getByRole("button", { name: /^generate$/i }));
    await sleep(2500);
  });
  await safe("generate report", async () => {
    await page.goto(`${APP_URL}/reports`, { waitUntil: "networkidle" });
    await clickIfPresent(page, page.getByRole("button", { name: /generate & download/i }));
    await sleep(2500);
  });
  await safe("risk assessment", async () => {
    await page.goto(`${APP_URL}/risk`, { waitUntil: "networkidle" });
    await clickIfPresent(page, page.getByRole("button", { name: /run assessment/i }));
    await sleep(2200);
  });

  // ---- Finalise video ----
  const video = page.video();
  await context.close();
  await browser.close();

  let webm = video ? await video.path() : null;
  if (webm && existsSync(webm)) {
    const named = resolve(OUT_DIR, "walkthrough.webm");
    renameSync(webm, named);
    console.log(`\nSaved ${named}`);
    toMp4(named, resolve(OUT_DIR, "walkthrough.mp4"));
  } else {
    console.warn("No video produced.");
  }
}

async function fill(page, selector, value) {
  const el = page.locator(selector).first();
  if (await el.count()) await el.fill(value);
}
async function clickIfPresent(page, locator) {
  try { if (await locator.first().isVisible()) await locator.first().click(); } catch { /* ignore */ }
}
async function safe(label, fn) {
  try { await fn(); } catch (e) { console.warn(`skip ${label}: ${e.message}`); }
}
function toMp4(webm, mp4) {
  try {
    execSync(`ffmpeg -y -i "${webm}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${mp4}"`, { stdio: "inherit" });
    console.log(`\n✓ MP4 ready: ${mp4}`);
  } catch {
    console.warn(`\nffmpeg not found — kept ${webm}. Convert later with:\n  ffmpeg -i "${webm}" "${mp4}"`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
