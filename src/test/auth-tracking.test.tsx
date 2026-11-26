import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signUp: vi.fn(), signIn: vi.fn(), track: vi.fn(), navigate: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: ComponentType }) => ({ options, useSearch: () => ({}) }),
  useNavigate: () => mocks.navigate,
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: {
    signUp: mocks.signUp,
    signInWithPassword: mocks.signIn,
    getUser: () => Promise.resolve({ data: { user: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
  } },
}));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: {} } }));
vi.mock("@/lib/analytics", () => ({ trackSignUp: mocks.track }));

import { Route } from "@/routes/auth";

const AuthPage = Route.options.component;
if (!AuthPage) throw new Error("Registration page is missing");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signUp.mockResolvedValue({ data: { user: { identities: [{ provider: "email" }] } }, error: null });
  mocks.signIn.mockResolvedValue({ error: null });
});
afterEach(cleanup);

function fillRegistration(method: "email" | "phone") {
  render(<AuthPage />);
  fireEvent.click(screen.getByRole("button", { name: "ما عندكش حساب؟ سجّل الآن" }));
  if (method === "phone") fireEvent.click(screen.getByRole("button", { name: "📱 بالهاتف" }));
  fireEvent.change(screen.getByPlaceholderText("الاسم الكامل"), { target: { value: "Analytics test" } });
  fireEvent.change(screen.getByPlaceholderText(method === "email" ? "email@example.com" : "6XXXXXXXX"), {
    target: { value: method === "email" ? "analytics-test@example.com" : "600000000" },
  });
  fireEvent.change(screen.getByPlaceholderText(method === "email" ? "••••••" : "كلمة السر ••••••"), {
    target: { value: "Test-only-password-73" },
  });
  fireEvent.click(screen.getByRole("button", { name: "إنشاء الحساب" }));
}

describe("Registration tracking", () => {
  it.each(["email", "phone"] as const)("tracks successful %s registration once before navigation", async (method) => {
    fillRegistration(method);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/account" }));
    expect(mocks.signUp).toHaveBeenCalledTimes(1);
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith(method);
    expect(mocks.track.mock.invocationCallOrder[0]).toBeLessThan(mocks.navigate.mock.invocationCallOrder[0] ?? 0);
  });

  it("does not track a rejected registration", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: null }, error: { message: "already registered" } });
    fillRegistration("email");
    await screen.findByText("هذا البريد مسجّل من قبل — اضغط «عندك حساب؟ دخول».");
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it("does not count an existing-account placeholder response", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { identities: [] } }, error: null });
    fillRegistration("email");
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalled());
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it("does not track ordinary login", async () => {
    render(<AuthPage />);
    fireEvent.change(screen.getByPlaceholderText("email@example.com"), { target: { value: "analytics-test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••"), { target: { value: "Test-only-password-73" } });
    fireEvent.click(screen.getByRole("button", { name: "دخول", exact: true }));
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledTimes(1));
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.track).not.toHaveBeenCalled();
  });
});