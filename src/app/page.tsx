"use client";

import { useState } from "react";
import Header from "@/components/Header";
import UploadScreen from "@/components/UploadScreen";
import MappingProgress, { ProcessingStatus } from "@/components/MappingProgress";
import ResultsScreen from "@/components/ResultsScreen";
import { matchAnswersToQuestions } from "@/utils/matcher";
import { MappingResult } from "@/types";
import { Plus } from "lucide-react";

export default function Home() {
  const [uploadState, setUploadState] = useState<"upload" | "processing" | "results">("upload");
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>("uploading");
  
  const [answerSheetFile, setAnswerSheetFile] = useState<File | null>(null);
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null);

  const handleStartMapping = async (qPaper: File, aSheet: File) => {
    setUploadState("processing");
    setProcessingStatus("uploading");
    setAnswerSheetFile(aSheet);
    
    try {
      // 1. Extract Questions
      setProcessingStatus("extracting-questions");
      const qFormData = new FormData();
      qFormData.append("file", qPaper);
      qFormData.append("type", "questions");
      
      const qRes = await fetch("/api/extract", { method: "POST", body: qFormData });
      if (!qRes.ok) {
         const errData = await qRes.json();
         throw new Error(`Failed to extract questions: ${errData.error}`);
      }
      const qData = await qRes.json();
      
      // 2. Extract Answers
      setProcessingStatus("extracting-answers");
      const aFormData = new FormData();
      aFormData.append("file", aSheet);
      aFormData.append("type", "answers");
      
      const aRes = await fetch("/api/extract", { method: "POST", body: aFormData });
      if (!aRes.ok) {
         const errData = await aRes.json();
         throw new Error(`Failed to extract answers: ${errData.error}`);
      }
      const aData = await aRes.json();
      
      // 3. Match Answers to Questions
      setProcessingStatus("mapping");
      const questions = qData.questions || [];
      const answers = aData.answer_blocks || [];
      
      const result = matchAnswersToQuestions(questions, answers);
      
      // 4. AI Evaluation
      setProcessingStatus("evaluating");
      try {
        const evalRes = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matched: result.matched })
        });
        
        if (evalRes.ok) {
           const evalData = await evalRes.json();
           const evaluations = evalData.evaluations || {};
           
           result.matched = result.matched.map(pair => {
             const pId = pair.question.sub_part ? `${pair.question.number}${pair.question.sub_part}` : pair.question.number;
             if (evaluations[pId]) {
                pair.evaluation = evaluations[pId];
             }
             return pair;
           });
        }
      } catch (e) {
        console.warn("Evaluation failed, proceeding without AI grades", e);
      }
      
      setMappingResult(result);
      
      // 5. Ready to Display
      setProcessingStatus("ready");
      setTimeout(() => setUploadState("results"), 1000);
      
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred during extraction. Please try again.");
      setUploadState("upload");
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <Header 
        onBack={
          uploadState === "results" ? () => {
            setUploadState("upload");
            setMappingResult(null);
            setAnswerSheetFile(null);
          } : undefined
        }
        actionButton={
          uploadState === "results" ? (
            <button 
              onClick={() => {
                setUploadState("upload");
                setMappingResult(null);
                setAnswerSheetFile(null);
              }}
              className="flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors shadow-sm"
            >
              <Plus size={16} />
              <span>Start New Evaluation</span>
            </button>
          ) : undefined
        }
      />
      {uploadState === "upload" && (
        <UploadScreen onStartMapping={handleStartMapping} />
      )}
      {uploadState === "processing" && (
        <div className="flex-1 flex items-center justify-center bg-zinc-100">
           <MappingProgress currentStatus={processingStatus} />
        </div>
      )}
      {uploadState === "results" && mappingResult && answerSheetFile && (
        <ResultsScreen mappingResult={mappingResult} answerSheetFile={answerSheetFile} />
      )}
    </div>
  );
}
