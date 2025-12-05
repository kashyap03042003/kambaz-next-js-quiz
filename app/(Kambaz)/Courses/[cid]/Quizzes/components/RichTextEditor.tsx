"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "react-bootstrap";
import "./RichTextEditor.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && !isFocused) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value, isFocused]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertText = (text: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      handleInput();
    }
  };

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar">
        <Button
          variant="outline-secondary"
          size="sm"
          type="button"
          onClick={() => execCommand("bold")}
          title="Bold"
        >
          <strong>B</strong>
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          type="button"
          onClick={() => execCommand("italic")}
          title="Italic"
        >
          <em>I</em>
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          type="button"
          onClick={() => execCommand("underline")}
          title="Underline"
        >
          <u>U</u>
        </Button>
        <div className="toolbar-separator" />
        <Button
          variant="outline-secondary"
          size="sm"
          type="button"
          onClick={() => execCommand("formatBlock", "<h1>")}
          title="Heading 1"
        >
          H1
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          type="button"
          onClick={() => execCommand("formatBlock", "<h2>")}
          title="Heading 2"
        >
          H2
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          type="button"
          onClick={() => execCommand("formatBlock", "<h3>")}
          title="Heading 3"
        >
          H3
        </Button>
        <div className="toolbar-separator" />
        <Button
          variant="outline-secondary"
          size="sm"
          type="button"
          onClick={() => execCommand("insertUnorderedList")}
          title="Bullet List"
        >
          •
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          type="button"
          onClick={() => execCommand("insertOrderedList")}
          title="Numbered List"
        >
          1.
        </Button>
        <div className="toolbar-separator" />
        <Button
          variant="outline-secondary"
          size="sm"
          type="button"
          onClick={() => {
            const url = prompt("Enter URL:");
            if (url) {
              execCommand("createLink", url);
            }
          }}
          title="Insert Link"
        >
          🔗
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          type="button"
          onClick={() => execCommand("removeFormat")}
          title="Remove Formatting"
        >
          Clear
        </Button>
      </div>
      <div
        ref={editorRef}
        className="rich-text-content"
        contentEditable
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        data-placeholder={placeholder || "Enter text here..."}
        suppressContentEditableWarning
      />
    </div>
  );
}
