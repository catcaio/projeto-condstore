import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
console.log('type of pdfParse:', typeof pdfParse, 'keys:', Object.keys(pdfParse || {}));

async function parseMovviXlsx() {
  const filePath = 'C:/Users/cr_bn/Downloads/TABELA DE PREC\u0327OS - movvi.xlsx'; // the trailing zero width space or combined characters might be tricky, let's just use readdir
  // Let's resolve the actual file name
  const dir = 'C:/Users/cr_bn/Downloads';
  const files = fs.readdirSync(dir);
  const movviXlsxFile = files.find((f: any) => f.toLowerCase().includes('movvi.xlsx') && !f.startsWith('~'));

  if (!movviXlsxFile) {
    console.log('Movvi XLSX not found');
    return;
  }

  console.log(`\n\n--- PARSING ${movviXlsxFile} ---`);
  const workbook = xlsx.readFile(path.join(dir, movviXlsxFile));

  for (const sheetName of workbook.SheetNames) {
    console.log(`\nSheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    // Print first 30 rows
    for (let i = 0; i < Math.min(30, json.length); i++) {
      console.log(JSON.stringify(json[i]));
    }
  }
}

async function parseBraspressPdf() {
  const dir = 'C:/Users/cr_bn/Downloads';
  const files = fs.readdirSync(dir);
  const pdfFile = files.find((f: any) => f.toLowerCase().includes('braspress') && f.endsWith('.pdf'));

  if (!pdfFile) {
    console.log('Braspress PDF not found');
    return;
  }

  console.log(`\n\n--- PARSING ${pdfFile} ---`);
  const dataBuffer = fs.readFileSync(path.join(dir, pdfFile));
  const data = await pdfParse(dataBuffer);
  console.log(data.text.substring(0, 2000)); // First 2000 chars
}

async function parseMenguePdf() {
  const dir = 'C:/Users/cr_bn/Downloads';
  const files = fs.readdirSync(dir);
  const pdfFile = files.find((f: any) => f.toLowerCase().includes('mengue') && f.endsWith('.pdf'));

  if (!pdfFile) {
    console.log('Mengue PDF not found');
    return;
  }

  console.log(`\n\n--- PARSING ${pdfFile} ---`);
  const dataBuffer = fs.readFileSync(path.join(dir, pdfFile));
  const data = await pdfParse(dataBuffer);
  console.log(data.text.substring(0, 2000)); // First 2000 chars
}

async function parseMovviPdf() {
  const dir = 'C:/Users/cr_bn/Downloads';
  const files = fs.readdirSync(dir);
  const pdfFile = files.find((f: any) => f.toLowerCase().includes('movvi') && f.endsWith('.pdf'));

  if (!pdfFile) {
    console.log('Movvi PDF not found');
    return;
  }

  console.log(`\n\n--- PARSING ${pdfFile} ---`);
  const dataBuffer = fs.readFileSync(path.join(dir, pdfFile));
  const data = await pdfParse(dataBuffer);
  console.log(data.text.substring(0, 2000)); // First 2000 chars
}

async function main() {
  await parseMovviXlsx();
  await parseBraspressPdf();
  await parseMenguePdf();
  await parseMovviPdf();
}

main().catch(console.error);
