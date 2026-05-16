import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import UserGuidePage from "@/app/guide/page";

describe("UserGuidePage", () => {
  it("documents each primary workflow for users and QA", () => {
    render(<UserGuidePage />);

    expect(screen.getByRole("heading", { name: "User Guide" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Student guide" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Organization guide" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Partner guide" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Admin guide" })).toBeInTheDocument();
  });
});
