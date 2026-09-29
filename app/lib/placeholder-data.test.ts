import { describe, expect, it } from "vitest";
import { customers, invoices, revenue, users } from "./placeholder-data";

describe("placeholder data", () => {
  it("provides complete sample datasets", () => {
    expect(users).toHaveLength(1);
    expect(customers).toHaveLength(6);
    expect(invoices).toHaveLength(13);
    expect(revenue).toHaveLength(12);
  });

  it("references existing customers from every invoice", () => {
    const customerIds = new Set(customers.map(({ id }) => id));

    expect(
      invoices.every(({ customer_id }) => customerIds.has(customer_id)),
    ).toBe(true);
  });
});
