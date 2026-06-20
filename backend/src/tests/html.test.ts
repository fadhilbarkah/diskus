import { describe, expect, it } from "bun:test";
import { sanitizeHtml, simpleMarkdownToHtml, escapeHtmlEntities } from "../utils/html";

describe("HTML Utils", () => {
  describe("sanitizeHtml", () => {
    it("should remove script tags and malicious attributes", () => {
      const dirty = `<p onclick="alert('xss')">Hello <script>alert('xss')</script>World!</p>`;
      const clean = sanitizeHtml(dirty);
      expect(clean).toBe("<p>Hello World!</p>");
    });

    it("should keep allowed tags", () => {
      const allowed = `<strong>Bold</strong> <em>Italic</em> <a href="https://example.com">Link</a>`;
      const clean = sanitizeHtml(allowed);
      // It adds target="_blank" and rel due to the DOMPurify hook
      expect(clean).toContain('target="_blank"');
      expect(clean).toContain('rel="noopener noreferrer nofollow"');
      expect(clean).toContain("<strong>Bold</strong>");
    });

    it("should add lazy loading to images", () => {
      const img = `<img src="test.jpg" alt="test" />`;
      const clean = sanitizeHtml(img);
      expect(clean).toContain('loading="lazy"');
    });
  });

  describe("simpleMarkdownToHtml", () => {
    it("should convert bold and italic", () => {
      const md = "**Bold** and *Italic*";
      const html = simpleMarkdownToHtml(md);
      expect(html).toContain("<strong>Bold</strong>");
      expect(html).toContain("<em>Italic</em>");
    });

    it("should convert links securely", () => {
      const md = "[My Link](https://test.com)";
      const html = simpleMarkdownToHtml(md);
      expect(html).toContain('<a href="https://test.com"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer nofollow"');
    });

    it("should sanitize malicious markdown", () => {
      const md = "[XSS](javascript:alert(1))";
      const html = simpleMarkdownToHtml(md);
      expect(html).not.toContain("javascript:alert");
    });
  });

  describe("escapeHtmlEntities", () => {
    it("should escape special characters", () => {
      const text = `A & B < C > D " E ' F`;
      const escaped = escapeHtmlEntities(text);
      expect(escaped).toBe("A &amp; B &lt; C &gt; D &quot; E &#039; F");
    });
  });
});
