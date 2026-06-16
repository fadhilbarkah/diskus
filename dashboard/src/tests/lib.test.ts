import { beforeEach, describe, expect, it } from "vitest";
import { authState, logout, setAuth, updateUser } from "../lib/auth";
import { selectedSiteId, theme, userSites } from "../lib/store";

describe("Dashboard Auth Lib", () => {
  beforeEach(() => {
    logout();
  });

  it("should have null token initially", () => {
    expect(authState.token.value).toBeNull();
    expect(authState.user.value).toBeNull();
    expect(authState.isLoggedIn.value).toBe(false);
  });

  it("should setAuth correctly", () => {
    setAuth("my-token", { id: "1", email: "test@test.com", role: "admin" });
    expect(authState.token.value).toBe("my-token");
    expect(authState.user.value?.email).toBe("test@test.com");
    expect(authState.isLoggedIn.value).toBe(true);
  });

  it("should update user correctly", () => {
    setAuth("my-token", { id: "1", email: "test@test.com", role: "admin" });
    updateUser({ name: "John" });
    expect(authState.user.value?.name).toBe("John");
  });

  it("should logout correctly", () => {
    setAuth("my-token", { id: "1", email: "test@test.com", role: "admin" });
    logout();
    expect(authState.token.value).toBeNull();
  });
});

describe("Dashboard Store Lib", () => {
  it("should manage userSites and selectedSiteId", () => {
    userSites.value = [{ id: "site-1" }];
    selectedSiteId.value = "site-1";
    expect(userSites.value.length).toBe(1);
    expect(localStorage.getItem("diskus_selected_site_id")).toBe("site-1");
  });

  it("should manage theme", () => {
    theme.value = "dark";
    expect(theme.value).toBe("dark");
    expect(localStorage.getItem("diskus_theme")).toBe("dark");
  });
});
