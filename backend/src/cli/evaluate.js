/**
 * Mandatory Batch Entry Point (Section 9)
 * Usage: npm run evaluate -- --input <cases.json> --output <kits.json>
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { generateKit } = require('../services/pipeline');

function parseArgs() {
  const args = process.argv.slice(2);
  let inputPath = null;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--input' && i + 1 < args.length) {
      inputPath = args[i + 1];
      i++;
    } else if (arg.startsWith('--input=')) {
      inputPath = arg.split('=')[1];
    } else if (arg === '--output' && i + 1 < args.length) {
      outputPath = args[i + 1];
      i++;
    } else if (arg.startsWith('--output=')) {
      outputPath = arg.split('=')[1];
    } else if (!arg.startsWith('-')) {
      if (!inputPath) inputPath = arg;
      else if (!outputPath) outputPath = arg;
    }
  }

  if (!inputPath || !outputPath) {
    console.error('Usage: npm run evaluate -- --input <cases.json> --output <kits.json>');
    process.exit(1);
  }

  return {
    inputPath: path.resolve(process.cwd(), inputPath),
    outputPath: path.resolve(process.cwd(), outputPath)
  };
}

async function runEvaluationBatch() {
  const { inputPath, outputPath } = parseArgs();

  console.log(`[Batch Evaluate] Reading input file: ${inputPath}`);

  if (!fs.existsSync(inputPath)) {
    console.error(`[Batch Evaluate Error] Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(inputPath, 'utf-8');
  let cases = [];
  try {
    cases = JSON.parse(rawData);
    if (!Array.isArray(cases)) {
      throw new Error('Input file must contain a JSON array of cases.');
    }
  } catch (err) {
    console.error(`[Batch Evaluate Error] Invalid JSON input: ${err.message}`);
    process.exit(1);
  }

  console.log(`[Batch Evaluate] Found ${cases.length} cases to process.`);

  const kitsOutput = [];
  const generatedAt = new Date().toISOString();

  for (let i = 0; i < cases.length; i++) {
    const item = cases[i];
    const caseId = item.id || `case-${i + 1}`;
    console.log(`\n--------------------------------------------------`);
    console.log(`[Batch Evaluate ${i + 1}/${cases.length}] Processing case: ${caseId}`);
    console.log(`Company URL: ${item.company_url || 'N/A'}, Days: ${item.days || 5}`);

    try {
      const kit = await generateKit({
        jd: item.jd || '',
        company_url: item.company_url || '',
        days: item.days || 5,
        allowLocal: true
      });

      kitsOutput.push({
        id: caseId,
        status: 'ok',
        kit: kit,
        error: null
      });

      console.log(`[Batch Evaluate ${caseId}] Success: Kit generated matching Appendix A schema.`);
    } catch (err) {
      console.error(`[Batch Evaluate ${caseId}] Failed: ${err.message}`);

      kitsOutput.push({
        id: caseId,
        status: 'failed',
        kit: null,
        error: {
          code: 'GENERATION_ERROR',
          message: err.message || 'Failed to generate kit for case.'
        }
      });
    }
  }

  const resultJSON = {
    version: '1.0',
    generated_at: generatedAt,
    kits: kitsOutput
  };

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(resultJSON, null, 2), 'utf-8');
  console.log(`\n==================================================`);
  console.log(`[Batch Evaluate Complete] Written output to: ${outputPath}`);
  console.log(`Processed: ${kitsOutput.length} cases. OK: ${kitsOutput.filter(k => k.status === 'ok').length}, Failed: ${kitsOutput.filter(k => k.status === 'failed').length}`);
}

if (require.main === module) {
  runEvaluationBatch().catch(err => {
    console.error('[Fatal Batch Error]', err);
    process.exit(1);
  });
}

module.exports = { runEvaluationBatch };
