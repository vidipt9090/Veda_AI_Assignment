import { NextRequest, NextResponse } from "next/server";
import { Type, Schema } from "@google/genai";
import { MappedPair, EvaluationResult } from "@/types";
import { runDeterministicCheck } from "@/utils/evaluator";
import { generateContentWithRotation } from "@/utils/gemini";

const evaluationSchema: Schema = {
  type: Type.ARRAY,
  description: "Array of evaluations matching the provided question-answer pairs",
  items: {
    type: Type.OBJECT,
    properties: {
      question_id: {
        type: Type.STRING,
        description: "The unique identifier of the question (e.g., number and sub_part combined like '1a' or '2')"
      },
      verdict: {
        type: Type.STRING,
        description: "correct | partially_correct | incorrect",
      },
      criteria: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            point: { type: Type.STRING, description: "Short description of what was checked" },
            met: { type: Type.BOOLEAN, description: "Whether the criterion was met in the student's answer" }
          },
          required: ["point", "met"]
        }
      },
      feedback: {
        type: Type.STRING,
        description: "One to two sentences, plain language, specific to this answer referencing actual content."
      },
      confidence: {
        type: Type.STRING,
        description: "high | medium | low"
      }
    },
    required: ["question_id", "verdict", "criteria", "feedback", "confidence"]
  }
};

export async function POST(req: NextRequest) {
  try {
    const { matched }: { matched: MappedPair[] } = await req.json();

    if (!matched || matched.length === 0) {
      return NextResponse.json({ evaluations: [] });
    }

    // Prepare the prompt payload
    const evaluationInputs = matched.map((pair) => {
      const qId = pair.question.sub_part ? `${pair.question.number}${pair.question.sub_part}` : pair.question.number;
      const answerText = pair.answer ? pair.answer.map(a => a.text).join('\n\n') : "(No readable text)";
      return `
Question ID: ${qId}
Question Text: ${pair.question.text}
Student's Answer: ${answerText}
      `.trim();
    });

    const systemPrompt = `
You are an expert AI grader evaluating a student's test answers.
You will be provided with a list of matched question-answer pairs.
For each pair, evaluate the student's answer against the question using your own reasoning.

CRITICAL INSTRUCTIONS:
- Use criterion-level reasoning: list the specific things a correct answer needs to show, then check whether each one is present in the student's answer.
- Reference actual content from the student's answer in your feedback. Do not give generic praise or criticism. Be specific.
- Return your evaluation as a structured JSON array exactly matching the schema.
- Do not provide a numeric score, only the verdict and criteria.
- Valid verdicts: "correct", "partially_correct", "incorrect".
- Valid confidences: "high", "medium", "low".
    `;

    const prompt = `
Please evaluate the following ${matched.length} student answers:

${evaluationInputs.join('\n\n---\n\n')}
    `;

    const response = await generateContentWithRotation({
      model: "gemini-3.6-flash",
      contents: [
        { role: "user", parts: [{ text: systemPrompt + "\n\n" + prompt }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: evaluationSchema,
        temperature: 0.1,
      }
    });

    const responseText = response.text || "[]";
    let evaluations: any[] = [];
    try {
      evaluations = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse evaluation response:", e);
      return NextResponse.json({ error: "Failed to parse model response" }, { status: 500 });
    }

    // Post-process with deterministic check
    const finalEvaluations: Record<string, EvaluationResult> = {};
    
    for (const evalResult of evaluations) {
      const qId = evalResult.question_id;
      // Find the corresponding pair
      const pair = matched.find(p => {
        const pId = p.question.sub_part ? `${p.question.number}${p.question.sub_part}` : p.question.number;
        return pId === qId;
      });

      if (pair && pair.answer && pair.answer.length > 0) {
        const answerText = pair.answer.map(a => a.text).join(' ');
        const expected = runDeterministicCheck(pair.question.text, answerText);
        if (expected !== null) {
          // A deterministic answer was found. Does the student's text contain it?
          // Simplistic check: does the student's text contain the expected string?
          // Removing spaces/commas to be safe.
          const cleanStudentText = answerText.replace(/[\s,]/g, '').toLowerCase();
          const cleanExpected = expected.replace(/[\s,]/g, '').toLowerCase();
          
          const isActuallyCorrect = cleanStudentText.includes(cleanExpected);
          const llmSaysCorrect = evalResult.verdict === "correct";

          // If the deterministic check disagrees with the LLM (e.g. LLM says correct but student didn't include the right number)
          if (isActuallyCorrect !== llmSaysCorrect) {
             evalResult.confidence = "low";
             evalResult.feedback += ` [AI Cross-Check Warning: Expected to find the value ${expected} but there was a mismatch. Please review manually.]`;
          }
        }
      }

      finalEvaluations[qId] = evalResult;
    }

    return NextResponse.json({ evaluations: finalEvaluations });
  } catch (error: any) {
    console.error("Evaluation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
