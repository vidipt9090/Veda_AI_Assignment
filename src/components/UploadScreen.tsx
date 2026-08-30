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
    <div className="flex-1 flex flex-col items-center justify-start bg-transparent p-4 md:p-8 overflow-y-auto">
      <div className="max-w-4xl w-full text-center mt-2 mb-6">
        <h1 className="text-[26px] md:text-[34px] leading-tight font-bold text-zinc-900 tracking-tight flex flex-wrap items-center justify-center gap-2">
          <span>Upload</span>
          <span className="text-[#ff5924] bg-[#fff1ec] px-3.5 py-1 rounded-2xl">
            Question Paper & Answer Sheets
          </span>
        </h1>
        <p className="text-zinc-500 text-sm mt-3 font-medium">Upload both files to get started</p>
      </div>

      <div className="w-36 h-36 mb-6 relative flex-shrink-0 flex items-center justify-center">
        <img 
          src="/teacher.png" 
          alt="Teacher Avatar" 
          className="w-full h-full object-contain pointer-events-none select-none" 
        />
      </div>

      <div className="bg-white/90 backdrop-blur-sm p-4 md:p-6 rounded-[2.5rem] w-full max-w-4xl mb-8 shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-white/80">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      <div className="flex flex-col items-center pb-8">
        <button
          disabled={!questionPaper || !answerSheet}
          onClick={() => questionPaper && answerSheet && onStartMapping(questionPaper, answerSheet)}
          className={`flex items-center space-x-2 px-8 py-3.5 rounded-full font-medium transition-all ${
            questionPaper && answerSheet 
              ? "bg-zinc-900 text-white shadow-lg hover:bg-zinc-800" 
              : "bg-zinc-300 text-white shadow-sm cursor-not-allowed"
          }`}
        >
          <span>Start Mapping</span>
          <span>→</span>
        </button>
        <p className="mt-6 text-[13px] text-zinc-500 text-center max-w-[260px]">
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
      className={`relative flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed rounded-3xl h-36 md:h-48 transition-colors ${
        file ? "border-zinc-200" : "border-zinc-300 hover:border-orange-400"
      }`}
    >
      {file ? (
        <div className="flex items-center space-x-3 bg-zinc-50 p-3 rounded-xl w-full">
          <div className="bg-red-100 text-red-500 p-2 rounded-lg">
             <FileIcon />
          </div>
          <div className="flex-1 text-left overflow-hidden">
            <p className="font-medium text-sm truncate text-zinc-800" title={file.name}>{file.name}</p>
            <p className="text-xs text-zinc-500">
              {(file.size / (1024 * 1024)).toFixed(1)}MB
            </p>
          </div>
          <button 
            onClick={onRemove}
            className="p-1.5 bg-zinc-200 rounded-full hover:bg-zinc-300 text-zinc-600 absolute -top-2 -right-2 shadow-sm"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <div className="mb-3 bg-zinc-100 p-2.5 rounded-xl text-zinc-600">
            <Upload size={20} />
          </div>
          <p className="font-semibold text-zinc-900 text-sm">
            Upload <span className="text-orange-500">{title}</span>
          </p>
          <p className="text-[11px] text-zinc-400 mt-1 font-medium">Max 10MB</p>
          <input 
            type="file" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
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
