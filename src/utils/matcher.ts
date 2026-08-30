import { ExtractedQuestion, ExtractedAnswer, MappingResult, MappedPair } from "../types";

export function matchAnswersToQuestions(
  questions: ExtractedQuestion[],
  answers: ExtractedAnswer[]
): MappingResult {
  const matched: MappedPair[] = [];
  const unanswered: ExtractedQuestion[] = [];
  const unmatched_answers: ExtractedAnswer[] = [];

  // Helper: Roman, letter, and number equivalents for sub-parts
  const getSubPartEquivalents = (subPart: string): string[] => {
    if (!subPart) return [];
    const sp = subPart.toLowerCase().trim();
    const equivalents = new Set<string>([sp]);
    
    const mapLetterToRoman: Record<string, string> = { 'a': 'i', 'b': 'ii', 'c': 'iii', 'd': 'iv', 'e': 'v', 'f': 'vi', 'g': 'vii', 'h': 'viii' };
    const mapRomanToLetter: Record<string, string> = { 'i': 'a', 'ii': 'b', 'iii': 'c', 'iv': 'd', 'v': 'e', 'vi': 'f', 'vii': 'g', 'viii': 'h' };
    const mapNumToLetter: Record<string, string> = { '1': 'a', '2': 'b', '3': 'c', '4': 'd', '5': 'e', '6': 'f' };
    const mapNumToRoman: Record<string, string> = { '1': 'i', '2': 'ii', '3': 'iii', '4': 'iv', '5': 'v', '6': 'vi' };
    const mapRomanToNum: Record<string, string> = { 'i': '1', 'ii': '2', 'iii': '3', 'iv': '4', 'v': '5', 'vi': '6' };
    const mapLetterToNum: Record<string, string> = { 'a': '1', 'b': '2', 'c': '3', 'd': '4', 'e': '5', 'f': '6' };

    if (mapLetterToRoman[sp]) equivalents.add(mapLetterToRoman[sp]);
    if (mapRomanToLetter[sp]) equivalents.add(mapRomanToLetter[sp]);
    if (mapNumToLetter[sp]) equivalents.add(mapNumToLetter[sp]);
    if (mapNumToRoman[sp]) equivalents.add(mapNumToRoman[sp]);
    if (mapRomanToNum[sp]) equivalents.add(mapRomanToNum[sp]);
    if (mapLetterToNum[sp]) equivalents.add(mapLetterToNum[sp]);

    return Array.from(equivalents);
  };

  // Helper: Normalize labels
  const normalizeText = (str: string): string => {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  // Helper: Test if an answer's label matches a question's number and sub-part
  const isLabelMatch = (label: string, qNum: string, subPart?: string | null): boolean => {
    if (!label) return false;
    const cleanLabel = label.toLowerCase().trim();
    const alphaLabel = normalizeText(cleanLabel);
    const qAlpha = normalizeText(qNum);

    if (!subPart) {
      // Question has NO sub-part
      return (
        alphaLabel === qAlpha ||
        alphaLabel === `q${qAlpha}` ||
        alphaLabel === `ans${qAlpha}` ||
        alphaLabel === `question${qAlpha}` ||
        alphaLabel === `answer${qAlpha}`
      );
    }

    // Question HAS sub-part (e.g. 7, ii)
    const eqList = getSubPartEquivalents(subPart);
    for (const eq of eqList) {
      const eqAlpha = normalizeText(eq);
      if (
        alphaLabel === `${qAlpha}${eqAlpha}` ||
        alphaLabel === `q${qAlpha}${eqAlpha}` ||
        alphaLabel === `ans${qAlpha}${eqAlpha}` ||
        alphaLabel === `question${qAlpha}${eqAlpha}` ||
        alphaLabel === `answer${qAlpha}${eqAlpha}` ||
        alphaLabel === `${qAlpha}part${eqAlpha}` ||
        // Check formatted variants
        cleanLabel.includes(`${qNum}(${eq})`) ||
        cleanLabel.includes(`${qNum}.${eq}`) ||
        cleanLabel.includes(`${qNum} ${eq}`) ||
        cleanLabel.includes(`${qNum}-${eq}`) ||
        cleanLabel.includes(`${qNum}(${subPart})`)
      ) {
        return true;
      }
    }

    return false;
  };

  // Pre-sort answers in reading order
  const availableAnswers = [...answers].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return a.bbox.y_min - b.bbox.y_min;
  });

  const matchedAnswersMap = new Map<ExtractedQuestion, ExtractedAnswer[]>();
  const usedAnswerIndices = new Set<number>();

  // ==========================================
  // PASS 1: Exact Number & Sub-part Label Match
  // ==========================================
  for (const q of questions) {
    const matchedBlocks: ExtractedAnswer[] = [];

    for (let i = 0; i < availableAnswers.length; i++) {
      if (usedAnswerIndices.has(i)) continue;
      const ans = availableAnswers[i];
      if (!ans.detected_label) continue;

      if (isLabelMatch(ans.detected_label, q.number, q.sub_part)) {
        matchedBlocks.push(ans);
        usedAnswerIndices.add(i);
      }
    }

    if (matchedBlocks.length > 0) {
      matchedAnswersMap.set(q, matchedBlocks);
    }
  }

  // ==========================================
  // PASS 2: Multi-part sub-part matching within Question Number group
  // (e.g. Question has Q7(i), Q7(ii); student wrote '7a', '7b' or '(i)', '(ii)')
  // ==========================================
  const remainingQuestions = questions.filter(q => !matchedAnswersMap.has(q));
  const questionsByNum: Record<string, ExtractedQuestion[]> = {};
  for (const q of remainingQuestions) {
    if (!questionsByNum[q.number]) questionsByNum[q.number] = [];
    questionsByNum[q.number].push(q);
  }

  for (const [qNum, groupQs] of Object.entries(questionsByNum)) {
    // Find unused answers that belong to this question number
    const candidateIndices: number[] = [];
    for (let i = 0; i < availableAnswers.length; i++) {
      if (usedAnswerIndices.has(i)) continue;
      const ans = availableAnswers[i];
      if (!ans.detected_label) continue;

      const alphaLabel = normalizeText(ans.detected_label);
      const qAlpha = normalizeText(qNum);
      if (alphaLabel.startsWith(qAlpha) || alphaLabel.startsWith(`q${qAlpha}`) || alphaLabel.startsWith(`ans${qAlpha}`)) {
        candidateIndices.push(i);
      }
    }

    // Match sequentially to remaining sub-parts
    for (let j = 0; j < Math.min(groupQs.length, candidateIndices.length); j++) {
      const q = groupQs[j];
      const ansIdx = candidateIndices[j];
      usedAnswerIndices.add(ansIdx);
      matchedAnswersMap.set(q, [availableAnswers[ansIdx]]);
    }
  }

  // ==========================================
  // PASS 3: Connect True Multi-Page Continuations
  // (Only connect adjacent blocks that are unlabeled or explicitly marked '(cont)' directly following a matched answer)
  // ==========================================
  for (const [q, blocks] of matchedAnswersMap.entries()) {
    const lastBlock = blocks[blocks.length - 1];
    
    // Check if there is an immediate subsequent block on the same or next page that is an explicit continuation
    for (let i = 0; i < availableAnswers.length; i++) {
      if (usedAnswerIndices.has(i)) continue;
      const candidate = availableAnswers[i];

      const isSamePageContinuation = (
        candidate.page === lastBlock.page &&
        candidate.bbox.y_min > lastBlock.bbox.y_min &&
        (!candidate.detected_label || candidate.detected_label.toLowerCase().includes('cont'))
      );

      const isNextPageContinuation = (
        candidate.page === lastBlock.page + 1 &&
        candidate.bbox.y_min < 0.35 &&
        (!candidate.detected_label || candidate.detected_label.toLowerCase().includes('cont') || candidate.detected_label.toLowerCase().includes('p.t.o'))
      );

      // Only merge if this candidate doesn't match any remaining unanswered question
      const matchesAnotherQuestion = remainingQuestions.some(rq => 
        candidate.detected_label && isLabelMatch(candidate.detected_label, rq.number, rq.sub_part)
      );

      if ((isSamePageContinuation || isNextPageContinuation) && !matchesAnotherQuestion) {
        // Safe continuation
        blocks.push(candidate);
        usedAnswerIndices.add(i);
        break; // Only attach one continuation block at a time to prevent swallowing other answers
      }
    }
  }

  // ==========================================
  // PASS 4: Spatial / Natural Reading Order for Remaining Unmatched
  // ==========================================
  const stillUnanswered = questions.filter(q => !matchedAnswersMap.has(q));
  const remainingAnswerIndices = availableAnswers
    .map((_, i) => i)
    .filter(i => !usedAnswerIndices.has(i));

  for (let k = 0; k < Math.min(stillUnanswered.length, remainingAnswerIndices.length); k++) {
    const q = stillUnanswered[k];
    const ansIdx = remainingAnswerIndices[k];
    const ans = availableAnswers[ansIdx];

    // If answer has a totally conflicting different question number, do not force-bind
    if (ans.detected_label) {
      const aNum = ans.detected_label.replace(/\D/g, '');
      const qNum = q.number.replace(/\D/g, '');
      if (aNum.length > 0 && qNum.length > 0 && aNum !== qNum) {
        continue; // Don't force wrong question numbers
      }
    }

    usedAnswerIndices.add(ansIdx);
    matchedAnswersMap.set(q, [ans]);
  }

  // ==========================================
  // Final Assembly
  // ==========================================
  for (const q of questions) {
    if (matchedAnswersMap.has(q)) {
      matched.push({
        question: q,
        answer: matchedAnswersMap.get(q)!,
        mapping_confidence: 0.95
      });
    } else {
      unanswered.push(q);
    }
  }

  for (let i = 0; i < availableAnswers.length; i++) {
    if (!usedAnswerIndices.has(i)) {
      unmatched_answers.push(availableAnswers[i]);
    }
  }

  // Sort matched questions in document order
  matched.sort((a, b) => {
    if (a.question.page !== b.question.page) return a.question.page - b.question.page;
    return a.question.bbox.y_min - b.question.bbox.y_min;
  });

  return {
    matched,
    unanswered,
    unmatched_answers
  };
}
