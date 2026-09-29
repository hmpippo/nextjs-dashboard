import { beforeEach, describe, expect, it, vi } from "vitest";
import { formatCurrency } from "./utils";

const { sqlMock } = vi.hoisted(() => ({
  sqlMock: vi.fn(),
}));

vi.mock("postgres", () => ({
  default: vi.fn(() => sqlMock),
}));

import {
  fetchCardData,
  fetchCustomers,
  fetchFilteredCustomers,
  fetchFilteredInvoices,
  fetchInvoiceById,
  fetchInvoicesPages,
  fetchLatestInvoices,
  fetchRevenue,
} from "./data";

describe("data access functions", () => {
  beforeEach(() => {
    sqlMock.mockReset();
    sqlMock.mockResolvedValue([]);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("loads revenue rows", async () => {
    const revenue = [{ month: "Jan", revenue: 2000 }];
    sqlMock.mockResolvedValueOnce(revenue);

    await expect(fetchRevenue()).resolves.toBe(revenue);
  });

  it("logs and reports revenue query failures", async () => {
    const error = new Error("db unavailable");
    sqlMock.mockRejectedValueOnce(error);

    await expect(fetchRevenue()).rejects.toThrow("Failed to fetch revenue data.");
    expect(console.error).toHaveBeenCalledWith("Database Error:", error);
  });

  it("loads and formats latest invoices", async () => {
    sqlMock.mockResolvedValueOnce([
      {
        id: "invoice-1",
        name: "Ada",
        image_url: "/ada.png",
        email: "ada@example.com",
        amount: 1250,
      },
    ]);

    await expect(fetchLatestInvoices()).resolves.toEqual([
      {
        id: "invoice-1",
        name: "Ada",
        image_url: "/ada.png",
        email: "ada@example.com",
        amount: formatCurrency(1250),
      },
    ]);
  });

  it("reports latest-invoice query failures", async () => {
    sqlMock.mockRejectedValueOnce(new Error("db unavailable"));

    await expect(fetchLatestInvoices()).rejects.toThrow(
      "Failed to fetch the latest invoices.",
    );
  });

  it("loads card totals and formats monetary values", async () => {
    sqlMock
      .mockResolvedValueOnce([{ count: "12" }])
      .mockResolvedValueOnce([{ count: "5" }])
      .mockResolvedValueOnce([{ paid: "12345", pending: "6789" }]);

    await expect(fetchCardData()).resolves.toEqual({
      numberOfInvoices: 12,
      numberOfCustomers: 5,
      totalPaidInvoices: formatCurrency(12345),
      totalPendingInvoices: formatCurrency(6789),
    });
  });

  it("defaults absent card totals to zero", async () => {
    sqlMock
      .mockResolvedValueOnce([{ count: null }])
      .mockResolvedValueOnce([{ count: null }])
      .mockResolvedValueOnce([{ paid: null, pending: null }]);

    await expect(fetchCardData()).resolves.toEqual({
      numberOfInvoices: 0,
      numberOfCustomers: 0,
      totalPaidInvoices: formatCurrency(0),
      totalPendingInvoices: formatCurrency(0),
    });
  });

  it("reports card query failures", async () => {
    sqlMock.mockRejectedValueOnce(new Error("db unavailable"));

    await expect(fetchCardData()).rejects.toThrow("Failed to fetch card data.");
  });

  it("filters invoices and applies page size and offset", async () => {
    const invoices = [{ id: "invoice-1" }];
    sqlMock.mockResolvedValueOnce(invoices);

    await expect(fetchFilteredInvoices("Ada", 3)).resolves.toBe(invoices);
    expect(sqlMock).toHaveBeenCalledOnce();
    expect(sqlMock.mock.calls[0][1]).toBe("%Ada%");
    expect(sqlMock.mock.calls[0][6]).toBe(6);
    expect(sqlMock.mock.calls[0][7]).toBe(12);
  });

  it("reports filtered-invoice query failures", async () => {
    sqlMock.mockRejectedValueOnce(new Error("db unavailable"));

    await expect(fetchFilteredInvoices("Ada", 1)).rejects.toThrow(
      "Failed to fetch invoices.",
    );
  });

  it("calculates invoice page count", async () => {
    sqlMock.mockResolvedValueOnce([{ count: "13" }]);

    await expect(fetchInvoicesPages("Ada")).resolves.toBe(3);
  });

  it("reports invoice-count query failures", async () => {
    sqlMock.mockRejectedValueOnce(new Error("db unavailable"));

    await expect(fetchInvoicesPages("Ada")).rejects.toThrow(
      "Failed to fetch total number of invoices.",
    );
  });

  it("loads an invoice and converts its amount from cents", async () => {
    sqlMock.mockResolvedValueOnce([
      {
        id: "invoice-1",
        customer_id: "customer-1",
        amount: 1250,
        status: "paid",
      },
    ]);

    await expect(fetchInvoiceById("invoice-1")).resolves.toEqual({
      id: "invoice-1",
      customer_id: "customer-1",
      amount: 12.5,
      status: "paid",
    });
  });

  it("returns undefined when no invoice matches", async () => {
    await expect(fetchInvoiceById("missing")).resolves.toBeUndefined();
  });

  it("reports invoice lookup failures", async () => {
    sqlMock.mockRejectedValueOnce(new Error("db unavailable"));

    await expect(fetchInvoiceById("invoice-1")).rejects.toThrow(
      "Failed to fetch invoice.",
    );
  });

  it("loads customers", async () => {
    const customers = [{ id: "customer-1", name: "Ada" }];
    sqlMock.mockResolvedValueOnce(customers);

    await expect(fetchCustomers()).resolves.toBe(customers);
  });

  it("reports customer query failures", async () => {
    const error = new Error("db unavailable");
    sqlMock.mockRejectedValueOnce(error);

    await expect(fetchCustomers()).rejects.toThrow(
      "Failed to fetch all customers.",
    );
    expect(console.error).toHaveBeenCalledWith("Database Error:", error);
  });

  it("filters customers and formats their invoice totals", async () => {
    sqlMock.mockResolvedValueOnce([
      {
        id: "customer-1",
        name: "Ada",
        email: "ada@example.com",
        image_url: "/ada.png",
        total_invoices: 2,
        total_pending: 1250,
        total_paid: 2500,
      },
    ]);

    await expect(fetchFilteredCustomers("Ada")).resolves.toEqual([
      {
        id: "customer-1",
        name: "Ada",
        email: "ada@example.com",
        image_url: "/ada.png",
        total_invoices: 2,
        total_pending: formatCurrency(1250),
        total_paid: formatCurrency(2500),
      },
    ]);
  });

  it("reports filtered-customer query failures", async () => {
    const error = new Error("db unavailable");
    sqlMock.mockRejectedValueOnce(error);

    await expect(fetchFilteredCustomers("Ada")).rejects.toThrow(
      "Failed to fetch customer table.",
    );
    expect(console.error).toHaveBeenCalledWith("Database Error:", error);
  });
});
