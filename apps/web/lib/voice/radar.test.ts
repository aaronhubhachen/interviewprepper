import { describe, expect, it } from "vitest";
import { labelPlacement, radarPoint, radarPolygon, ringPolygon, sparklinePoints, splitLabel } from "./radar";
import { pickVoice, recognitionLang } from "./voices";

const center = { x: 100, y: 100 };

describe("radar geometry", () => {
  it("puts the first axis straight up and goes clockwise", () => {
    expect(radarPoint(0, 6, 100, 50, center)).toEqual({ x: 100, y: 50 });
    const second = radarPoint(1, 6, 100, 50, center);
    expect(second.x).toBeGreaterThan(100);
    expect(second.y).toBeLessThan(100);
    expect(radarPoint(3, 6, 100, 50, center)).toEqual({ x: 100, y: 150 });
  });

  it("scales by value and clamps out-of-range scores", () => {
    expect(radarPoint(0, 6, 50, 50, center)).toEqual({ x: 100, y: 75 });
    expect(radarPoint(0, 6, 250, 50, center)).toEqual({ x: 100, y: 50 });
    expect(radarPoint(0, 6, -10, 50, center)).toEqual(center);
    expect(radarPoint(0, 6, Number.NaN, 50, center)).toEqual(center);
  });

  it("builds closed polygons and grid rings", () => {
    expect(radarPolygon([100, 100, 100, 100], 10, center)).toBe("100,90 110,100 100,110 90,100");
    expect(ringPolygon(0.5, 4, 10, center)).toBe("100,95 105,100 100,105 95,100");
  });

  it("anchors labels away from the chart", () => {
    expect(labelPlacement(0, 6, 50, center).anchor).toBe("middle");
    expect(labelPlacement(1, 6, 50, center).anchor).toBe("start");
    expect(labelPlacement(4, 6, 50, center).anchor).toBe("end");
    expect(labelPlacement(0, 6, 50, center).dy).toBeLessThan(0);
    expect(labelPlacement(3, 6, 50, center).dy).toBeGreaterThan(0);
  });

  it("splits long labels into two balanced lines", () => {
    expect(splitLabel("Technical depth")).toEqual(["Technical", "depth"]);
    expect(splitLabel("Impact")).toEqual(["Impact"]);
    expect(splitLabel("Conciseness")).toEqual(["Conciseness"]);
  });

  it("lays out sparkline points left to right, high scores near the top", () => {
    const points = sparklinePoints([0, 100], 100, 50, 5);
    expect(points).toEqual([
      { x: 5, y: 45 },
      { x: 95, y: 5 },
    ]);
    expect(sparklinePoints([50], 100, 50, 5)).toEqual([{ x: 50, y: 25 }]);
    expect(sparklinePoints([], 100, 50)).toEqual([]);
  });
});

describe("voices", () => {
  const voices = [
    { name: "Microsoft David - English (United States)", lang: "en-US", default: true },
    { name: "Google Deutsch", lang: "de-DE" },
    { name: "Microsoft Aria Online (Natural) - English (United States)", lang: "en-US" },
    { name: "Google UK English Female", lang: "en-GB" },
  ];

  it("prefers natural English voices", () => {
    expect(pickVoice(voices)?.name).toMatch(/Natural/);
    expect(pickVoice(voices.slice(0, 2))?.name).toMatch(/David/);
    expect(pickVoice([{ name: "Google Deutsch", lang: "de-DE" }])?.name).toBe("Google Deutsch");
    expect(pickVoice([])).toBeNull();
  });

  it("recognizes in the user's English locale, else US English", () => {
    expect(recognitionLang("en-GB")).toBe("en-GB");
    expect(recognitionLang("de-DE")).toBe("en-US");
    expect(recognitionLang(undefined)).toBe("en-US");
  });
});
