/**
 * Tiptap Editor Configuration
 */

const EditorConfig = {
  extensions: [
    // StarterKit includes: Document, Paragraph, Text, Bold, Italic, etc.
    "StarterKit",
    // Collaboration
    "Collaboration",
    "CollaborationCursor",
    // Academic extensions
    "Footnote",
    "Citation",
    "MathBlock",
    "TableOfContents",
  ],

  // Default content structure for thesis
  defaultContent: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "" }],
      },
    ],
  },
};

export default EditorConfig;
