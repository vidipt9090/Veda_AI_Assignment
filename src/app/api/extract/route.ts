import { NextRequest, NextResponse } from "next/server";
import { Type, Schema } from "@google/genai";
import { ExtractedQuestion, ExtractedAnswer } from "@/types";
import { generateContentWithRotation } from "@/utils/gemini";

const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          number: { type: Type.STRING },
          sub_part: { type: Type.STRING, nullable: true },
          text: { type: Type.STRING },
          page: { type: Type.INTEGER, description: "The 1-indexed position of the page within the uploaded file." },
          bbox: {
            type: Type.OBJECT,
            properties: {
              x_min: { type: Type.NUMBER },
              y_min: { type: Type.NUMBER },
              x_max: { type: Type.NUMBER },
              y_max: { type: Type.NUMBER }
            },
            required: ["x_min", "y_min", "x_max", "y_max"]
          }
        },
        required: ["number", "text", "page", "bbox"]
      }
    }
  },
  required: ["questions"]
};

const answerSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    answer_blocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          detected_label: { type: Type.STRING, nullable: true },
          text: { type: Type.STRING },
          page: { type: Type.INTEGER, description: "The 1-indexed position of the page within the uploaded file." },
          bbox: {
            type: Type.OBJECT,
            properties: {
              x_min: { type: Type.NUMBER },
              y_min: { type: Type.NUMBER },
              x_max: { type: Type.NUMBER },
              y_max: { type: Type.NUMBER }
            },
            required: ["x_min", "y_min", "x_max", "y_max"]
          }
        },
        required: ["text", "page", "bbox"]
      }
    }
  },
  required: ["answer_blocks"]
};

// Helper to convert File to a part for Gemini
async function fileToGenerativePart(file: File) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType: file.type
    }
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const type = formData.get("type") as string; // 'questions' or 'answers'
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const part = await fileToGenerativePart(file);
    const modelOptions = {
      model: "gemini-3.6-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: type === "questions" ? questionSchema : answerSchema,
      }
    };

    let prompt = "";
    if (type === "questions") {
      prompt = `Extract all questions from this document. 
      Important rules:
      - Treat labelled sub-parts (like 11(a), 11(b)) as separate question entries, never merged.
      - Extract bounding boxes (bbox) normalized from 0.0 to 1.0.
      - 'page' MUST be the 1-indexed page number of the document where the question appears.`;
    } else {
      prompt = `Extract all handwritten answer blocks from this student answer sheet document. 
      Important rules:
      - Multi-page answers: When an answer continues from one page to the next (e.g. from the bottom of page 1 to the top of page 2), extract each page segment as a distinct answer block with its correct page number and precise bbox. If the continued segment has a label like '1 (cont)' or no label, preserve it in detected_label.
      - Extract precise bounding boxes (bbox) normalized from 0.0 to 1.0 covering the entire handwritten block for that answer segment.
      - 'page' MUST be the exact 1-indexed page number of the document where that specific block appears.
      - If there is a detected label (e.g., 'Q1', '11(a)', 'Ans 2', '1 cont'), include it in 'detected_label'. If unlabeled, leave detected_label null.`;
    }

    const response = await generateContentWithRotation({
      ...modelOptions,
      contents: [
        {
          role: "user",
          parts: [part, { text: prompt }]
        }
      ]
    });

    const responseText = response.text;
    if (!responseText) throw new Error("No response text");
    
    const json = JSON.parse(responseText);
    
    return NextResponse.json(json);
  } catch (error: any) {
    console.error("Extraction error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
