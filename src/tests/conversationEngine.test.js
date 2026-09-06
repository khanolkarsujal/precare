import { detectCategory, getNextQuestion, isFieldCollected, isHistoryComplete } from '../services/questionEngine.js';
import { aiService } from '../services/aiService.js';
import { COMPLAINT_CATEGORIES } from '../data/questionFlows.js';

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
  console.log('=== STARTING PRECARE AI CONVERSATION ENGINE TESTS ===\n');

  // TEST 1: User's Primary Scenario
  // Name: Rahul, Age: 25, Complaint: "My stomach has been hurting for three days."
  console.log('--- TEST 1: Primary Abdominal Pain Scenario (Rahul) ---');
  const complaint = 'My stomach has been hurting for three days.';

  // Step 1: Analyze initial complaint
  const initialHistory = await aiService.analyzeInitialComplaint(complaint);
  assert(initialHistory.category === COMPLAINT_CATEGORIES.ABDOMINAL_PAIN, 'Recognizes abdominal pain category');
  assert(initialHistory.duration === '3 days', 'Extracts inline duration ("3 days") without needing to ask');

  // Step 2: First question should NOT be duration (since duration is already known!)
  const q1 = await aiService.getNextQuestion(initialHistory, 0);
  assert(!q1.isComplete, 'Session is not complete at start');
  assert(q1.targetField !== 'duration', `Does NOT ask duration because it was already extracted (target is ${q1.targetField})`);
  assert(q1.targetField === 'location', 'Asks for pain location first');

  // Step 3: Patient replies "Upper stomach"
  const step1 = await aiService.processAnswer('Upper stomach', q1.targetField, initialHistory);
  assert(step1.updatedHistory.location === 'Upper stomach', 'Extracts location as "Upper stomach"');

  // Step 4: Next question should ask severity or other missing field, NOT location or duration
  const q2 = await aiService.getNextQuestion(step1.updatedHistory, 1);
  assert(q2.targetField === 'severity', `Next question asks severity (target is ${q2.targetField})`);

  // Step 5: Patient replies "6"
  const step2 = await aiService.processAnswer('6', q2.targetField, step1.updatedHistory);
  assert(step2.updatedHistory.severity === '6/10', 'Formats numeric severity into 6/10');

  // Step 6: Next question should ask vomiting/nausea
  const q3 = await aiService.getNextQuestion(step2.updatedHistory, 2);
  assert(q3.targetField === 'vomiting_nausea', `Next asks vomiting/nausea (target is ${q3.targetField})`);

  // Step 7: Patient replies "No"
  const step3 = await aiService.processAnswer('No', q3.targetField, step2.updatedHistory);
  assert(step3.updatedHistory.associated_symptoms.vomiting_nausea === 'Denied (No)', 'Normalizes "No" to Denied (No)');

  // Step 8: Patient replies "I don't know" to food relation
  const q4 = await aiService.getNextQuestion(step3.updatedHistory, 3);
  const step4 = await aiService.processAnswer("I don't know", q4.targetField, step3.updatedHistory);
  assert(step4.updatedHistory.associated_symptoms.bowel_changes.includes('Uncertain'), 'Accepts "I don\'t know" without crashing or looping');

  // Step 9: Follow-up fever: "No"
  const q5 = await aiService.getNextQuestion(step4.updatedHistory, 4);
  assert(q5.targetField === 'fever', `Next asks about fever (target is ${q5.targetField})`);
  const step5 = await aiService.processAnswer('No', q5.targetField, step4.updatedHistory);
  assert(step5.updatedHistory.associated_symptoms.fever === 'Denied (No)', 'Records fever as Denied (No)');

  // Step 10: Follow-up past medical history: "None"
  const q6 = await aiService.getNextQuestion(step5.updatedHistory, 5);
  assert(q6.targetField === 'medical_history', `Next asks medical history (target is ${q6.targetField})`);
  const step6 = await aiService.processAnswer('None', q6.targetField, step5.updatedHistory);
  assert(step6.updatedHistory.medical_history.includes('Denied'), 'Records medical history as Denied (No/None)');

  // Step 11: Verify completion condition reached
  const finalCheck = await aiService.getNextQuestion(step6.updatedHistory, 6);
  assert(finalCheck.isComplete === true, 'Engine successfully reaches "History Complete" state');

  // TEST 2: Very short answers & empty checks
  console.log('\n--- TEST 2: Short, Negation, & Empty Answers ---');
  const shortAnswer = await aiService.processAnswer('7', 'severity', step5.updatedHistory);
  assert(shortAnswer.updatedHistory.severity === '7/10', 'Handles single-character severity "7"');

  const negAnswer = await aiService.processAnswer('nope', 'fever', step5.updatedHistory);
  assert(negAnswer.updatedHistory.associated_symptoms.fever === 'Denied (No)', 'Normalizes "nope" to Denied');

  // TEST 3: Unknown / Uncategorized Complaint Fallback
  console.log('\n--- TEST 3: General / Fallback Complaint ---');
  const unknownComplaint = 'I have a strange tingling sensation in my left foot';
  const generalHistory = await aiService.analyzeInitialComplaint(unknownComplaint);
  assert(generalHistory.category === COMPLAINT_CATEGORIES.GENERAL, 'Falls back to General category for unlisted complaints');

  const genQ1 = await aiService.getNextQuestion(generalHistory, 0);
  assert(genQ1.targetField === 'duration', 'General category systematically asks for duration first');

  // TEST 4: Clinical Safety & Urgent Flagging
  console.log('\n--- TEST 4: Urgent Red-Flag Screening ---');
  const urgentHistory = await aiService.analyzeInitialComplaint('Severe chest pressure radiating to left arm and sweating');
  assert(urgentHistory.is_urgent === true, 'Flags potential cardiac red flag internally');
  assert(urgentHistory.urgent_reason.includes('chest pressure'), 'Records clear clinician note for urgency');

  console.log(`\n=== RESULTS: ${passedTests} OF ${totalTests} TESTS PASSED ===\n`);
  if (passedTests === totalTests) {
    console.log('ALL TESTS PASSED SUCCESSFULLY! 🎉');
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
