"""OCR and text extraction for exam papers. Handles both text-native and scanned PDFs."""
import sys, os, json, re
from pathlib import Path

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF - tries pdfplumber first, falls back to OCR."""
    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            text_parts = []
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
            full = '\n'.join(text_parts)
            if len(full.strip()) > 100:
                return full, 'text'
    except Exception:
        pass
    return ocr_pdf(pdf_path), 'ocr'

def ocr_pdf(pdf_path):
    """OCR a scanned PDF using tesseract with Chinese support."""
    from pdf2image import convert_from_path
    import pytesseract

    tessdata = os.path.expanduser('~/.tessdata')
    if os.path.exists(os.path.join(tessdata, 'chi_sim.traineddata')):
        os.environ['TESSDATA_PREFIX'] = tessdata

    tesseract_paths = [
        r'C:\Program Files\Tesseract-OCR\tesseract.exe',
        r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe'
    ]
    for tp in tesseract_paths:
        if os.path.exists(tp):
            pytesseract.pytesseract.tesseract_cmd = tp
            break

    images = convert_from_path(pdf_path, dpi=200)
    text_parts = []
    for img in images:
        text = pytesseract.image_to_string(img, lang='chi_sim+eng')
        text_parts.append(text)
    return '\n'.join(text_parts)

def extract_questions(full_text, question_numbers, year_label=''):
    """Extract specific numbered questions from exam text.
    Returns list of {num, text} dicts."""
    results = []

    for qnum in question_numbers:
        # Find question number in text
        patterns = [
            rf'(?:^|\n)\s*{qnum}[.．]\s*(.+?)(?=\n\s*\d{{1,2}}[.．]\s|\n\s*第[二三四五六七八九十]|\Z)',
            rf'(?:^|\n)\s*{qnum}\s{{2,}}(.+?)(?=\n\s*\d{{1,2}}[.．]\s|\n\s*第[二三四五六七八九十]|\Z)',
        ]

        best = None
        for pat in patterns:
            matches = list(re.finditer(pat, full_text, re.DOTALL))
            for m in matches:
                candidate = m.group(1).strip()
                # Filter out exam instructions
                if any(kw in candidate[:100] for kw in
                       ['答题卡', '条形码', '签字笔', '钢笔', '考试结束', '2B铅笔',
                        '第一部分', '下列各题', '四个选项']):
                    continue
                best = candidate
                break
            if best:
                break

        if best:
            best = re.sub(r'\s+', ' ', best)
            best = re.sub(r'--- Page \d+ ---', '', best)
            results.append({'num': qnum, 'text': best.strip()})

    return results

def extract_options(question_text):
    """Parse options from question text. Returns (question_body, options_list)."""
    # Match A．xxx B．xxx ... or A. xxx B. xxx ...
    opt_match = re.search(r'([A-D])[.．]\s*(.+?)(?=\s*[A-D][.．]\s|\s*$)', question_text)
    if not opt_match:
        return question_text, []

    # Parse all options
    options = []
    body_end = len(question_text)
    for m in re.finditer(r'([A-D])[.．]\s*(.+?)(?=\s*[A-D][.．]\s|\s*$)', question_text):
        opt_text = m.group(2).strip()
        # Clean trailing markers
        opt_text = re.sub(r'\s*[第第][一二三四五六七八九十]+部分.*$', '', opt_text)
        options.append(opt_text)
        if m.start() < body_end:
            body_end = m.start()

    body = question_text[:body_end].strip()
    body = re.sub(r'\s*[（(]\s*[）)]\s*$', '（ ）', body)
    return body, options

if __name__ == '__main__':
    # Quick test
    if len(sys.argv) > 1:
        text, method = extract_text_from_pdf(sys.argv[1])
        print(f'Extracted via {method}, {len(text)} chars')
        print(text[:500])
