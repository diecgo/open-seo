import { expect, it } from "vitest";
import {
  backlinksFilterBudgetError,
  EMPTY_BACKLINKS_FILTERS,
} from "./backlinksFilterTypes";

it("preserves seven saved conditions and offers recovery before a filtered request", () => {
  const values = { ...EMPTY_BACKLINKS_FILTERS, exclude: "a,b,c,d,e,f,g" };
  expect(backlinksFilterBudgetError(values, "subdomains", true)).toContain(
    "elige Todos los enlaces (incluidos los de spam) en Mejores enlaces",
  );
  expect(backlinksFilterBudgetError(values, "subdomains", false)).toBeNull();
});

it("accounts for subfolder conditions and accepts the exact remaining budget", () => {
  const values = { ...EMPTY_BACKLINKS_FILTERS, exclude: "a,b" };
  expect(backlinksFilterBudgetError(values, "subfolder", true)).toBeNull();
  expect(
    backlinksFilterBudgetError(
      { ...values, exclude: "a,b,c" },
      "subfolder",
      true,
    ),
  ).toContain("límite de 2 condiciones");
});
