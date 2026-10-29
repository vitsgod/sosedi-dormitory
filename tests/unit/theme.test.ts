import { expect, test } from "vitest";
import {
  normalizeTheme,
  resolveTheme,
  themeBootstrap,
} from "../../src/lib/theme";
import { runInNewContext } from "node:vm";
test("invalid stored values use the system preference", () => {
  expect(normalizeTheme("dark")).toBe("dark");
  expect(normalizeTheme("light")).toBe("light");
  expect(normalizeTheme("malformed")).toBe("system");
  expect(normalizeTheme(null)).toBe("system");
});
test("explicit preference overrides OS and system follows OS", () => {
  expect(resolveTheme("light", true)).toBe("light");
  expect(resolveTheme("dark", false)).toBe("dark");
  expect(resolveTheme("system", true)).toBe("dark");
  expect(resolveTheme("system", false)).toBe("light");
});
test.each([
  ["dark", false, "dark"],
  ["light", true, "light"],
  ["invalid", true, "dark"],
  [null, false, "light"],
])("bootstrap applies %s before hydration", (stored, systemDark, expected) => {
  const element = {
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
  };
  const meta = { content: "" };
  runInNewContext(themeBootstrap, {
    localStorage: { getItem: () => stored },
    matchMedia: () => ({ matches: systemDark }),
    document: { documentElement: element, querySelector: () => meta },
  });
  expect(element.dataset.theme).toBe(expected);
  expect(element.style.colorScheme).toBe(expected);
  expect(meta.content).toBe(expected === "dark" ? "#101722" : "#f3f5f8");
});
test("blocked storage still applies system dark mode", () => {
  const meta = { content: "" };
  const element = {
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
  };
  runInNewContext(themeBootstrap, {
    localStorage: {
      getItem: () => {
        throw Error("blocked");
      },
    },
    matchMedia: () => ({ matches: true }),
    document: { documentElement: element, querySelector: () => meta },
  });
  expect(element.dataset.theme).toBe("dark");
  expect(meta.content).toBe("#101722");
});
