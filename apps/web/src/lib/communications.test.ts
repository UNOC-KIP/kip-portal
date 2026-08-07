import { describe, it, expect } from "vitest";
import {
  COMMUNICATION_ATTACHMENT_MAX_BYTES,
  MERGE_TOKENS,
  applyMergeTokens,
  bodyExcerpt,
  formatFileSize,
  renderBodyHtml,
  sampleMergeVars,
  validateCommunicationFile,
  type MergeVars,
} from "@kip/shared";

const vars: MergeVars = {
  company: "Gulf Petrochem International FZE",
  repName: "Ada Rep",
  email: "a@gulf.ae",
  reference: "KIP-EOI-2026-0001",
};

describe("applyMergeTokens", () => {
  it("substitutes every token the composer offers", () => {
    for (const t of MERGE_TOKENS) {
      const out = applyMergeTokens(`before ${t.token} after`, vars);
      expect(out).not.toContain(t.token);
      expect(out).toBe(`before ${vars[t.key]} after`);
    }
  });

  it("substitutes repeated tokens in one body", () => {
    expect(applyMergeTokens("{{company}} — {{company}}", vars)).toBe(
      "Gulf Petrochem International FZE — Gulf Petrochem International FZE",
    );
  });

  it("tolerates whitespace inside the braces", () => {
    expect(applyMergeTokens("Dear {{ company }},", vars)).toBe(
      "Dear Gulf Petrochem International FZE,",
    );
  });

  it("leaves an unknown token verbatim so a typo is visible in the preview", () => {
    expect(applyMergeTokens("Dear {{compnay}},", vars)).toBe("Dear {{compnay}},");
  });

  it("falls back to neutral wording rather than emitting an empty gap", () => {
    expect(applyMergeTokens("Dear {{company}},", { ...vars, company: "" })).toBe("Dear Investor,");
    expect(applyMergeTokens("Re: {{reference}}", { ...vars, reference: "   " })).toBe(
      "Re: your application",
    );
  });

  it("treats a missing key the same as an empty value", () => {
    expect(applyMergeTokens("Hi {{repName}}", {})).toBe("Hi there");
  });

  it("is a no-op on a body with no tokens", () => {
    expect(applyMergeTokens("Plain text body.", vars)).toBe("Plain text body.");
  });

  it("sampleMergeVars covers every token, so the test send is never blank", () => {
    const samples = sampleMergeVars();
    for (const t of MERGE_TOKENS) {
      expect(samples[t.key]).toBeTruthy();
    }
  });
});

