import { beforeEach, describe, expect, it } from "vitest";
import { applyTheme, initializeTheme, readTheme } from "./theme";

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
  });

  it("defaults to the true-black dark mode", () => {
    initializeTheme();

    expect(readTheme()).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("keeps Tailwind dark variants disabled in light mode", () => {
    applyTheme("light");

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("uses dark variants for Other and migrates the legacy ocean value", () => {
    localStorage.setItem("dex-theme", "ocean");
    expect(readTheme()).toBe("other");

    applyTheme("other");
    expect(document.documentElement.dataset.theme).toBe("other");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("dex-theme")).toBe("other");
  });
});
