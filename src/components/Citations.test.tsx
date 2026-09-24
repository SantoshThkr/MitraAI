import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Citations from "./Citations";

describe("Citations", () => {
  it("renders nothing when there are no sources", () => {
    const { container } = render(<Citations sources={[]} theme="dark" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the filename and page for each source", () => {
    render(
      <Citations
        sources={[
          { filename: "manual.pdf", page: 7 },
          { filename: "notes.md", page: null },
        ]}
        theme="dark"
      />,
    );

    expect(screen.getByText(/manual\.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/p\. 7/)).toBeInTheDocument();
    expect(screen.getByText(/notes\.md/)).toBeInTheDocument();
    expect(screen.queryByText(/p\. null/)).not.toBeInTheDocument();
  });
});