describe("renderBodyHtml — escaping", () => {
  it("escapes a script tag instead of emitting live markup", () => {
    const html = renderBodyHtml("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes ampersands and quotes in authored text", () => {
    const html = renderBodyHtml(`Oil & Gas "phase two" it's here`);
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");
    expect(html).toContain("&#39;");
  });

  it("escapes an inline event handler someone pastes in", () => {
    const html = renderBodyHtml(`<img src=x onerror="alert(1)">`);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("rejects a javascript: link and renders it as plain text", () => {
    const html = renderBodyHtml("[click me](javascript:alert(1))");
    expect(html).not.toContain("<a ");
    expect(html).toContain("[click me](javascript:alert(1))");
  });

  it("rejects a data: URI link", () => {
    const html = renderBodyHtml("[x](data:text/html,<script>alert(1)</script>)");
    expect(html).not.toContain("<a ");
  });

  it("rejects a protocol-relative link", () => {
    expect(renderBodyHtml("[x](//evil.example.com)")).not.toContain("<a ");
  });
});

describe("renderBodyHtml — formatting", () => {
  it("wraps each blank-line-separated block in its own paragraph", () => {
    const html = renderBodyHtml("First para.\n\nSecond para.");
    expect(html.match(/<p /g)).toHaveLength(2);
    expect(html).toContain("First para.");
    expect(html).toContain("Second para.");
  });

  it("turns a single newline inside a block into a line break", () => {
    const html = renderBodyHtml("Line one\nLine two");
    expect(html.match(/<p /g)).toHaveLength(1);
    expect(html).toContain("<br>");
  });

  it("renders bold and italic", () => {
    const html = renderBodyHtml("**closes Friday** and *do not* delay");
    expect(html).toContain("<strong");
    expect(html).toContain("closes Friday</strong>");
    expect(html).toContain("<em>do not</em>");
  });

  it("does not read the inner pair of a bold run as italics", () => {
    const html = renderBodyHtml("**bold**");
    expect(html).toContain("<strong");
    expect(html).not.toContain("<em>");
  });

  it("renders a dash-prefixed block as a list, one item per line", () => {
    const html = renderBodyHtml("- first\n- second\n- third");
    expect(html).toContain("<ul");
    expect(html.match(/<li /g)).toHaveLength(3);
    expect(html).not.toContain("<p ");
  });

  it("splits a lead-in line from bullets typed straight after it, with no blank line", () => {
    const html = renderBodyHtml("Before then please:\n- pay the fee\n- finish all sections");
    expect(html).toContain("<p ");
    expect(html).toContain("Before then please:");
    expect(html).toContain("<ul");
    expect(html.match(/<li /g)).toHaveLength(2);
    // The lead-in must not be swallowed into the list.
    expect(html).not.toContain("<li style=\"margin:0 0 6px\">Before then please:");
    expect(html.indexOf("<p ")).toBeLessThan(html.indexOf("<ul"));
  });

  it("resumes prose after a list inside the same block", () => {
    const html = renderBodyHtml("Please:\n- one\nThanks.");
    expect(html.match(/<p /g)).toHaveLength(2);
    expect(html.match(/<ul/g)).toHaveLength(1);
    expect(html.indexOf("<ul")).toBeLessThan(html.lastIndexOf("<p "));
  });

  it("renders an https link with its label", () => {
    const html = renderBodyHtml("See [the map](https://kip.unoc.com/land-map) for detail.");
    expect(html).toContain('href="https://kip.unoc.com/land-map"');
    expect(html).toContain(">the map</a>");
  });

  it("renders a mailto link", () => {
    expect(renderBodyHtml("[write to us](mailto:Support.Kip@unoc.com)")).toContain(
      'href="mailto:Support.Kip@unoc.com"',
    );
  });

  it("un-escapes ampersands back into the href but not the visible text", () => {
    const html = renderBodyHtml("[x](https://e.com/?a=1&b=2)");
    // The href must be a usable URL; `&amp;` is the correct encoding inside an
    // HTML attribute, and must not have become a literal `&amp;amp;`.
    expect(html).toContain('href="https://e.com/?a=1&amp;b=2"');
    expect(html).not.toContain("&amp;amp;");
  });

  it("is empty-safe", () => {
    expect(renderBodyHtml("")).toBe("");
    expect(renderBodyHtml("\n\n  \n")).toBe("");
  });

  it("collapses runs of blank lines rather than emitting empty paragraphs", () => {
    const html = renderBodyHtml("One.\n\n\n\nTwo.");
    expect(html.match(/<p /g)).toHaveLength(2);
  });

  it("normalises CRLF line endings pasted from Windows or Outlook", () => {
    const html = renderBodyHtml("One.\r\n\r\nTwo.");
    expect(html.match(/<p /g)).toHaveLength(2);
    expect(html).not.toContain("\r");
  });
});

describe("bodyExcerpt", () => {
  it("flattens whitespace onto one line", () => {
    expect(bodyExcerpt("Dear investor,\n\n  The window   closes.")).toBe(
      "Dear investor, The window closes.",
    );
  });

  it("truncates with an ellipsis at the limit", () => {
    const out = bodyExcerpt("x".repeat(200), 20);
    expect(out).toHaveLength(20);
    expect(out.endsWith("…")).toBe(true);
  });

  it("leaves a short body untouched", () => {
    expect(bodyExcerpt("Short.", 20)).toBe("Short.");
  });

  it("is empty-safe", () => {
    expect(bodyExcerpt("")).toBe("");
  });
});

describe("validateCommunicationFile", () => {
  const PDF = "application/pdf";

  it("accepts a normal PDF", () => {
    expect(validateCommunicationFile({ type: PDF, size: 2_000_000 })).toBeNull();
  });

  it("accepts office formats the secretariat actually sends", () => {
    const xlsx =
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    expect(validateCommunicationFile({ type: xlsx, size: 1024 })).toBeNull();
  });

  it("rejects an unsupported type", () => {
    const err = validateCommunicationFile({ type: "application/zip", size: 1024 });
    expect(err).toContain("not supported");
  });

  it("rejects an empty file", () => {
    expect(validateCommunicationFile({ type: PDF, size: 0 })).toContain("empty");
  });

  // The cap exists so one upload can't sit in the bucket unboundedly; it is far
  // above the O365 message limit because the file is linked, never mailed.
  it("rejects a file over the size cap", () => {
    const err = validateCommunicationFile({
      type: PDF,
      size: COMMUNICATION_ATTACHMENT_MAX_BYTES + 1,
    });
    expect(err).toContain("25.0 MB");
  });

  it("accepts a file exactly at the cap", () => {
    expect(
      validateCommunicationFile({
        type: PDF,
        size: COMMUNICATION_ATTACHMENT_MAX_BYTES,
      }),
    ).toBeNull();
  });
});

describe("formatFileSize", () => {
  it("scales across units", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(3_500_000)).toBe("3.3 MB");
  });
});
