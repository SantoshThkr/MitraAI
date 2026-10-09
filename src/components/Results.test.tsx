import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Results from "./Results";

describe("Results markdown rendering", () => {
  it("renders headings as headings, not literal hashes", () => {
    render(<Results ans={"### Explanation\n\nProps are read-only."} />);

    expect(screen.getByRole("heading", { name: "Explanation" })).toBeInTheDocument();
    expect(screen.queryByText(/###/)).not.toBeInTheDocument();
  });

  it("renders bullet and numbered lists as list items", () => {
    render(
      <Results ans={"- **Read-only**: cannot change\n- Parent to child\n\n1. first\n2. second"} />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(screen.getByText("Read-only")).toBeInTheDocument();
    expect(screen.queryByText(/^- /)).not.toBeInTheDocument();
  });

  it("unescapes backslash-escaped markdown punctuation", () => {
    render(<Results ans={"\\### Explanation and \\- a dash and \\*\\*stars\\*\\*"} />);

    expect(screen.getByText(/### Explanation and - a dash and \*\*stars\*\*/)).toBeInTheDocument();
    expect(screen.queryByText(/\\/)).not.toBeInTheDocument();
  });

  it("renders a fenced code block with its language and keeps the code verbatim", () => {
    render(
      <Results
        ans={"Here:\n\n```jsx\nfunction A({ name }) {\n  return <div>{name}</div>;\n}\n```"}
      />,
    );

    expect(screen.getByText("jsx")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
    expect(
      screen.getByText((_, element) =>
        element?.tagName === "CODE" &&
        element.textContent === "function A({ name }) {\n  return <div>{name}</div>;\n}",
      ),
    ).toBeInTheDocument();
  });

  it("does not treat JSX inside a code block as markup", () => {
    render(<Results ans={"```jsx\n<Nav items={[1,2]} />\n```"} />);

    expect(screen.getByText("<Nav items={[1,2]} />")).toBeInTheDocument();
  });

  it("renders inline code and bold in prose", () => {
    render(<Results ans={"Use `useState` for **local** state."} />);

    expect(screen.getByText("useState").tagName).toBe("CODE");
    expect(screen.getByText("local").tagName).toBe("STRONG");
  });
});
