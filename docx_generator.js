/** Wrong Question Book - Word Document Generator
 *
 * Generates two Word docs:
 * 1. Questions only (for self-testing)
 * 2. Questions with answers and explanations
 *
 * Uses the docx npm package. Install: npm install docx
 *
 * Usage:
 *   node docx_generator.js subject="历史" input=questions.json output=./output
 */
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
        Header, Footer, PageNumber } = require('docx');

// Parse CLI args
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [k, v] = arg.split('=');
  acc[k] = v;
  return acc;
}, {});

const subject = args['subject'] || '默认科目';
const inputFile = args['input'] || 'extracted_questions.json';
const outputDir = args['output'] || '.';

const questions = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

// Cycle through 8 distinct soft colors for year sections
const YEAR_COLORS = [
  "E3F2FD", "FCE4EC", "E8F5E9", "FFF8E1",
  "F3E5F5", "E0F7FA", "FFF3E0", "E8EAF6"
];

function questionOnlySection(year, qs, colorIndex) {
  const color = YEAR_COLORS[colorIndex % YEAR_COLORS.length];
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 300, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "2E75B6", space: 4 } },
    children: [new TextRun({ text: `${year}年 ${subject} 错题`, bold: true, size: 32, font: "Microsoft YaHei", color: "2E75B6" })]
  }));

  for (const q of qs) {
    const optionStr = (q.options || []).map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("    ");

    children.push(new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [700, 8326],
      rows: [new TableRow({
        children: [
          new TableCell({
            borders, margins: cellMargins,
            width: { size: 700, type: WidthType.DXA },
            shading: { fill: color, type: ShadingType.CLEAR },
            verticalAlign: "center",
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Q${q.num}`, bold: true, size: 20, font: "Microsoft YaHei" })] })]
          }),
          new TableCell({
            borders, margins: cellMargins,
            width: { size: 8326, type: WidthType.DXA },
            children: [
              new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: q.text, size: 21, font: "Microsoft YaHei" })] }),
              new Paragraph({ children: [new TextRun({ text: optionStr, size: 20, font: "Microsoft YaHei", color: "555555" })] })
            ]
          })
        ]
      })]
    }));
    children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
  }
  return children;
}

function questionWithAnswerSection(year, qs, colorIndex) {
  const color = YEAR_COLORS[colorIndex % YEAR_COLORS.length];
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 300, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "2E75B6", space: 4 } },
    children: [new TextRun({ text: `${year}年 ${subject} 错题（含解析）`, bold: true, size: 32, font: "Microsoft YaHei", color: "2E75B6" })]
  }));

  for (const q of qs) {
    const optionStr = (q.options || []).map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("    ");
    const answerLetter = q.correct_answer || q.answer || '?';
    const answerIndex = answerLetter.charCodeAt(0) - 65;
    const answerText = (q.options && answerIndex >= 0 && answerIndex < q.options.length)
      ? `${answerLetter}. ${q.options[answerIndex]}`
      : answerLetter;

    children.push(new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: [700, 8326],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders, margins: cellMargins,
              width: { size: 700, type: WidthType.DXA },
              shading: { fill: color, type: ShadingType.CLEAR },
              verticalAlign: "center",
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Q${q.num}`, bold: true, size: 20, font: "Microsoft YaHei" })] })]
            }),
            new TableCell({
              borders, margins: cellMargins,
              width: { size: 8326, type: WidthType.DXA },
              children: [
                new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: q.text, size: 21, font: "Microsoft YaHei" })] }),
                new Paragraph({ children: [new TextRun({ text: optionStr, size: 20, font: "Microsoft YaHei", color: "555555" })] })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              borders, margins: cellMargins,
              width: { size: 700, type: WidthType.DXA },
              shading: { fill: "E8F5E9", type: ShadingType.CLEAR },
              verticalAlign: "center",
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "答案", bold: true, size: 18, font: "Microsoft YaHei", color: "2E7D32" })] })]
            }),
            new TableCell({
              borders, margins: cellMargins,
              width: { size: 8326, type: WidthType.DXA },
              shading: { fill: "FAFAFA", type: ShadingType.CLEAR },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: answerText, bold: true, size: 20, font: "Microsoft YaHei", color: "C62828" })]
                }),
                q.explanation ? new Paragraph({
                  spacing: { before: 40 },
                  children: [new TextRun({ text: `解析：${q.explanation}`, size: 19, font: "Microsoft YaHei", color: "666666", italics: true })]
                }) : null
              ].filter(Boolean)
            })
          ]
        })
      ]
    }));
    children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
  }
  return children;
}

async function main() {
  const years = Object.keys(questions).sort();

  // Doc 1: Questions only
  const qOnlyChildren = [
    new Paragraph({
      heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `${subject} 错题集`, bold: true, size: 44, font: "Microsoft YaHei", color: "1A237E" })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: `历年错题汇总 · 练习版`, size: 24, font: "Microsoft YaHei", color: "999999" })]
    })
  ];

  // Doc 2: With answers
  const qAnswerChildren = [
    new Paragraph({
      heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `${subject} 错题集（含解析）`, bold: true, size: 44, font: "Microsoft YaHei", color: "1A237E" })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: `历年错题汇总 · 答案与解析`, size: 24, font: "Microsoft YaHei", color: "999999" })]
    })
  ];

  let colorIdx = 0;
  for (const year of years) {
    qOnlyChildren.push(...questionOnlySection(year, questions[year], colorIdx));
    qAnswerChildren.push(...questionWithAnswerSection(year, questions[year], colorIdx));
    colorIdx++;
  }

  const pageProps = {
    page: {
      size: { width: 11906, height: 16838 }, // A4
      margin: { top: 1200, right: 1440, bottom: 1200, left: 1440 }
    }
  };

  const header = (label) => new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: `${subject} 错题集 · ${label}`, size: 16, font: "Microsoft YaHei", color: "999999", italics: true })]
    })]
  });

  const footer = () => new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "第 ", size: 16 }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
        new TextRun({ text: " 页", size: 16 })
      ]
    })]
  });

  const doc1 = new Document({
    styles: { default: { document: { run: { font: "Microsoft YaHei", size: 21 } } } },
    sections: [{
      properties: pageProps,
      headers: { default: header("练习版") },
      footers: { default: footer() },
      children: qOnlyChildren
    }]
  });

  const doc2 = new Document({
    styles: { default: { document: { run: { font: "Microsoft YaHei", size: 21 } } } },
    sections: [{
      properties: pageProps,
      headers: { default: header("解析版") },
      footers: { default: footer() },
      children: qAnswerChildren
    }]
  });

  const outDir = path.resolve(outputDir);
  const p1 = path.join(outDir, `错题-仅题目.docx`);
  const p2 = path.join(outDir, `错题-题目加解析.docx`);

  await Promise.all([
    Packer.toBuffer(doc1).then(b => fs.writeFileSync(p1, b)),
    Packer.toBuffer(doc2).then(b => fs.writeFileSync(p2, b))
  ]);

  console.log(`Generated:`);
  console.log(`  ${p1}`);
  console.log(`  ${p2}`);
}

main().catch(e => { console.error(e); process.exit(1); });
