import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sqlMock, authMock, signInMock, revalidatePathMock, redirectMock } =
  vi.hoisted(() => ({
    sqlMock: vi.fn(),
    authMock: vi.fn(),
    signInMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    redirectMock: vi.fn(),
  }));

vi.mock("postgres", () => ({
  default: vi.fn(() => sqlMock),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
  signIn: signInMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {
    type = "AuthError";
  },
}));

import { AuthError } from "next-auth";
import {
  authenticate,
  createInvoice,
  deleteInvoice,
  updateInvoice,
} from "./actions";

const makeFormData = (
  values: Record<string, string> = {
    customerId: "customer-1",
    amount: "12.50",
    status: "paid",
  },
) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
};

describe("invoice Server Actions", () => {
  beforeEach(() => {
    sqlMock.mockReset();
    sqlMock.mockResolvedValue([]);
    authMock.mockReset();
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    signInMock.mockReset();
    revalidatePathMock.mockReset();
    redirectMock.mockReset();
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects invoice creation when unauthenticated", async () => {
    authMock.mockResolvedValueOnce(null);

    await expect(createInvoice({}, makeFormData())).rejects.toThrow(
      "Unauthorized",
    );
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("rejects invalid invoice input without writing", async () => {
    const result = await createInvoice(
      {},
      makeFormData({ amount: "-1", status: "unknown" }),
    );

    expect(result).toMatchObject({
      message: "Missing Fields. Failed to Create Invoice.",
      errors: {
        customerId: expect.any(Array),
        amount: expect.any(Array),
        status: expect.any(Array),
      },
    });
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("creates an invoice and redirects after revalidating", async () => {
    await expect(createInvoice({}, makeFormData())).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard/invoices",
    );

    expect(sqlMock).toHaveBeenCalledOnce();
    expect(sqlMock.mock.calls[0][1]).toBe("customer-1");
    expect(sqlMock.mock.calls[0][2]).toBe(1250);
    expect(sqlMock.mock.calls[0][3]).toBe("paid");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/invoices");
  });

  it("returns a database error when invoice creation fails", async () => {
    sqlMock.mockRejectedValueOnce(new Error("db unavailable"));

    await expect(createInvoice({}, makeFormData())).resolves.toEqual({
      message: "Database Error: Failed to Create Invoice.",
    });
  });

  it("rejects invalid invoice updates without writing", async () => {
    const result = await updateInvoice(
      "invoice-1",
      {},
      makeFormData({ customerId: "customer-1", amount: "0", status: "paid" }),
    );

    expect(result).toMatchObject({
      message: "Missing Fields. Failed to Update Invoice.",
      errors: { amount: expect.any(Array) },
    });
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("rejects invoice updates when unauthenticated", async () => {
    authMock.mockResolvedValueOnce(null);

    await expect(
      updateInvoice("invoice-1", {}, makeFormData()),
    ).rejects.toThrow("Unauthorized");
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("updates an invoice and redirects after revalidating", async () => {
    await expect(
      updateInvoice("invoice-1", {}, makeFormData()),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard/invoices");

    expect(sqlMock).toHaveBeenCalledOnce();
    expect(sqlMock.mock.calls[0][1]).toBe("customer-1");
    expect(sqlMock.mock.calls[0][2]).toBe(1250);
    expect(sqlMock.mock.calls[0][3]).toBe("paid");
    expect(sqlMock.mock.calls[0][4]).toBe("invoice-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/invoices");
  });

  it("returns a database error when invoice update fails", async () => {
    sqlMock.mockRejectedValueOnce(new Error("db unavailable"));

    await expect(
      updateInvoice("invoice-1", {}, makeFormData()),
    ).resolves.toEqual({
      message: "Database Error: Failed to Update Invoice.",
    });
  });

  it("deletes an invoice and revalidates the affected routes", async () => {
    await expect(deleteInvoice("invoice-1")).resolves.toBeUndefined();

    expect(sqlMock).toHaveBeenCalledOnce();
    expect(sqlMock.mock.calls[0][1]).toBe("invoice-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard/invoices");
  });

  it("rejects invoice deletion when unauthenticated", async () => {
    authMock.mockResolvedValueOnce(null);

    await expect(deleteInvoice("invoice-1")).rejects.toThrow("Unauthorized");
    expect(sqlMock).not.toHaveBeenCalled();
  });

  it("surfaces delete failures", async () => {
    const error = new Error("db unavailable");
    sqlMock.mockRejectedValueOnce(error);

    await expect(deleteInvoice("invoice-1")).rejects.toBe(error);
  });
});

describe("authenticate", () => {
  beforeEach(() => {
    signInMock.mockReset();
  });

  it("returns undefined after successful sign-in", async () => {
    signInMock.mockResolvedValueOnce(undefined);

    await expect(
      authenticate(undefined, makeFormData()),
    ).resolves.toBeUndefined();
    expect(signInMock).toHaveBeenCalledWith(
      "credentials",
      expect.any(FormData),
    );
  });

  it("returns the credentials error message", async () => {
    const error = new AuthError("invalid credentials");
    Object.defineProperty(error, "type", { value: "CredentialsSignin" });
    signInMock.mockRejectedValueOnce(error);

    await expect(authenticate(undefined, makeFormData())).resolves.toBe(
      "Invalid credentials.",
    );
  });

  it("returns a generic message for other authentication errors", async () => {
    const error = new AuthError("provider error");
    Object.defineProperty(error, "type", { value: "OAuthSignin" });
    signInMock.mockRejectedValueOnce(error);

    await expect(authenticate(undefined, makeFormData())).resolves.toBe(
      "Something went wrong.",
    );
  });

  it("rethrows non-authentication errors", async () => {
    const error = new Error("unexpected failure");
    signInMock.mockRejectedValueOnce(error);

    await expect(authenticate(undefined, makeFormData())).rejects.toBe(error);
  });
});
