---
name: wrong-question-book
description: Use when the user wants to compile wrong/incorrect questions from exam papers into Word documents - triggers include Chinese phrases like "整理错题", "错题本", "错题整理", mentions of exam papers with specific question numbers to extract, or requests to generate Word docs from exam PDFs with selected questions and answers. Supports any subject (any discipline) and any exam type.
---

# Wrong Question Book Generator

Compile incorrectly-answered exam questions into two polished Word documents: one practice-only version (questions only) and one with full answers and explanations.

## Quick Reference

| User says | Meaning |
|-----------|---------|
| `整理错题 历史 2018卷:4,14,15` | Subject=历史, 2018 paper, extract Q4,14,15 |
| `/答案 2018:DABCC` | Answer key for 2018 questions in order |
| `/我的答案 2025:BDACAD` | User's answers (for comparison mode) |
| `/标准答案 2025:BDCCAD` | Standard answers (auto-detect wrong ones) |

## Input Protocol

Three input modes. Default to Mode 1 unless user provides answer strings.

### Mode 1: Direct Question Numbers
```
整理错题 <科目> <试卷标识>:<题号列表>
```
Example: `整理错题 高等数学 2024期末:3,7,12,15`

### Mode 2: Answer Comparison (auto-detect errors)
```
整理错题 <科目> <试卷标识>
/我的答案 <answer_string>
/标准答案 <answer_string>
```
Auto-compares and extracts only wrong answers.

### Mode 3: Mixed (multiple papers with answers)
```
整理错题 历史 2018卷:4,14,15,17,19,21,30 2020卷:7,10,11
/答案 2018:DABCCBD 2020:BCADCCABDA
```

## Workflow

```
User input → Find PDF in papers directory →
Extract text (pdfplumber or tesseract OCR for scans) →
Extract specific questions by number →
(Optional) Compare answers →
Generate question JSON →
Generate Word docs via docx skill's docx-js pattern
```

## Prerequisites

- `pdfplumber` for text-native PDFs
- `python-docx` for Word document input
- `pytesseract` + `pdf2image` for scanned PDFs (Chinese: `chi_sim.traineddata` in `~/.tessdata/`)
- `docx` npm package for Word generation
- Tesseract: Windows at `C:\Program Files\Tesseract-OCR\tesseract.exe`

## Supported Input Formats

PDF and DOCX files are both supported. The skill auto-detects format and extracts text accordingly.

## Implementation

### Step 1: Extract text from PDF

Use `ocr_extract.py` - handles both text-native and scanned PDFs automatically:
```bash
python ~/.claude/skills/wrong-question-book/ocr_extract.py <pdf_path>
```

### Step 2: Extract questions and build JSON

Use `generate.py`:
```bash
python ~/.claude/skills/wrong-question-book/generate.py \
  --subject <科目> --papers-dir <PDF目录> --output <输出目录> \
  "2018卷:4,14,15,17,19,21,30" "2020卷:7,10,11"
```

The script outputs `extracted_questions.json` with per-year question arrays.

### Step 3: Add explanations

For each question in the JSON, add:
```json
{
  "num": 4,
  "text": "完整题目文本...",
  "options": ["选项A", "选项B", "选项C", "选项D"],
  "answer": "D",
  "explanation": "解析内容：为什么选D，其他选项错在哪"
}
```

**Accuracy rule:** If the exam paper has an official answer key, use it. Otherwise, explain historically known answers. Never fabricate answers - mark uncertain ones as `"answer": "待核实"`.

### Step 4: Generate Word documents

Use `docx_generator.js`:
```bash
cd <output_dir> && node ~/.claude/skills/wrong-question-book/docx_generator.js \
  subject=<科目> input=extracted_questions.json
```

Generates two files:
- `错题-仅题目.docx` - practice version (questions only)
- `错题-题目加解析.docx` - with answers and explanations

## Subject Adaptation

The skill is subject-agnostic. Adapt explanation style per subject:

| Subject type | Explanation focus |
|-------------|-------------------|
| History/Politics | Timeline + cause-effect + context |
| Math/Physics | Formula derivation + solution steps |
| Chemistry/Bio | Mechanism + experiment + application |
| English/Language | Grammar + vocabulary + usage |
| CS/Engineering | Logic + algorithm + code |
| Others | Concept + principle + example |

**Key principle:** Subject metadata passes through from user input. Don't hardcode any subject assumptions.

## Common Mistakes

1. **Question 4 vs Instruction 4**: Exam papers have numbered instructions AND numbered questions. Check the text contains "（ ）" or actual exam content, not "考试结束后" or "答题卡".
2. **Scanned PDFs**: If pdfplumber returns empty, OCR is required. Check `extract_text_from_pdf()` return value's second element.
3. **Missing Chinese font**: Word docs use `Microsoft YaHei`. If unavailable, the docx skill defaults to Arial which won't display Chinese. Ensure font is installed.
4. **Answer indexing**: Answer strings map in ORDER to the questions list, NOT to question numbers. `2018:4,14,15` with answer `DAB` means Q4=D, Q14=A, Q15=B.

## Red Flags

- PDF returns garbled text: check if scanned (use OCR)
- 2025 paper not found: newer papers may use different naming
- "Unsupported Image": screenshots from PDF too large - reduce DPI or use text extraction
- tesseract Chinese not working: check `~/.tessdata/chi_sim.traineddata` exists
