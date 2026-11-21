'use client';

import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  language: string;
  onChange: (value: string | undefined) => void;
  currentLine?: number | null;
  faultLine?: number | null;
  breakpoints?: number[];
  onToggleBreakpoint?: (lineNumber: number) => void;
  readOnly?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  language,
  onChange,
  currentLine,
  faultLine,
  breakpoints = [],
  onToggleBreakpoint,
  readOnly = false,
}) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Custom dark theme
    monaco.editor.defineTheme('codetrace-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'string', foreground: '10b981' },
        { token: 'type', foreground: '818cf8' },
      ],
      colors: {
        'editor.background': '#0c101b',
        'editor.lineHighlightBackground': '#141c2e',
        'editorCursor.foreground': '#38bdf8',
        'editorLineNumber.foreground': '#334155',
        'editorLineNumber.activeForeground': '#94a3b8',
        'editorGutter.background': '#0a0d17',
      },
    });

    monaco.editor.setTheme('codetrace-dark');

    // Click on gutter to toggle breakpoint
    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const line = e.target.position?.lineNumber;
        if (line && onToggleBreakpoint) {
          onToggleBreakpoint(line);
        }
      }
    });
  };

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const newDecorations: any[] = [];

    // 1. Breakpoints
    breakpoints.forEach((bpLine) => {
      newDecorations.push({
        range: {
          startLineNumber: bpLine,
          startColumn: 1,
          endLineNumber: bpLine,
          endColumn: 1,
        },
        options: {
          glyphMarginClassName: 'breakpoint-gutter-marker',
          glyphMarginHoverMessage: { value: `Breakpoint at line ${bpLine}` },
        },
      });
    });

    // 2. Fault Line (SIGSEGV / Exception)
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
          hoverMessage: { value: '**Runtime Fault (SIGSEGV)**: Culprit statement causing crash.' },
        },
      });
      editor.revealLineInCenter(faultLine);
    } else if (currentLine) {
      // 3. Current Execution Step
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
          hoverMessage: { value: `Active Execution Frame (Line ${currentLine})` },
        },
      });
      editor.revealLineInCenter(currentLine);
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [currentLine, faultLine, breakpoints]);

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
          fontSize: 13,
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
