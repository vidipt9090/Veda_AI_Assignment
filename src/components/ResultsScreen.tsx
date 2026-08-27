"use client";

import { useEffect, useRef, useState } from "react";
import { MappingResult, ExtractedQuestion, ExtractedAnswer } from "@/types";
import { ChevronDown, ChevronUp, ZoomIn, ZoomOut } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

// Set worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function ResultsScreen({
  mappingResult,
  answerSheetFile
}: {
  mappingResult: MappingResult;
  answerSheetFile: File;
}) {
  const [selectedQuestion, setSelectedQuestion] = useState<ExtractedQuestion | null>(null);
  const [selectedUnmatched, setSelectedUnmatched] = useState<ExtractedAnswer | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.5);
  
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isImage, setIsImage] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    if (answerSheetFile.type.startsWith("image/")) {
      setIsImage(true);
      const url = URL.createObjectURL(answerSheetFile);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (answerSheetFile.type === "application/pdf") {
      setIsImage(false);
      const reader = new FileReader();
      reader.onload = async function (e) {
        const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        setPdfDocument(pdf);
        setNumPages(pdf.numPages);
      };
      reader.readAsArrayBuffer(answerSheetFile);
    }
  }, [answerSheetFile]);

  // Render PDF Page
  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return;
    
    let isCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(currentPage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;
      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException') {
          console.error("PDF Render Error:", error);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDocument, currentPage, zoom]);

  const handleSelectQuestion = (q: ExtractedQuestion) => {
    setSelectedQuestion(q);
    setSelectedUnmatched(null);
    // Find the mapped answer to jump to the right page
    const mapped = mappingResult.matched.find(m => m.question.number === q.number && m.question.sub_part === q.sub_part);
    if (mapped && mapped.answer && mapped.answer.length > 0) {
      if (!isImage) {
         setCurrentPage(mapped.answer[0].page);
      }
    }
  };

  const handleSelectUnmatched = (a: ExtractedAnswer) => {
    setSelectedUnmatched(a);
    setSelectedQuestion(null);
    if (!isImage) setCurrentPage(a.page);
  };

  const getMatchedAnswer = (q: ExtractedQuestion) => {
    return mappingResult.matched.find(m => m.question.number === q.number && m.question.sub_part === q.sub_part)?.answer;
  };

  // Extract selected answers
  const selectedAnswers = selectedQuestion 
    ? getMatchedAnswer(selectedQuestion) 
    : selectedUnmatched 
      ? [selectedUnmatched] 
      : null;

  // Render questions list
  const allQuestions = [...mappingResult.matched.map(m => m.question), ...mappingResult.unanswered].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return a.bbox.y_min - b.bbox.y_min;
  });

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  return (
    <div className="flex w-full h-full overflow-hidden bg-zinc-100 p-6 gap-6">
      
      {/* Left Column: Questions */}
      <div className="w-1/3 flex flex-col bg-zinc-50 border rounded-2xl overflow-hidden flex-shrink-0">
        <div className="p-4 bg-white border-b flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900">Extracted Questions</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {allQuestions.map((q, i) => {
            const isSelected = selectedQuestion === q;
            const isMatched = !!getMatchedAnswer(q);
            
            return (
              <div 
                key={i} 
                onClick={() => handleSelectQuestion(q)}
                className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                  isSelected ? "border-orange-500 shadow-md ring-1 ring-orange-500" : "hover:border-zinc-300"
                }`}
              >
                <div className="flex space-x-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {q.number}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-zinc-800">{q.sub_part ? `${q.sub_part}. ` : ''}{q.text}</p>
                    <div className="mt-3 flex items-center justify-between">
                       {isMatched ? (
                         <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">Mapped</span>
                       ) : (
                         <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">Unanswered</span>
                       )}
                    </div>
                    
                    {isMatched && (
                      <div className="mt-4 pt-3 border-t">
                        {(() => {
                           const mPair = mappingResult.matched.find(m => m.question.number === q.number && m.question.sub_part === q.sub_part);
                           const evalRes = mPair?.evaluation;
                           
                           if (!evalRes) {
                             return <span className="text-xs text-zinc-500 italic">Evaluation unavailable</span>;
                           }
                           
                           const isCorrect = evalRes.verdict === "correct";
                           const isPartial = evalRes.verdict === "partially_correct";
                           const verdictColor = isCorrect ? "text-green-700 bg-green-100" : isPartial ? "text-yellow-700 bg-yellow-100" : "text-red-700 bg-red-100";
                           
                           return (
                             <div className="space-y-3">
                               <div className="flex items-center space-x-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">AI Evaluation</span>
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${verdictColor}`}>
                                    {evalRes.verdict.replace('_', ' ')}
                                  </span>
                                  {evalRes.confidence === "low" && (
                                     <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium" title="Mismatch between deterministic check and LLM">Needs Review</span>
                                  )}
                               </div>
                               <p className="text-sm text-zinc-700">{evalRes.feedback}</p>
                               
                               {evalRes.criteria && evalRes.criteria.length > 0 && (
                                 <div className="bg-zinc-50 rounded p-3 space-y-2 mt-2">
                                   <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">Grading Criteria</p>
                                   {evalRes.criteria.map((c, idx) => (
                                      <div key={idx} className="flex items-start space-x-2">
                                        <span className={`mt-0.5 flex-shrink-0 w-3 h-3 rounded-full flex items-center justify-center border ${c.met ? 'bg-green-500 border-green-500' : 'bg-transparent border-zinc-400'}`}>
                                          {c.met && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                                        </span>
                                        <span className={`text-xs ${c.met ? 'text-zinc-800' : 'text-zinc-500 line-through'}`}>{c.point}</span>
                                      </div>
                                   ))}
                                 </div>
                               )}
                             </div>
                           );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {mappingResult.unmatched_answers.length > 0 && (
            <div className="pt-6 pb-2">
              <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-1">Unmapped Answers</h3>
              <div className="space-y-3">
                {mappingResult.unmatched_answers.map((a, i) => {
                  const isSelected = selectedUnmatched === a;
                  return (
                    <div 
                      key={`unmapped-${i}`} 
                      onClick={() => handleSelectUnmatched(a)}
                      className={`bg-zinc-50 rounded-xl border border-dashed p-4 cursor-pointer transition-all ${
                        isSelected ? "border-orange-500 bg-orange-50 shadow-sm" : "hover:border-zinc-400"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded bg-zinc-200 text-zinc-600 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                          ?
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-zinc-700 italic">
                            "{a.text.length > 60 ? a.text.substring(0, 60) + '...' : a.text}"
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs font-medium text-zinc-500 bg-zinc-200 px-2 py-0.5 rounded">
                              {a.detected_label ? `Label: ${a.detected_label}` : 'No label'}
                            </span>
                            <span className="text-[10px] text-zinc-400">Page {a.page}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Document Viewer */}
      <div className="flex-1 flex flex-col bg-zinc-900 rounded-2xl overflow-hidden relative shadow-inner">
        <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-white">
          <h2 className="font-medium">Answer Sheet</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-zinc-800 rounded-lg p-1">
              <button onClick={handleZoomOut} className="p-1 hover:bg-zinc-700 rounded text-zinc-300 transition-colors" title="Zoom Out">
                <ZoomOut size={18} />
              </button>
              <span className="text-xs font-medium w-12 text-center text-zinc-400">{Math.round(zoom * 100)}%</span>
              <button onClick={handleZoomIn} className="p-1 hover:bg-zinc-700 rounded text-zinc-300 transition-colors" title="Zoom In">
                <ZoomIn size={18} />
              </button>
            </div>
            
            {!isImage && numPages > 0 && (
              <div className="flex items-center space-x-4 text-sm bg-zinc-800 rounded-lg px-3 py-1">
                <button 
                  disabled={currentPage <= 1} 
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="hover:text-zinc-300 disabled:opacity-50 font-bold"
                >
                  &lt;
                </button>
                <span>Page {currentPage} of {numPages}</span>
                <button 
                  disabled={currentPage >= numPages} 
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="hover:text-zinc-300 disabled:opacity-50 font-bold"
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-8 flex items-start justify-center relative bg-[#1c1c1c]">
          <div className="relative inline-block shadow-2xl transition-transform" style={isImage ? { width: `${zoom * 100}%` } : {}}>
            {isImage ? (
              imageUrl && <img src={imageUrl} alt="Answer Sheet" className="w-full h-auto block" />
            ) : (
              <canvas ref={canvasRef} className="block bg-white"></canvas>
            )}

            {/* Bounding Box Highlight Overlay */}
            {selectedAnswers && (Array.isArray(selectedAnswers) ? selectedAnswers : [selectedAnswers]).map((ans, idx) => {
              if (!isImage && ans.page !== currentPage) return null;
              const bbox = ans.bbox;
              return (
                <div 
                  key={idx}
                  className="absolute border-2 border-green-500 bg-green-500/20 rounded z-10 transition-all duration-300 pointer-events-none"
                  style={{
                    top: `${bbox.y_min * 100}%`,
                    left: `${bbox.x_min * 100}%`,
                    width: `${(bbox.x_max - bbox.x_min) * 100}%`,
                    height: `${(bbox.y_max - bbox.y_min) * 100}%`
                  }}
                >
                  {ans.detected_label && (
                     <div className="absolute -top-6 -left-0.5 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded shadow">
                       {ans.detected_label} {selectedAnswers.length > 1 ? `(Part ${idx + 1})` : ''}
                     </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
