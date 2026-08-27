"use client";

import { Upload, X } from "lucide-react";
import { useState } from "react";

export type UploadState = "idle" | "uploading" | "extracting-questions" | "extracting-answers" | "mapping" | "ready";

export default function UploadScreen({ onStartMapping }: { onStartMapping: (qPaper: File, aSheet: File) => void }) {
  const [questionPaper, setQuestionPaper] = useState<File | null>(null);
  const [answerSheet, setAnswerSheet] = useState<File | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, setter: (file: File) => void) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setter(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-100 p-8">
      <div className="max-w-4xl w-full text-center mb-12">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">
          Upload <span className="text-orange-500 bg-orange-50 px-2 py-1 rounded">Question Paper & Answer Sheets</span>
        </h1>
        <p className="text-zinc-500">Upload both files to get started</p>
      </div>

      <div className="w-32 h-32 mb-12 relative">
        <div className="absolute inset-0 bg-orange-100 rounded-full animate-pulse opacity-50"></div>
        <div className="absolute inset-4 bg-orange-200 rounded-full flex items-center justify-center">
           <div className="text-4xl">👩‍🏫</div>
        </div>
        {/* Decorative dots */}
        <div className="absolute top-0 right-4 w-3 h-3 bg-orange-400 rounded-full"></div>
        <div className="absolute bottom-4 left-0 w-2 h-2 bg-orange-400 rounded-full"></div>
        <div className="absolute top-1/2 -right-2 w-2 h-2 bg-orange-400 rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-12">
        <DropZone 
          title="Question Paper" 
          file={questionPaper} 
          onDrop={(e) => handleDrop(e, setQuestionPaper)} 
          onDragOver={handleDragOver}
          onRemove={() => setQuestionPaper(null)}
        />
        <DropZone 
          title="Answer Sheet" 
          file={answerSheet} 
          onDrop={(e) => handleDrop(e, setAnswerSheet)} 
          onDragOver={handleDragOver}
          onRemove={() => setAnswerSheet(null)}
        />
      </div>

      <div className="flex flex-col items-center">
        <button
          disabled={!questionPaper || !answerSheet}
          onClick={() => questionPaper && answerSheet && onStartMapping(questionPaper, answerSheet)}
          className={`flex items-center space-x-2 px-8 py-3 rounded-full font-medium transition-all ${
            questionPaper && answerSheet 
              ? "bg-zinc-900 text-white shadow-lg hover:bg-zinc-800" 
              : "bg-zinc-300 text-zinc-500 cursor-not-allowed"
          }`}
        >
          <span>Start Mapping</span>
          <span>→</span>
        </button>
        <p className="mt-4 text-sm text-zinc-400">
          Once both files are uploaded, you'll be able to map answers with questions
        </p>
      </div>
    </div>
  );
}

function DropZone({ 
  title, 
  file, 
  onDrop, 
  onDragOver,
  onRemove 
}: { 
  title: string; 
  file: File | null; 
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div 
      onDrop={onDrop}
      onDragOver={onDragOver}
      className={`relative flex flex-col items-center justify-center p-8 bg-white border-2 border-dashed rounded-2xl h-48 transition-colors ${
        file ? "border-zinc-200" : "border-zinc-300 hover:border-orange-400"
      }`}
    >
      {file ? (
        <div className="flex items-center space-x-4 bg-zinc-50 p-4 rounded-lg w-full">
          <div className="bg-red-100 text-red-500 p-2 rounded">
             <FileIcon />
          </div>
          <div className="flex-1 text-left overflow-hidden">
            <p className="font-medium text-sm truncate" title={file.name}>{file.name}</p>
            <p className="text-xs text-zinc-500">
              {(file.size / (1024 * 1024)).toFixed(1)}MB
            </p>
          </div>
          <button 
            onClick={onRemove}
            className="p-1 bg-zinc-200 rounded-full hover:bg-zinc-300 text-zinc-600 absolute -top-3 -right-3"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 text-zinc-400">
            <Upload size={24} />
          </div>
          <p className="font-medium text-zinc-900">
            Upload <span className="text-orange-500">{title}</span>
          </p>
          <p className="text-xs text-zinc-400 mt-1">Max 10MB</p>
          <input 
            type="file" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                // Not ideal for setting file directly in a real app (better use a ref), 
                // but this works for demo dropzone
                const ev = {
                  preventDefault: () => {},
                  dataTransfer: { files: e.target.files }
                } as unknown as React.DragEvent<HTMLDivElement>;
                onDrop(ev);
              }
            }}
          />
        </>
      )}
    </div>
  );
}

function FileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}
