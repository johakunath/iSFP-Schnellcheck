const { test, expect } = require("@playwright/test");
const path = require("path");

const APP = `file://${path.join(__dirname, "../../dist/index.html")}`;

// ─── helpers ──────────────────────────────────────────────────────────────

async function loadApp(page) {
  await page.goto(APP);
  await page.waitForSelector("#root", { state: "attached" });
  // ErrorBoundary renders a "Unbehandelte Ausnahme" message — make sure it's absent
  await expect(page.locator("text=Unbehandelte Ausnahme")).not.toBeVisible();
}

async function selectPreset(page, labelText) {
  await page.locator(`button:has-text("${labelText}")`).first().click();
  // Wait for React to re-render derived state
  await page.waitForTimeout(300);
}

// ─── Suite ────────────────────────────────────────────────────────────────

test("app loads without ErrorBoundary", async ({ page }) => {
  await loadApp(page);
  await expect(page.locator("#root")).not.toBeEmpty();
  // Use the exact main heading (font-serif div), not any substring match
  await expect(page.locator(".font-serif").filter({ hasText: /^iSFP-Schnellcheck$/ })).toBeVisible();
});

test("efhNachkrieg preset: IST EEK badge shows G", async ({ page }) => {
  await loadApp(page);
  await selectPreset(page, "EFH Nachkriegszeit 1965");
  // The IST EEK class "G" appears in the Ergebnis section
  await expect(page.locator("#ergebnis").getByText("G").first()).toBeVisible();
});

// Sidebar "Ergebnis · Live" (desktop layout) — label/value pairs of the investment summary
async function sidebarSumme(page, label) {
  const row = page.locator("aside div.flex.justify-between").filter({ hasText: new RegExp(`^${label}`) }).first();
  return (await row.locator("span").last().innerText()).trim();
}

test("efhNachkrieg default selection: EEK A, Eigenanteil 112.600 € (BEG 2026)", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await loadApp(page);
  await selectPreset(page, "EFH Nachkriegszeit 1965");
  expect(await sidebarSumme(page, "Investition")).toMatch(/139[.,]800/);
  expect(await sidebarSumme(page, "Förderung")).toMatch(/27[.,]200/);
  expect(await sidebarSumme(page, "Eigenanteil")).toMatch(/112[.,]600/);
  await expect(page.locator("#fahrplan").getByText("Kl. A", { exact: true })).toBeVisible();
});

test("first load and clicking the same preset show identical results", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await loadApp(page);
  const vorher = await page.locator("aside").innerText();
  await selectPreset(page, "EFH Nachkriegszeit 1965");
  expect(await page.locator("aside").innerText()).toBe(vorher);
});

test("per-measure BEG amounts add up to the package Förderung", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await loadApp(page);
  await selectPreset(page, "EFH Nachkriegszeit 1965");
  const block = page.locator("[id='paket-P3']");
  const zahl = t => Number(t.replace(/[^\d]/g, ""));
  const zeilen = await block.getByText(/% BEG → −/).allInnerTexts();
  const summeZeilen = zeilen.map(t => zahl(t.split("−")[1])).reduce((a, b) => a + b, 0);
  const paketFoerderung = zahl(await block.getByText(/^− [\d.]+ €$/).first().innerText());
  expect(zeilen.length).toBe(3);
  expect(Math.abs(summeZeilen - paketFoerderung)).toBeLessThanOrEqual(2);
});

test("toggling a package off changes its button label", async ({ page }) => {
  await loadApp(page);
  await selectPreset(page, "EFH Nachkriegszeit 1965");

  // Scroll the first PaketBlock into view and click its toggle
  const paketBlocks = page.locator("[id^='paket-']");
  const firstBlock = paketBlocks.first();
  await firstBlock.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);

  const toggleBtn = firstBlock.getByText("Im Fahrplan");
  await expect(toggleBtn).toBeVisible({ timeout: 5000 });
  await toggleBtn.click();
  await page.waitForTimeout(150);

  await expect(firstBlock.getByText("Ausgeblendet")).toBeVisible();
});

test("MassnahmenEditor: override M4 Investition updates Eigenanteil", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await loadApp(page);
  await selectPreset(page, "EFH Nachkriegszeit 1965");

  // Open the MassnahmenEditor collapsible
  const trigger = page.locator("text=Maßnahmen-Datenbank").first();
  await trigger.click();
  await page.waitForTimeout(300);

  // Find the Wärmepumpe row's investition input
  const m4Row = page.locator("tr").filter({ hasText: /Wärmepumpe/ }).first();
  const investInput = m4Row.locator("input[type=number]").first();

  await expect(investInput).toHaveValue("29000"); // monoenergetisch variant price, not an override
  await investInput.fill("20000");
  await page.waitForTimeout(200);
  // M4 20.000 € × 46 % = 9.200 € instead of 28.000 € (cap) × 46 % = 12.880 € → Eigenanteil 112.600 − 9.000 + 3.680
  await expect(page.locator("aside").getByText(/107[.,]280/).first()).toBeVisible();
});

test("print report section is present in DOM with ÜBERBLICK heading", async ({ page }) => {
  await loadApp(page);
  await selectPreset(page, "EFH Nachkriegszeit 1965");
  // ISFPPrintReport renders with class print-only (screen-hidden, DOM-present)
  const printReport = page.locator(".print-only").first();
  await expect(printReport).toBeAttached();
  await expect(printReport.getByText("ÜBERBLICK", { exact: true })).toBeAttached();
});

test("Förderannahmen: later heating application lowers the subsidy", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await loadApp(page);
  await page.locator("button", { hasText: "Förderannahmen" }).click();
  await page.locator('select[aria-label="Antrag Heizungstausch"]').selectOption({ label: "08/2028–01/2029" });
  await page.waitForTimeout(150);
  // M4: 25.000 € cap × 30 %, no Klimageschwindigkeitsbonus → 7.500 € instead of 12.880 €
  expect(await sidebarSumme(page, "Förderung")).toMatch(/21[.,]820/);
});
