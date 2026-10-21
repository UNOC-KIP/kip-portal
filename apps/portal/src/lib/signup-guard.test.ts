import { describe, expect, it } from "vitest";
import { clientIp, containsLink, createRateLimiter } from "./signup-guard";

describe("containsLink", () => {
  it("flags the spam payload seen in production", () => {
    expect(containsLink("🔥70k TL bonus alarmi! Kap ve kazan! https://bit.ly/4vbNyPp 🔥")).toBe(true);
  });

  it.each(["www.example.com", "bit.ly/abc", "visit casino.xyz/win", "t.me/channel"])("flags %s", (v) => {
    expect(containsLink(v)).toBe(true);
  });

  it.each(["Nile Industries Limited", "Gulf Petrochem International FZE", "S. Mukasa & Co. Ltd", "", undefined])(
    "accepts %s",
    (v) => {
      expect(containsLink(v)).toBe(false);
    },
  );
});

describe("clientIp", () => {
  it("takes the last forwarded hop", () => {
    expect(clientIp("6.6.6.6, 41.210.1.2", null)).toBe("41.210.1.2");
  });

  it("falls back to x-real-ip, then unknown", () => {
    expect(clientIp(null, "41.210.1.2")).toBe("41.210.1.2");
    expect(clientIp(null, null)).toBe("unknown");
  });
});

describe("createRateLimiter", () => {
  it("allows max hits per window, then refuses until it resets", () => {
    const allow = createRateLimiter(2, 1000);
    expect(allow("ip", 0)).toBe(true);
    expect(allow("ip", 10)).toBe(true);
    expect(allow("ip", 20)).toBe(false);
    expect(allow("other", 20)).toBe(true);
    expect(allow("ip", 1000)).toBe(true);
  });
});
