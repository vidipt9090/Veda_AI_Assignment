# VedaAI - Assessment Extraction & Answer Mapping

A full-stack, responsive AI application built for the VedaAI assessment. It enables teachers to upload question papers and handwritten student answer sheets, intelligently maps answers to questions (even when out-of-order or spanning across multiple pages), renders precise canvas bounding boxes, and provides AI-powered evaluation with criteria checklists.

🔗 **Live Deployment**: [https://veda-ai-assignment-murex.vercel.app](https://veda-ai-assignment-murex.vercel.app)

---

## 🌟 Key Features

- **Intelligent Extraction**: Extracts questions in printed order, treating sub-parts (e.g., `11(a)`, `11(b)`) as separate distinct entities while preserving their hierarchy.
- **Smart Multi-Page Answer Mapping**:
  - Automatically identifies answers that continue across page boundaries (e.g. from the bottom of Page 1 to the top of Page 2).
  - Handles explicit continuation labels (`(cont)`, `P.T.O`, `Ans 1 continued`) as well as unlabeled spatial flow.
  - Interactive multi-part floating navigator with seamless part-stepping and manual cross-page linking fallback.
- **Unanswered & Unmapped Handling**: Separates questions with no corresponding answers and surfaces extraneous student scribbles/text as interactive unmapped blocks.
- **Canvas-Aligned Bounding Box Highlights**: Overlays responsive, pixel-perfect highlight boxes onto rendered PDF canvases across all zoom levels (`50%`–`300%`).
- **AI-Powered Evaluation & Grading**: Automatically evaluates answer correctness (`Correct`, `Partial`, `Incorrect`), providing qualitative feedback and a structured checklist of grading criteria.
- **Figma Wireframe Fidelity & Responsive Design**:
  - **Desktop**: Floating rounded layout with collapsible icon-rail sidebar, custom DPS school branding, and dual-pane inspection.
  - **Mobile**: Floating header, segmented tab bar (`Questions` vs. `Answer Sheet`), and custom mobile zoom defaults (`50%`).
- **Resilient API Key Rotation & Case-Insensitive Env Loading**: Dynamically rotates through multiple Gemini API keys to gracefully navigate rate limits and quota caps.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router) with React & TypeScript
- **Styling**: Tailwind CSS
- **AI & Vision LLM**: Google Gemini (`gemini-3.6-flash`) with structured JSON schemas via `@google/genai`
- **PDF Canvas Rendering**: `pdfjs-dist` / `react-pdf`
- **Icons & Polish**: `lucide-react`, `react-hot-toast`

---

## 🧠 Architecture & Methodology

Rather than relying on brittle OCR pipelines, this solution utilizes **Spatial & Structural Prompting** with multimodal vision LLMs:

```
[Question Paper PDF]  ───┐
                          ├─► [Gemini 3.6 Flash (Vision)] ──► [Extracted JSON (BBoxes + Labels)]
[Answer Sheet PDF]    ───┘                                              │
                                                                        ▼
                                                        [Heuristic Spatial Matcher]
                                                        - Label & sub-part alignment
                                                        - Cross-page continuation grouping
                                                        - Reading-order fallback
                                                                        │
                                                                        ▼
[Interactive Results UI] ◄─── [AI Evaluation Engine] ◄── [Matched Question-Answer Pairs]
- Canvas Bounding Box Sync
- Multi-Part Part Stepper
- Feedback & Criteria Checklists
```

1. **Extraction**: Documents are processed with strict JSON Schemas returning normalized `[x_min, y_min, x_max, y_max]` bounding boxes and 1-indexed page markers.
2. **Matching Engine**: Contiguous unlabeled text blocks and cross-page continuation blocks are intelligently grouped with their parent answers before executing multi-tier fuzzy and spatial matching against question numbers.
3. **Evaluation**: Matched pairs are evaluated in parallel to generate educational feedback and grading criteria without requiring a pre-supplied rubric.

---

## 🚀 Running Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/vidipt9090/Veda_AI_Assignment.git
   cd Veda_AI_Assignment
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env.local` file in the project root:
   ```env
   # Single key or comma-separated keys for automatic rotation:
   GEMINI_API_KEY="your_gemini_api_key_here"
   # or
   GEMINI_API_KEYS="key_1,key_2,key_3"
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment on Vercel

1. Push your repository to GitHub.
2. Import the project on [Vercel](https://vercel.com).
3. Under **Settings > Environment Variables**, add `GEMINI_API_KEY` (or `GEMINI_API_KEYS`).
4. Click **Deploy**.
