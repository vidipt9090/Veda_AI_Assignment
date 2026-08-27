export interface BBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface ExtractedQuestion {
  number: string;
  sub_part: string | null;
  text: string;
  page: number;
  bbox: BBox;
}

export interface ExtractedAnswer {
  detected_label: string | null;
  text: string;
  page: number;
  bbox: BBox;
}

export interface EvaluationCriterion {
  point: string;
  met: boolean;
}

export interface EvaluationResult {
  verdict: "correct" | "partially_correct" | "incorrect";
  criteria: EvaluationCriterion[];
  feedback: string;
  confidence: "high" | "medium" | "low";
}

export interface MappedPair {
  question: ExtractedQuestion;
  answer: ExtractedAnswer[] | null;
  mapping_confidence: number;
  evaluation?: EvaluationResult;
}

export interface MappingResult {
  matched: MappedPair[];
  unanswered: ExtractedQuestion[];
  unmatched_answers: ExtractedAnswer[];
}
