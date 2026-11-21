'use client';

import React, { useState } from 'react';
import {
  Folder,
  FileCode,
  Plus,
  Trash2,
  FilePlus,
  FolderOpen,
  Code2,
  Database,
  Coffee,
  Terminal,
} from 'lucide-react';

export interface ProjectFile {
  name: string;
  language: string;
  content: string;
}

interface FileTreeProps {
  files: Record<string, string>;
  activeFile: string;
  onSelectFile: (fileName: string) => void;
  onCreateFile: (fileName: string) => void;
  onDeleteFile: (fileName: string) => void;
  onLoadTemplate: (templateName: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  activeFile,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onLoadTemplate,
}) => {
  const [newFileName, setNewFileName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFileName.trim()) {
      onCreateFile(newFileName.trim());
      setNewFileName('');
      setIsCreating(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.cpp') || fileName.endsWith('.c') || fileName.endsWith('.h')) {
      return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
    }
    if (fileName.endsWith('.py')) {
      return <Code2 className="w-3.5 h-3.5 text-yellow-400" />;
    }
    if (fileName.endsWith('.java')) {
      return <Coffee className="w-3.5 h-3.5 text-amber-500" />;
    }
    if (fileName.endsWith('.sql')) {
      return <Database className="w-3.5 h-3.5 text-emerald-400" />;
    }
    return <FileCode className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="w-56 h-full flex flex-col bg-[#0c101b] border-r border-slate-800 text-xs shrink-0 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
          <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
          <span>Files</span>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition"
          title="New File"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* New file input */}
      {isCreating && (
        <form onSubmit={handleCreate} className="p-2 border-b border-slate-800 bg-slate-900/40">
          <input
            autoFocus
            type="text"
            placeholder="filename.ext"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onBlur={() => setIsCreating(false)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </form>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {Object.keys(files).map((fileName) => {
          const isActive = fileName === activeFile;
          return (
            <div
              key={fileName}
              onClick={() => onSelectFile(fileName)}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition ${
                isActive
                  ? 'bg-blue-600/20 text-blue-300 font-medium border border-blue-500/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {getFileIcon(fileName)}
                <span className="truncate">{fileName}</span>
              </div>
              {Object.keys(files).length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(fileName);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition"
                  title="Delete file"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Templates */}
      <div className="p-2 border-t border-slate-800 bg-slate-900/40">
        <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1.5 tracking-wider">
          Starter Templates
        </div>
        <div className="space-y-1">
          <button
            onClick={() => onLoadTemplate('cpp_linkedlist')}
            className="w-full text-left px-2 py-1 rounded text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-200 truncate"
          >
            📦 C++ Multi-File List
          </button>
          <button
            onClick={() => onLoadTemplate('python_tree')}
            className="w-full text-left px-2 py-1 rounded text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-200 truncate"
          >
            🐍 Python Binary Tree
          </button>
          <button
            onClick={() => onLoadTemplate('java_oop')}
            className="w-full text-left px-2 py-1 rounded text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-200 truncate"
          >
            ☕ Java OOP Bank
          </button>
          <button
            onClick={() => onLoadTemplate('sql_university')}
            className="w-full text-left px-2 py-1 rounded text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-200 truncate"
          >
            🗄 SQL University Schema
          </button>
        </div>
      </div>
    </div>
  );
};
