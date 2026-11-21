'use client';

import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (value: string | undefined) => void;
  currentLine?: number | null;
  faultLine?: number | null;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  language,
  onChange,
  currentLine,
  faultLine,
  readOnly = false,
}) => {
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define custom theme
    monaco.editor.defineTheme('codetrace-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '38bdf8' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'string', foreground: '10b981' },
        { token: 'type', foreground: '818cf8' },
      ],
      colors: {
        'editor.background': '#0c101b',
        'editor.lineHighlightBackground': '#161e31',
        'editorCursor.foreground': '#38bdf8',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#94a3b8',
      },
    });

    monaco.editor.setTheme('codetrace-dark');
  };

  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const newDecorations = [];

    if (faultLine) {
      newDecorations.push({
        range: {
          startLineNumber: faultLine,
          startColumn: 1,
          endLineNumber: faultLine,
          endColumn: 1000,
        },
        options: {
          isWholeLine: true,
          className: 'fault-execution-line',
          glyphMarginClassName: 'fault-gutter-marker',
          hoverMessage: { value: '**Runtime Fault (SIGSEGV)**: Culprit execution statement.' },
        },
      });
      editor.revealLineInCenter(faultLine);
    } else if (currentLine) {
      newDecorations.push({
        range: {
          startLineNumber: currentLine,
          startColumn: 1,
          endLineNumber: currentLine,
          endColumn: 1000,
        },
        options: {
          isWholeLine: true,
          className: 'active-execution-line',
          glyphMarginClassName: 'active-gutter-marker',
          hoverMessage: { value: `Executing Step on Line ${currentLine}` },
        },
      });
      editor.revealLineInCenter(currentLine);
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [currentLine, faultLine]);

  return (
    <div className="w-full h-full overflow-hidden border border-slate-800/80 rounded-xl shadow-2xl bg-[#0c101b]">
      <Editor
        height="100%"
        language={language === 'c' || language === 'cpp' ? 'cpp' : language}
        value={code}
        onChange={onChange}
        onMount={handleEditorDidMount}
        theme="codetrace-dark"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          glyphMargin: true,
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          automaticLayout: true,
          fontFamily: "'Fira Code', 'JetBrains Mono', Menlo, monospace",
          fontLigatures: true,
        }}
      />
    </div>
  );
};
