import { describe, expect, it } from "vitest";
import {
  createFeedbackButton,
  defaultFeedbackUrl,
  deviceInfo,
  feedbackLength,
  FEEDBACK_TEXT,
} from "./feedback.ts";
import { feedbackUrlFor } from "./vite.ts";

const UA = {
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
  android:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.58 Mobile Safari/537.36",
  windowsEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68",
  firefox: "Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
};

describe("Feedback im Browser (Spec 004)", () => {
  it("FEEDBACK-AK-19: Geräteinfo ist grob", () => {
    expect(deviceInfo(UA.iphone, 390, 664, true)).toEqual({
      mobile: true,
      touch: true,
      viewport: "400x700",
      browser: "Safari 18",
      os: "iOS",
    });
    // iPad meldet sich als Mac, hat aber Touch
    expect(deviceInfo(UA.ipad, 1024, 1366, true)).toMatchObject({ os: "iOS", mobile: true });
    expect(deviceInfo(UA.ipad, 1440, 900, false)).toMatchObject({ os: "macOS", mobile: false });
    expect(deviceInfo(UA.android, 412, 915, true)).toMatchObject({
      browser: "Chrome 130",
      os: "Android",
      mobile: true,
      viewport: "400x900",
    });
    expect(deviceInfo(UA.windowsEdge, 1920, 1080, false)).toEqual({
      mobile: false,
      touch: false,
      viewport: "1900x1100",
      browser: "Edge 130",
      os: "Windows",
    });
    expect(deviceInfo(UA.firefox, 1280, 720, false)).toMatchObject({
      browser: "Firefox 132",
      os: "Linux",
    });
    expect(deviceInfo("Komischer Bot", 10, 10, false)).toMatchObject({
      browser: "Unbekannt",
      os: "Unbekannt",
      viewport: "0x0",
    });
    // nie der ganze User-Agent
    const all = JSON.stringify(Object.values(UA).map((u) => deviceInfo(u, 800, 600, false)));
    expect(all).not.toMatch(/Mozilla|AppleWebKit|KHTML/);
  });

  it("FEEDBACK-AK-19: ohne Adresse kein Knopf", () => {
    expect(defaultFeedbackUrl()).toBe("");
    expect(createFeedbackButton({ game: "snake", gameVersion: "1.0.0", title: "Snake" })).toBe(
      null,
    );
    expect(
      createFeedbackButton({ game: "snake", gameVersion: "1.0.0", title: "Snake", url: "" }),
    ).toBe(null);
  });

  it("FEEDBACK-AK-19: Adresse steht zentral in .env.production", () => {
    // Vitest kann VITE_*-Werte in process.env setzen; die gehen bei loadEnv vor
    delete process.env.VITE_FEEDBACK_URL;
    expect(feedbackUrlFor("production")).toBe("https://dampf.dw-a6b.workers.dev/feedback");
    expect(feedbackUrlFor("development")).toBe("http://localhost:8787/feedback");
  });

  it("FEEDBACK-AK-15: zählt wie der Server", () => {
    expect(feedbackLength("  ab  ")).toBe(2);
    expect(feedbackLength("🦔🦔🦔")).toBe(3);
    expect(FEEDBACK_TEXT.heading("Waldlager")).toBe("Sag uns deine Meinung zu Waldlager!");
  });
});
