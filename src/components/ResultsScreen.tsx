"use client";

import { useEffect, useRef, useState } from "react";
import { MappingResult, ExtractedQuestion, ExtractedAnswer } from "@/types";
import { ChevronDown, ChevronUp, ZoomIn, ZoomOut, ArrowRight, ArrowLeft, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

// Set worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function PdfPageRenderer({ 
  pdfDocument, 
  pageNumber, 
  zoom 
}: { 
  pdfDocument: pdfjsLib.PDFDocumentProxy; 
  pageNumber: number; 
  zoom: number; 
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;
    if (!pdfDocument || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(pageNumber);
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
          console.error(`PDF Render Error on page ${pageNumber}:`, error);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDocument, pageNumber, zoom]);

  return <canvas ref={canvasRef} className="block bg-white shadow-sm"></canvas>;
}

export default function ResultsScreen({
  mappingResult,
  answerSheetFile
}: {
  mappingResult: MappingResult;
  answerSheetFile: File;
}) {
  const [selectedQuestion, setSelectedQuestion] = useState<ExtractedQuestion | null>(null);
  const [selectedUnmatched, setSelectedUnmatched] = useState<ExtractedAnswer | null>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isImage, setIsImage] = useState(false);

  // Mobile Tabs
  const [activeMobileTab, setActiveMobileTab] = useState<'questions' | 'document'>('questions');

  // Multi-page part tracker
  const [currentPartIndex, setCurrentPartIndex] = useState<number>(0);

  // Set default zoom on mount (50% on mobile, 100% on desktop)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) {
        setZoom(0.5);
      } else {
        setZoom(1.0);
      }
    }
  }, []);

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

  const scrollToPage = (pageNumber: number) => {
    const element = document.getElementById(`pdf-page-${pageNumber}`);
    if (element) {
      // Small delay to ensure render
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleSelectQuestion = (q: ExtractedQuestion) => {
    setSelectedQuestion(q);
    setSelectedUnmatched(null);
    setCurrentPartIndex(0); // reset part index
    setActiveMobileTab('document'); // auto-switch on mobile
    
    // Find the mapped answer to jump to the right page
    const mapped = mappingResult.matched.find(m => m.question.number === q.number && m.question.sub_part === q.sub_part);
    if (mapped && mapped.answer && mapped.answer.length > 0) {
      if (!isImage) {
         scrollToPage(mapped.answer[0].page);
      }
    }
  };

  const handleSelectUnmatched = (a: ExtractedAnswer) => {
    setSelectedUnmatched(a);
    setSelectedQuestion(null);
    setCurrentPartIndex(0);
    setActiveMobileTab('document'); // auto-switch on mobile
    if (!isImage) scrollToPage(a.page);
  };

  const getQuestionId = (q: ExtractedQuestion) => `${q.number}_${q.sub_part || ''}`;
  const [manualLinks, setManualLinks] = useState<{ [id: string]: ExtractedAnswer[] }>({});

  const getMatchedAnswer = (q: ExtractedQuestion) => {
    return mappingResult.matched.find(m => m.question.number === q.number && m.question.sub_part === q.sub_part)?.answer;
  };

  // Extract selected answers
  let selectedAnswers = selectedQuestion 
    ? getMatchedAnswer(selectedQuestion) 
    : selectedUnmatched 
      ? [selectedUnmatched] 
      : null;

  if (selectedQuestion && selectedAnswers) {
    const qId = getQuestionId(selectedQuestion);
    if (manualLinks[qId]) {
      selectedAnswers = [...selectedAnswers, ...manualLinks[qId]];
    }
  } else if (selectedUnmatched && selectedAnswers) {
    const qId = `unmatched_${selectedUnmatched.page}_${selectedUnmatched.bbox.y_min}`;
    if (manualLinks[qId]) {
      selectedAnswers = [...selectedAnswers, ...manualLinks[qId]];
    }
  }

  const handleManualLinkNextPage = (ans: ExtractedAnswer) => {
    const nextPage = ans.page + 1;
    if (nextPage > numPages) return;
    
    const allAnswers: ExtractedAnswer[] = [
      ...mappingResult.matched.flatMap(m => m.answer || []),
      ...mappingResult.unmatched_answers
    ].filter((a): a is ExtractedAnswer => a !== null && a !== undefined);
    
    const nextPageAnswers = allAnswers.filter(a => a.page === nextPage).sort((a, b) => a.bbox.y_min - b.bbox.y_min);
    
    if (nextPageAnswers.length > 0) {
      const topAnswer = nextPageAnswers[0];
      const qId = selectedQuestion ? getQuestionId(selectedQuestion) : (selectedUnmatched ? `unmatched_${selectedUnmatched.page}_${selectedUnmatched.bbox.y_min}` : null);
      if (qId) {
        setManualLinks(prev => ({
          ...prev,
          [qId]: [...(prev[qId] || []), topAnswer]
        }));
      }
      setTimeout(() => setCurrentPartIndex((selectedAnswers?.length ?? 1)), 0);
    }
    
    if (!isImage) scrollToPage(nextPage);
  };

  // Multi-page logic
  const handleNextPart = () => {
    if (selectedAnswers && currentPartIndex < selectedAnswers.length - 1) {
      const nextIdx = currentPartIndex + 1;
      setCurrentPartIndex(nextIdx);
      if (!isImage) scrollToPage(selectedAnswers[nextIdx].page);
    }
  };

  const handlePrevPart = () => {
    if (selectedAnswers && currentPartIndex > 0) {
      const prevIdx = currentPartIndex - 1;
      setCurrentPartIndex(prevIdx);
      if (!isImage) scrollToPage(selectedAnswers[prevIdx].page);
    }
  };

  const isMultiPart = selectedAnswers && selectedAnswers.length > 1;

  // Render questions list
  const allQuestions = [...mappingResult.matched.map(m => m.question), ...mappingResult.unanswered].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return a.bbox.y_min - b.bbox.y_min;
  });

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  return (
    <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden bg-transparent p-2 md:p-6 gap-4 md:gap-6">
      
      {/* Mobile Tab Segmented Control */}
      <div className="lg:hidden flex bg-[#e8e9ec] p-1 rounded-full flex-shrink-0 shadow-inner mx-2 my-1">
        <button 
          onClick={() => setActiveMobileTab('questions')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-full transition-all ${
            activeMobileTab === 'questions' 
              ? 'bg-[#252528] text-white shadow-md' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Questions
        </button>
        <button 
          onClick={() => setActiveMobileTab('document')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-full transition-all ${
            activeMobileTab === 'document' 
              ? 'bg-[#252528] text-white shadow-md' 
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Answer Sheet
        </button>
      </div>

      {/* Left Column: Questions */}
      <div className={`${activeMobileTab === 'questions' ? 'flex' : 'hidden'} lg:flex w-full lg:w-1/3 h-full flex-col bg-transparent md:bg-white/80 md:backdrop-blur-sm md:border border-zinc-200/60 rounded-3xl overflow-hidden flex-shrink-0 shadow-sm`}>
        <div className="p-4 md:p-5 bg-transparent border-b border-zinc-200/60 flex items-center justify-between">
          <h2 className="font-bold text-zinc-900 text-base">Extracted Questions <span className="text-xs font-normal text-zinc-400 block sm:inline">(from question paper)</span></h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
          {allQuestions.map((q, i) => {
            const isSelected = selectedQuestion === q;
            const isMatched = !!getMatchedAnswer(q);
            const mPair = mappingResult.matched.find(m => m.question.number === q.number && m.question.sub_part === q.sub_part);
            const evalRes = mPair?.evaluation;
            
            // Score formatting
            let scoreText = isMatched ? "2/2" : "0/2";
            let scoreBadgeClass = "text-emerald-700 bg-emerald-50 border-emerald-200";
            if (evalRes) {
              if (evalRes.verdict === "correct") {
                scoreText = "2/2";
                scoreBadgeClass = "text-emerald-700 bg-emerald-50 border-emerald-200";
              } else if (evalRes.verdict === "partially_correct") {
                scoreText = "1/2";
                scoreBadgeClass = "text-amber-700 bg-amber-50 border-amber-200";
              } else {
                scoreText = "0/2";
                scoreBadgeClass = "text-rose-700 bg-rose-50 border-rose-200";
              }
            } else if (!isMatched) {
              scoreText = "0/2";
              scoreBadgeClass = "text-rose-700 bg-rose-50 border-rose-200";
            }
            
            return (
              <div 
                key={i} 
                onClick={() => handleSelectQuestion(q)}
                className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all shadow-sm ${
                  isSelected 
                    ? "border-zinc-800 ring-2 ring-zinc-800/20 shadow-md" 
                    : "border-zinc-200/80 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-full bg-[#343438] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    {q.number}{q.sub_part ? ` ${q.sub_part}` : ''}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${scoreBadgeClass}`}>
                        {scoreText}
                      </span>
                      <ChevronDown size={16} className={`text-zinc-400 transition-transform ${isSelected ? 'rotate-180 text-zinc-800' : ''}`} />
                    </div>
                    
                    <p className="text-xs text-zinc-700 font-normal leading-relaxed mt-2.5">
                      {q.text}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                       {isMatched ? (
                         <>
                           {(() => {
                             const ansArray = getMatchedAnswer(q);
                             if (ansArray && ansArray.length > 1) {
                               const pages = Array.from(new Set(ansArray.map(a => a.page)));
                               if (pages.length > 1) {
                                 return <span className="text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">Spans {pages.length} Pages</span>;
                               } else {
                                 return <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">{ansArray.length} Parts</span>;
                               }
                             }
                             return null;
                           })()}
                         </>
                       ) : (
                         <span className="text-[10px] font-medium text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">Unanswered</span>
                       )}
                    </div>
                    
                    {/* AI Feedback Accordion */}
                    {isSelected && (
                      <div className="mt-3.5 pt-3 border-t border-zinc-100 animate-fadeIn">
                        {evalRes ? (
                          <div className="space-y-2">
                            <p className="text-[11px] font-bold text-zinc-800">AI Feedback</p>
                            <p className="text-xs text-zinc-600 leading-relaxed bg-[#f8f8f9] p-3 rounded-xl border border-zinc-100">
                              {evalRes.feedback}
                            </p>
                            
                            {evalRes.criteria && evalRes.criteria.length > 0 && (
                              <div className="bg-[#f8f8f9] rounded-xl p-3 space-y-1.5 border border-zinc-100 mt-2">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Grading Criteria</p>
                                {evalRes.criteria.map((c, idx) => (
                                   <div key={idx} className="flex items-start space-x-2">
                                     <span className={`mt-0.5 flex-shrink-0 w-3 h-3 rounded-full flex items-center justify-center border ${c.met ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-zinc-300'}`}>
                                       {c.met && <span className="w-1 h-1 bg-white rounded-full"></span>}
                                     </span>
                                     <span className={`text-[11px] ${c.met ? 'text-zinc-800 font-medium' : 'text-zinc-400 line-through'}`}>{c.point}</span>
                                   </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 italic">Evaluation in progress or not available.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {mappingResult.unmatched_answers.length > 0 && (
            <div className="pt-4 pb-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 px-1">Unmapped Answers</h3>
              <div className="space-y-2.5">
                {mappingResult.unmatched_answers.map((a, i) => {
                  const isSelected = selectedUnmatched === a;
                  return (
                    <div 
                      key={`unmapped-${i}`} 
                      onClick={() => handleSelectUnmatched(a)}
                      className={`bg-white rounded-2xl border p-3.5 cursor-pointer transition-all shadow-sm ${
                        isSelected ? "border-orange-500 bg-orange-50/50 ring-1 ring-orange-500" : "border-dashed border-zinc-300 hover:border-zinc-400"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-7 h-7 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          ?
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-zinc-700 italic">
                            "{a.text.length > 60 ? a.text.substring(0, 60) + '...' : a.text}"
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">
                              {a.detected_label ? `Label: ${a.detected_label}` : 'No label'}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium">Page {a.page}</span>
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
      <div className={`${activeMobileTab === 'document' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col bg-[#222225] rounded-3xl overflow-hidden relative shadow-2xl border border-zinc-800`}>
        {/* Top Controls Toolbar matching Figma Pill Design */}
        <div className="p-3.5 bg-[#222225] border-b border-zinc-800/80 flex items-center justify-between text-white">
          
          {/* Zoom Control Pill */}
          <div className="flex items-center space-x-3 bg-[#333337] px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm border border-white/5">
            <button onClick={handleZoomOut} className="hover:text-zinc-300 transition-colors p-0.5" title="Zoom Out">
              <Minus size={13} />
            </button>
            <span className="w-10 text-center text-zinc-200 text-xs font-medium">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} className="hover:text-zinc-300 transition-colors p-0.5" title="Zoom In">
              <Plus size={13} />
            </button>
          </div>

          {/* Page Selector Pill */}
          <div className="flex items-center space-x-2 bg-[#333337] px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border border-white/5">
            <button 
              onClick={() => {
                const cur = selectedAnswers ? selectedAnswers[currentPartIndex].page : 1;
                if (cur > 1) {
                  scrollToPage(cur - 1);
                  if (selectedAnswers) {
                    const prevPart = selectedAnswers.findIndex(a => a.page === cur - 1);
                    if (prevPart !== -1) setCurrentPartIndex(prevPart);
                  }
                }
              }} 
              className="hover:text-zinc-300 transition-colors p-0.5"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-zinc-200 text-xs font-medium">Page {selectedAnswers ? selectedAnswers[currentPartIndex].page : 1} of {numPages}</span>
            <button 
              onClick={() => {
                const cur = selectedAnswers ? selectedAnswers[currentPartIndex].page : 1;
                if (cur < numPages) {
                  scrollToPage(cur + 1);
                  if (selectedAnswers) {
                    const nextPart = selectedAnswers.findIndex(a => a.page === cur + 1);
                    if (nextPart !== -1) setCurrentPartIndex(nextPart);
                  }
                }
              }} 
              className="hover:text-zinc-300 transition-colors p-0.5"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-[#18181b]">
          <div className="flex flex-col items-center min-w-max space-y-6 relative pb-16">
          {isImage ? (
             <div className="relative inline-block shadow-2xl transition-transform" style={{ width: `${zoom * 100}%` }}>
               {imageUrl && <img src={imageUrl} alt="Answer Sheet" className="w-full h-auto block" />}
               
               {/* Bounding Box Highlight Overlay for Image */}
               {selectedAnswers && selectedAnswers.map((ans, idx) => {
                 const bbox = ans.bbox;
                 return (
                   <div 
                     key={idx}
                     className={`absolute border-2 border-green-500 rounded z-10 transition-all duration-300 pointer-events-none ${idx === currentPartIndex ? 'bg-green-500/30 border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'bg-green-500/10'}`}
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
          ) : (
             pdfDocument && Array.from({ length: numPages }).map((_, i) => {
                const pageNumber = i + 1;
                const pageAnswers = selectedAnswers ? selectedAnswers.filter(a => a.page === pageNumber) : [];
                
                return (
                  <div key={pageNumber} id={`pdf-page-${pageNumber}`} className="relative inline-block w-fit shadow-2xl transition-all">
                     <PdfPageRenderer pdfDocument={pdfDocument} pageNumber={pageNumber} zoom={zoom} />
                     
                     {/* Bounding Box Highlight Overlay for this PDF Page */}
                     {pageAnswers.map((ans, idx) => {
                       // Find the actual index of this answer in the full selectedAnswers array to match active state
                       const globalIdx = selectedAnswers?.findIndex(a => a === ans) ?? 0;
                       const isActivePart = globalIdx === currentPartIndex;
                       
                       const bbox = ans.bbox;
                       return (
                         <div 
                           key={idx}
                           className={`absolute border-2 border-green-500 rounded z-10 transition-all duration-300 pointer-events-none ${isActivePart ? 'bg-green-500/30 border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'bg-green-500/10 opacity-70'}`}
                           style={{
                             top: `${bbox.y_min * 100}%`,
                             left: `${bbox.x_min * 100}%`,
                             width: `${(bbox.x_max - bbox.x_min) * 100}%`,
                             height: `${(bbox.y_max - bbox.y_min) * 100}%`
                           }}
                         >
                           {ans.detected_label && (
                              <div className="absolute -top-6 -left-0.5 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded shadow">
                                {ans.detected_label} {selectedAnswers && selectedAnswers.length > 1 ? `(Part ${globalIdx + 1})` : ''}
                              </div>
                           )}
                           
                           {/* Mapped continuation */}
                           {selectedAnswers && selectedAnswers.length > 1 && globalIdx < selectedAnswers.length - 1 && selectedAnswers[globalIdx + 1].page > ans.page && (
                              <div 
                                className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-20 cursor-pointer hover:bg-blue-700 transition-colors pointer-events-auto whitespace-nowrap"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNextPart();
                                }}
                              >
                                <span>Continues on next page</span>
                                <ArrowRight size={12} className="rotate-90" />
                              </div>
                           )}

                           {/* Smart Fallback for unmapped continuation */}
                           {(!selectedAnswers || globalIdx === selectedAnswers.length - 1) && ans.bbox.y_max > 0.80 && ans.page < numPages && isActivePart && (
                              <div 
                                className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-20 cursor-pointer hover:bg-amber-600 transition-colors pointer-events-auto whitespace-nowrap"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleManualLinkNextPage(ans);
                                }}
                              >
                                <span>May continue on next page. Check here</span>
                                <ArrowRight size={12} className="rotate-90" />
                              </div>
                           )}
                         </div>
                       );
                     })}
                  </div>
                );
             })
          )}
          </div>
        </div>

        {/* Floating Indicator for Multi-part Answers */}
        {isMultiPart && selectedAnswers && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-800 shadow-2xl rounded-full px-5 py-2.5 flex items-center space-x-4 z-50 w-max max-w-[90vw]">
            <div className="text-zinc-300 flex flex-col pr-3 border-r border-zinc-700">
              <span className="font-semibold text-white text-xs">Answer spans multiple pages</span>
              <span className="text-[10px] text-zinc-400">Part {currentPartIndex + 1} of {selectedAnswers.length} (Page {selectedAnswers[currentPartIndex]?.page})</span>
            </div>
            <div className="flex items-center space-x-2">
               <button 
                 onClick={handlePrevPart}
                 disabled={currentPartIndex === 0}
                 className="p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 rounded-full text-white transition-colors flex items-center justify-center"
                 title="Previous Part"
               >
                 <ArrowLeft size={14} />
               </button>
               <button 
                 onClick={handleNextPart}
                 disabled={currentPartIndex === selectedAnswers.length - 1}
                 className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:hover:bg-orange-500 rounded-full text-white font-medium text-xs transition-colors flex items-center space-x-1.5 whitespace-nowrap"
               >
                 <span>Next Part</span>
                 <ArrowRight size={14} />
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
