import { describe, expect, it } from "vitest";
import {
  CALLING_REGIONS,
  callingRegionByIso,
  defaultCallingRegion,
  formatPhoneDisplay,
  searchCallingRegions,
  toE164,
} from "@/lib/calling-codes";

function region(iso: string) {
  const found = callingRegionByIso(iso);
  expect(found, iso).toBeTruthy();
  return found!;
}

describe("calling codes", () => {
  it("lists standard calling codes, including Hong Kong +852", () => {
    const isos = CALLING_REGIONS.map((item) => item.iso);
    expect(new Set(isos).size).toBe(isos.length);
    expect(CALLING_REGIONS.map((item) => item.name)).toEqual(
      [...CALLING_REGIONS.map((item) => item.name)].sort((a, b) => a.localeCompare(b, "en")),
    );
    for (const item of CALLING_REGIONS) {
      expect(item.iso).toMatch(/^[A-Z]{2}$/);
      expect(item.dial).toMatch(/^[1-9]\d{0,2}$/);
      expect(item.name.trim()).toBe(item.name);
    }
    expect(CALLING_REGIONS.filter((item) => item.dial === "852").map((item) => item.iso)).toEqual(["HK"]);
    expect(
      Object.fromEntries(
        ["HK", "MO", "CN", "TW", "SG", "JP", "KR", "IN", "AU", "GB", "US", "CA", "DE", "FR"].map((iso) => [
          iso,
          region(iso).dial,
        ]),
      ),
    ).toEqual({
      HK: "852",
      MO: "853",
      CN: "86",
      TW: "886",
      SG: "65",
      JP: "81",
      KR: "82",
      IN: "91",
      AU: "61",
      GB: "44",
      US: "1",
      CA: "1",
      DE: "49",
      FR: "33",
    });
  });

  it("searches by country, alias, and calling code", () => {
    expect(searchCallingRegions("852").map((item) => item.iso)).toEqual(["HK"]);
    expect(searchCallingRegions("+852").map((item) => item.iso)).toEqual(["HK"]);
    expect(searchCallingRegions("hong").map((item) => item.iso)).toContain("HK");
    expect(searchCallingRegions("hk").map((item) => item.iso)[0]).toBe("HK");
    expect(searchCallingRegions("uk").map((item) => item.iso)).toContain("GB");
    expect(searchCallingRegions("united states")[0]?.iso).toBe("US");
    expect(searchCallingRegions("no-such-country")).toEqual([]);
    expect(searchCallingRegions("").length).toBe(CALLING_REGIONS.length);
  });

  it("falls back to Hong Kong when the locale has no region", () => {
    expect(defaultCallingRegion(["zh-HK"]).iso).toBe("HK");
    expect(defaultCallingRegion(["zh-Hant-HK"]).iso).toBe("HK");
    expect(defaultCallingRegion(["en-US"]).iso).toBe("US");
    expect(defaultCallingRegion(["en-GB"]).iso).toBe("GB");
    expect(defaultCallingRegion(["en"]).iso).toBe("HK");
    expect(defaultCallingRegion([]).iso).toBe("HK");
  });

  it("combines a calling code and national number into E.164", () => {
    const hongKong = toE164(region("HK"), "9123 4567");
    expect(hongKong).toMatchObject({ ok: true, e164: "+85291234567", national: "91234567" });
    expect(toE164(region("HK"), "+852 9123 4567")).toMatchObject({ ok: true, e164: "+85291234567" });
    expect(toE164(region("HK"), "852 9123 4567")).toMatchObject({ ok: true, e164: "+85291234567" });
    expect(toE164(region("HK"), "85291234567")).toMatchObject({ ok: true, e164: "+85291234567" });
    expect(toE164(region("HK"), "00852 9123 4567")).toMatchObject({ ok: true, e164: "+85291234567" });
    expect(toE164(region("US"), "(212) 555-0148")).toMatchObject({ ok: true, e164: "+12125550148" });
    expect(toE164(region("US"), "1 212 555 0148")).toMatchObject({ ok: true, e164: "+12125550148" });
    expect(toE164(region("US"), "+1 212 555 0148")).toMatchObject({ ok: true, e164: "+12125550148" });
    expect(toE164(region("CA"), "212 555 0148")).toMatchObject({ ok: true, e164: "+12125550148" });
    expect(toE164(region("GB"), "07911 123456")).toMatchObject({ ok: true, e164: "+447911123456" });
    expect(toE164(region("GB"), "+44 07911 123456")).toMatchObject({ ok: true, e164: "+447911123456" });
    expect(toE164(region("GB"), "0044 07911 123456")).toMatchObject({ ok: true, e164: "+447911123456" });
    expect(toE164(region("US"), "12125550148")).toMatchObject({ ok: true, e164: "+12125550148" });
    expect(toE164(region("AU"), "0412 345 678")).toMatchObject({ ok: true, e164: "+61412345678" });
    expect(toE164(region("IT"), "06 6981 2345")).toMatchObject({ ok: true, e164: "+390669812345" });
    expect(toE164(region("SG"), "8123 4567")).toMatchObject({ ok: true, e164: "+6581234567" });
    expect(toE164(region("CN"), "138 0013 8000")).toMatchObject({ ok: true, e164: "+8613800138000" });

    if (hongKong.ok) expect(formatPhoneDisplay(hongKong.region, hongKong.national)).toBe("+852 9123 4567");
    const unitedStates = toE164(region("US"), "2125550148");
    if (unitedStates.ok) expect(formatPhoneDisplay(unitedStates.region, unitedStates.national)).toBe("+1 212 555 0148");
  });

  it("does not treat a valid national number as a second copy of the calling code", () => {
    expect(toE164(region("HK"), "8523 4567")).toMatchObject({ ok: true, e164: "+85285234567" });
    expect(toE164(region("US"), "2125550148")).toMatchObject({ ok: true, e164: "+12125550148" });
  });

  it("rejects empty, short, long, and mismatched numbers", () => {
    expect(toE164(region("HK"), "   ").ok).toBe(false);
    expect(toE164(region("HK"), "call me").ok).toBe(false);
    expect(toE164(region("HK"), "12345").ok).toBe(false);
    expect(toE164(region("HK"), "912345678").ok).toBe(false);
    const mismatch = toE164(region("HK"), "+1 212 555 0148");
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.error).toContain("+852");
  });
});
