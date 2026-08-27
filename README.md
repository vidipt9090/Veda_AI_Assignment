# VedaAI - Assessment Extraction & Answer Mapping

This project is a web application built for the VedaAI hiring assignment. It allows teachers to upload a question paper and a student's handwritten answer sheet, automatically extracts and maps the questions to the answers, highlights the exact regions on the answer sheet, and provides AI-generated grading and feedback.

## Features
- **Intelligent Extraction**: Extracts questions in their printed order, treating sub-parts (e.g., 11(a) and 11(b)) as distinct entities while preserving their numbering.
- **Answer Mapping**: Maps answers to their corresponding questions, even if they are answered out of order or span multiple pages.
- **Unanswered & Unmapped Handling**: Identifies questions that were left blank and highlights extra scribbles/text that didn't match any specific question.
- **Bounding Box Highlights**: Draws precise overlays over the handwritten answers directly on a high-fidelity PDF viewer canvas.
- **AI-Powered Grading Pipeline**: Runs a secondary evaluation pipeline on matched pairs to generate a verdict (Correct, Partially Correct, Incorrect), a criteria checkmark list, and specific textual feedback.
- **API Key Rotation**: Gracefully rotates between multiple Gemini API keys in a round-robin fashion to prevent rate limits during heavy extraction workloads.

## Tech Stack
- **Framework**: Next.js 14 (App Router) with React
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI/LLM**: Google Gemini (`gemini-3.6-flash`) via `@google/genai` SDK
- **PDF Rendering**: `react-pdf`
- **Icons & UI**: `lucide-react`, `react-hot-toast`

## Approach & AI Model Used
Our approach relies heavily on **Spatial & Structural Prompting** with a Vision LLM (`gemini-3.6-flash`). 
Instead of traditional OCR + text-matching (which is brittle for handwriting and multi-page layouts), we feed the raw PDF pages as images to Gemini and enforce a strict JSON Schema response. 

1. **Question Extraction**: Gemini identifies the document structure, separates sub-parts, and returns normalized `[x_min, y_min, x_max, y_max]` bounding boxes.
2. **Answer Extraction**: We instruct the model to transcribe handwritten blocks, guess the intended label (if present), and return bounding boxes. We include custom algorithms to spatially group contiguous unlabeled answer blocks with the preceding labeled answer to support multi-page spanning.
3. **Mapping**: A deterministic matcher links answers to questions based on labels. Unmapped answers and unanswered questions are routed appropriately.
4. **Evaluation**: A second LLM pass sends the matched pairs (Question Text + Answer Text) back to Gemini to reason about correctness without needing a pre-provided rubric.

## Important Assumptions & Limitations
- **File Limits**: For extremely large exam papers (e.g., 50+ pages), the payload size to the Gemini API might exceed limits. The current implementation processes pages in a single batch, which is ideal for standard assignments.
- **Handwriting Legibility**: The accuracy of the AI grading is inherently tied to Gemini's ability to read the handwriting. Extremely poor handwriting might result in hallucinated transcriptions and consequently, flawed grading.
- **In-Memory Storage**: As per the constraints, there is no database. Refreshing the browser will reset the workspace.

## Running Locally

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the root directory and add your Gemini API key(s):
   ```env
   GEMINI_API_KEYS="your_api_key_1,your_api_key_2"
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)

## Design Match
The UI closely follows the provided Figma design, utilizing a sleek sidebar, a dual-pane layout, zoom controls for the PDF viewer, and interactive mapping state management.
