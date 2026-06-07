"""Wrong Question Book Generator - Main orchestrator.

Usage:
  python generate.py --subject 历史 --papers-dir D:/错题 \\
    "2018卷:4,14,15,17,19,21,30" \\
    "2025卷:2,8,9,11,13,17" \\
    --answers "2018:DABCCBD" \\
    --output D:/错题/output

  python generate.py --subject 历史 --papers-dir D:/错题 \\
    "2025卷:2,8,9,11,13,17" \\
    --answers "2025:BDACAD" \\
    --answers-by-letter "2025:B D A C A D"

Answers format:
  --answers "2018:DABCCBD, 2025:BDACAD"
  Each answer string maps to the question list in order for that year.
"""
import sys, os, json, re, argparse
from pathlib import Path

SKILL_DIR = Path(__file__).parent
sys.path.insert(0, str(SKILL_DIR))

from ocr_extract import extract_text_from_pdf, extract_questions, extract_options

def find_pdf(papers_dir, year):
    """Find PDF file for a given year in papers_dir."""
    papers_dir = Path(papers_dir)
    for f in papers_dir.glob(f"*{year}*.pdf"):
        return str(f)
    return None

def parse_question_spec(spec):
    """Parse '2018卷:4,14,15,17,19,21,30' into (year, [nums])."""
    match = re.match(r'(\d{4})\D*:?\s*(.+)', spec)
    if not match:
        raise ValueError(f'Cannot parse question spec: {spec}')
    year = match.group(1)
    nums = [int(n.strip()) for n in match.group(2).split(',')]
    return year, nums

def parse_answers(answer_str):
    """Parse '2018:DABCCBD, 2025:BDACAD' into {year: [answer_letters]}."""
    result = {}
    for part in answer_str.split(','):
        part = part.strip()
        if ':' in part:
            year, letters = part.split(':', 1)
            result[year.strip()] = list(letters.strip().upper())
    return result

def compare_answers(questions, answer_letters):
    """Compare extracted questions against answer key. Returns (wrong_qs, match_info)."""
    wrong = []
    for q in questions:
        qnum = q['num']
        options = q.get('options', [])
        if not options:
            continue
        # Find correct answer for this question
        idx = None
        for i, other in enumerate(questions):
            if other['num'] == qnum:
                idx = i
                break
        if idx is not None and idx < len(answer_letters):
            correct = answer_letters[idx]
            q['correct_answer'] = correct
            q['user_answer'] = None  # Not provided in this mode
    return questions

def main():
    parser = argparse.ArgumentParser(description='Wrong Question Book Generator')
    parser.add_argument('--subject', required=True, help='Subject name (e.g., 历史, 数学)')
    parser.add_argument('--papers-dir', required=True, help='Directory containing exam PDFs')
    parser.add_argument('--output', default='.', help='Output directory')
    parser.add_argument('--answers', default='', help='Answer key: "YEAR:LETTERS, YEAR:LETTERS"')
    parser.add_argument('specs', nargs='+', help='Question specs: "YEAR卷:NUM,NUM,..."')

    args = parser.parse_args()

    all_questions = {}
    answers_map = parse_answers(args.answers) if args.answers else {}

    for spec in args.specs:
        year, nums = parse_question_spec(spec)
        print(f'Processing {year}: Q{nums}')

        pdf_path = find_pdf(args.papers_dir, year)
        if not pdf_path:
            print(f'  WARNING: No PDF found for {year}')
            continue

        full_text, method = extract_text_from_pdf(pdf_path)
        print(f'  PDF extracted via {method} ({len(full_text)} chars)')

        questions = extract_questions(full_text, nums, year)
        for q in questions:
            body, options = extract_options(q['text'])
            q['text'] = body
            q['options'] = options

        # Apply answers if provided
        if year in answers_map:
            questions = compare_answers(questions, answers_map[year])

        all_questions[year] = questions
        print(f'  Extracted {len(questions)}/{len(nums)} questions')

    # Save intermediate JSON
    output_dir = Path(args.output)
    output_dir.mkdir(exist_ok=True, parents=True)
    json_path = output_dir / 'extracted_questions.json'
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)
    print(f'\nSaved: {json_path}')
    return json_path

if __name__ == '__main__':
    main()
