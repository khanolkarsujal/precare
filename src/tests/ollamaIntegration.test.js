import { checkOllamaStatus, analyzeComplaintWithOllama, extractAnswerWithOllama } from '../../server/ollamaHandler.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`✗ FAIL: ${message}`);
  }
}

async function runTests() {
  console.log('=== STARTING OLLAMA qwen3:8b INTEGRATION TESTS ===\n');

  // 1. Status Check Test
  console.log('--- TEST 1: Ollama Server & qwen3:8b Status Check ---');
  const status = await checkOllamaStatus();
  assert(status.ok === true, 'Ollama server is reachable and active');
  assert(status.model === 'qwen3:8b', 'Target model is confirmed as qwen3:8b');

  // 2. Initial Complaint Analysis via qwen3:8b
  console.log('\n--- TEST 2: Initial Complaint Analysis with qwen3:8b ---');
  const complaint = 'My stomach has been hurting for three days.';
  const analysis = await analyzeComplaintWithOllama(complaint);
  console.log('   Ollama extracted:', JSON.stringify(analysis));
  assert(analysis.category === 'abdominal_pain', 'qwen3:8b recognized category as abdominal_pain');
  assert(Boolean(analysis.duration), 'qwen3:8b extracted inline duration ("three days")');

  // 3. Answer Extraction via qwen3:8b
  console.log('\n--- TEST 3: Clinical Answer Extraction with qwen3:8b ---');
  const answerResult = await extractAnswerWithOllama({
    patientAnswer: 'Upper stomach right under my ribs',
    targetField: 'location',
    currentHistory: { chief_complaint: complaint, duration: 'three days' },
  });
  console.log('   Ollama extracted:', JSON.stringify(answerResult));
  assert(Boolean(answerResult.extracted_value), 'qwen3:8b extracted location value');
  assert(Boolean(answerResult.acknowledgement), 'qwen3:8b provided an empathetic acknowledgement');

  // 4. Verification of Endpoint via Vite Backend Middleware
  console.log('\n--- TEST 4: Verification of /api/ollama/status via Vite Server ---');
  try {
    const res = await fetch('http://localhost:5173/api/ollama/status');
    const data = await res.json();
    assert(res.status === 200, 'Endpoint /api/ollama/status returns HTTP 200');
    assert(data.ok === true && data.model === 'qwen3:8b', 'Endpoint confirms model is qwen3:8b');
  } catch (err) {
    assert(false, `Vite middleware test failed: ${err.message}`);
  }

  console.log(`\n=== RESULTS: ${passedTests} OF ${totalTests} TESTS PASSED ===\n`);
  if (passedTests === totalTests) {
    console.log('ALL OLLAMA INTEGRATION TESTS PASSED! 🎉');
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
