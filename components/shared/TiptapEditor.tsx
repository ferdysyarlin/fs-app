"use client";

import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useEffect, useCallback } from "react";
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Highlighter, AlignLeft, AlignCenter,
  AlignRight, Link2, CheckSquare, Minus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TiptapEditorProps {
  content?: object | null;
  onChange?: (json: object, text: string) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        "p-1.5 rounded-md transition-all duration-100 flex items-center justify-center",
        active
          ? "bg-blue-500/20 text-blue-400"
          : "text-[hsl(215,20%,55%)] hover:bg-white/8 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 mx-0.5" style={{ background: "hsl(222,47%,18%)" }} />;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = "Tulis konten log kerja Anda di sini…",
  editable = true,
  className,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Link.configure({ openOnClick: false, linkOnPaste: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: content || "",
    editable,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const text = editor.getText();
      onChange?.(json, text);
    },
    editorProps: {
      attributes: {
        class: "tiptap focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (editor && content && !editor.isDestroyed) {
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson = JSON.stringify(content);
      if (currentJson !== newJson) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const charCount = editor.storage.characterCount?.characters?.() ?? 0;

  return (
    <div
      className={cn("rounded-xl overflow-hidden", className)}
      style={{ border: "1px solid hsl(222,47%,16%)" }}
    >
      {/* Toolbar — only in editable mode */}
      {editable && (
        <div
          className="flex flex-wrap items-center gap-0.5 p-2"
          style={{
            background: "hsl(222,47%,10%)",
            borderBottom: "1px solid hsl(222,47%,16%)",
          }}
        >
          {/* Text style */}
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold (Ctrl+B)">
            <Bold size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic (Ctrl+I)">
            <Italic size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
            <Strikethrough size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inline code">
            <Code size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
            <Highlighter size={14} />
          </ToolbarBtn>

          <Divider />

          {/* Headings */}
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
            <Heading1 size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
            <Heading2 size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
            <Heading3 size={14} />
          </ToolbarBtn>

          <Divider />

          {/* Lists */}
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
            <List size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">
            <ListOrdered size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive("taskList")} title="Task list">
            <CheckSquare size={14} />
          </ToolbarBtn>

          <Divider />

          {/* Block */}
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
            <Quote size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Horizontal rule">
            <Minus size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={setLink} active={editor.isActive("link")} title="Link">
            <Link2 size={14} />
          </ToolbarBtn>

          <Divider />

          {/* Align */}
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
            <AlignLeft size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center">
            <AlignCenter size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
            <AlignRight size={14} />
          </ToolbarBtn>
        </div>
      )}

      {/* Bubble Menu */}
      {editable && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div
            className="flex items-center gap-0.5 p-1 rounded-lg shadow-xl"
            style={{
              background: "hsl(222,47%,12%)",
              border: "1px solid hsl(222,47%,20%)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
            }}
          >
            <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
              <Bold size={13} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
              <Italic size={13} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
              <Highlighter size={13} />
            </ToolbarBtn>
            <ToolbarBtn onClick={setLink} active={editor.isActive("link")} title="Link">
              <Link2 size={13} />
            </ToolbarBtn>
          </div>
        </BubbleMenu>
      )}

      {/* Editor area */}
      <div
        className="p-4"
        style={{ background: "hsl(222,47%,8%)", minHeight: editable ? "240px" : "auto" }}
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Footer: char count */}
      {editable && (
        <div
          className="flex justify-end px-4 py-1.5"
          style={{
            background: "hsl(222,47%,9%)",
            borderTop: "1px solid hsl(222,47%,14%)",
          }}
        >
          <span className="text-xs" style={{ color: "hsl(215,20%,40%)" }}>
            {charCount} karakter
          </span>
        </div>
      )}
    </div>
  );
}
