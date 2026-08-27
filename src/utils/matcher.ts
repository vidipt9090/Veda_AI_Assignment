import { ExtractedQuestion, ExtractedAnswer, MappingResult, MappedPair } from "../types";

export function matchAnswersToQuestions(
  questions: ExtractedQuestion[],
  answers: ExtractedAnswer[]
): MappingResult {
  const matched: MappedPair[] = [];
  const unanswered: ExtractedQuestion[] = [];
  const unmatched_answers: ExtractedAnswer[] = [];

  // Group questions by number for fallback matching
  const questionsByNumber: Record<string, ExtractedQuestion[]> = {};
  questions.forEach(q => {
    if (!questionsByNumber[q.number]) {
      questionsByNumber[q.number] = [];
    }
    questionsByNumber[q.number].push(q);
  });

  const getSubPartEquivalents = (subPart: string): string[] => {
    subPart = subPart.toLowerCase();
    const equivalents = [subPart];
    const mapLetterToRoman: Record<string, string> = { 'a': 'i', 'b': 'ii', 'c': 'iii', 'd': 'iv', 'e': 'v', 'f': 'vi' };
    const mapRomanToLetter: Record<string, string> = { 'i': 'a', 'ii': 'b', 'iii': 'c', 'iv': 'd', 'v': 'e', 'vi': 'f' };
    const mapLetterToNum: Record<string, string> = { 'a': '1', 'b': '2', 'c': '3', 'd': '4', 'e': '5', 'f': '6' };
    
    if (mapLetterToRoman[subPart]) equivalents.push(mapLetterToRoman[subPart]);
    if (mapRomanToLetter[subPart]) equivalents.push(mapRomanToLetter[subPart]);
    if (mapLetterToNum[subPart]) equivalents.push(mapLetterToNum[subPart]);
    
    return equivalents;
  };

  // Pre-process answers: Sort by page and y_min
  const sortedAnswers = [...answers].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return a.bbox.y_min - b.bbox.y_min;
  });

  // Group contiguous unlabeled answers with the preceding labeled answer
  const groupedAnswers: ExtractedAnswer[][] = [];
  let currentGroup: ExtractedAnswer[] = [];
  
  for (const a of sortedAnswers) {
    if (a.detected_label && a.detected_label.trim() !== '') {
       if (currentGroup.length > 0) groupedAnswers.push(currentGroup);
       currentGroup = [a];
    } else {
       if (currentGroup.length > 0) {
         currentGroup.push(a);
       } else {
         groupedAnswers.push([a]);
       }
    }
  }
  if (currentGroup.length > 0) groupedAnswers.push(currentGroup);

  const unmatched_groups: ExtractedAnswer[][] = [...groupedAnswers];

  // Step 1: Exact/Fuzzy Match on Label
  questions.forEach((q) => {
    const groupIndex = unmatched_groups.findIndex((group) => {
      const head = group[0];
      if (!head.detected_label) return false;
      
      const rawLabel = head.detected_label.toLowerCase();
      const strippedLabel = rawLabel.replace(/[\s\.]/g, ''); 
      const alphaLabel = rawLabel.replace(/[^a-z0-9]/g, ''); 
      
      const qNum = q.number.toLowerCase();
      const qNumAlpha = q.number.replace(/[^a-z0-9]/g, '').toLowerCase();
      
      if (!q.sub_part) {
        return (
          strippedLabel === qNum || 
          strippedLabel === `${qNum}()` || 
          alphaLabel === qNumAlpha ||
          alphaLabel === `q${qNumAlpha}` ||
          alphaLabel === `ans${qNumAlpha}`
        );
      }
      
      const equivalents = getSubPartEquivalents(q.sub_part);
      for (const eq of equivalents) {
        const eqAlpha = eq.replace(/[^a-z0-9]/g, '').toLowerCase();
        if (
          strippedLabel === `${qNum}(${eq})` ||
          strippedLabel === `${qNum}${eq}` ||
          strippedLabel === eq ||
          strippedLabel === `(${eq})` ||
          alphaLabel === `${qNumAlpha}${eqAlpha}` ||
          alphaLabel === eqAlpha
        ) {
          return true;
        }
      }
      return false;
    });

    if (groupIndex !== -1) {
      const matchedGroup = unmatched_groups.splice(groupIndex, 1)[0];
      matched.push({ question: q, answer: matchedGroup, mapping_confidence: 0.9 });
    } else {
      unanswered.push(q);
    }
  });

  // Step 2: Positional / Order fallback within a question group
  for (const qNum of Object.keys(questionsByNumber)) {
    const groupQs = questionsByNumber[qNum];
    const groupUnanswered = unanswered.filter(q => q.number === qNum);
    
    if (groupUnanswered.length > 0) {
      const groupsForQNum = unmatched_groups.filter(group => {
        const head = group[0];
        return head.detected_label && head.detected_label.startsWith(qNum);
      });
      
      groupsForQNum.sort((aGroup, bGroup) => {
        const a = aGroup[0];
        const b = bGroup[0];
        if (a.page !== b.page) return a.page - b.page;
        return a.bbox.y_min - b.bbox.y_min;
      });

      let gIdx = 0;
      for (const uq of groupUnanswered) {
        if (gIdx < groupsForQNum.length) {
          const matchedGroup = groupsForQNum[gIdx];
          
          const removeUqIdx = unanswered.findIndex(q => q === uq);
          if (removeUqIdx !== -1) unanswered.splice(removeUqIdx, 1);
          
          const removeUmIdx = unmatched_groups.findIndex(g => g === matchedGroup);
          if (removeUmIdx !== -1) unmatched_groups.splice(removeUmIdx, 1);
          
          matched.push({ question: uq, answer: matchedGroup, mapping_confidence: 0.7 });
          gIdx++;
        }
      }
    }
  }

  // Step 3: Spatial / reading-order continuity
  unanswered.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return a.bbox.y_min - b.bbox.y_min;
  });

  unmatched_groups.sort((aGroup, bGroup) => {
    const a = aGroup[0];
    const b = bGroup[0];
    if (a.page !== b.page) return a.page - b.page;
    return a.bbox.y_min - b.bbox.y_min;
  });

  const remainingUnanswered = [...unanswered];
  for (const uq of remainingUnanswered) {
    if (unmatched_groups.length > 0) {
      const qBaseNum = uq.number.replace(/\D/g, ''); 

      const nextGroupIndex = unmatched_groups.findIndex(group => {
         const head = group[0];
         if (!head.detected_label) return true;
         
         const aBaseNum = head.detected_label.replace(/\D/g, '');
         return aBaseNum === qBaseNum || head.detected_label.startsWith(uq.number);
      });

      if (nextGroupIndex !== -1) {
         const nextGroup = unmatched_groups.splice(nextGroupIndex, 1)[0];
         
         const removeUqIdx = unanswered.findIndex(q => q === uq);
         if (removeUqIdx !== -1) unanswered.splice(removeUqIdx, 1);
         
         matched.push({ question: uq, answer: nextGroup, mapping_confidence: 0.4 });
      }
    }
  }

  // Flatten any remaining unmatched groups back into unmatched_answers
  unmatched_groups.forEach(group => {
    unmatched_answers.push(...group);
  });

  // Re-sort matched array based on original question order
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
