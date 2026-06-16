import { describe, expect, it } from "vitest";
import { globalAuthMode, globalIsGuestReady, globalShowAuthModal } from "../lib/auth";
import { applyHostTheme, hostTheme } from "../lib/theme";

describe("Widget Auth Lib", () => {
  it("should have correct initial values", () => {
    expect(globalAuthMode.value).toBe("login");
    expect(globalShowAuthModal.value).toBe(false);
    expect(globalIsGuestReady.value).toBe(false);
  });

  it("should update values correctly", () => {
    globalAuthMode.value = "guest";
    expect(globalAuthMode.value).toBe("guest");

    globalShowAuthModal.value = true;
    expect(globalShowAuthModal.value).toBe(true);
  });

  it("should set and clear guest auth", () => {
    import("../lib/auth").then((mod) => {
      mod.setGuestAuth("Guest", "guest@test.com");
      expect(mod.globalGuestName.value).toBe("Guest");
      expect(mod.globalIsGuestReady.value).toBe(true);

      mod.clearGuestAuth();
      expect(mod.globalGuestName.value).toBe("");
      expect(mod.globalIsGuestReady.value).toBe(false);
    });
  });

  it("should set and clear widget auth", () => {
    import("../lib/auth").then((mod) => {
      mod.setWidgetAuth("token", { id: "1", email: "e", name: "n" });
      expect(mod.widgetToken.value).toBe("token");
      expect(mod.widgetUser.value?.name).toBe("n");

      mod.logoutWidget();
      expect(mod.widgetToken.value).toBeNull();
    });
  });
});

describe("Widget Theme Lib", () => {
  it("should manage hostTheme", () => {
    applyHostTheme("dark");
    expect(hostTheme.value).toBe("dark");
  });
});
