import fs from 'fs';
import path from 'path';

const ACTIONS_DIR = path.resolve(process.cwd(), 'app/actions');
const FINANCIAL_FILES = ['sales.ts', 'payments.ts', 'commissions.ts', 'reports.ts', 'project-actions.ts', 'advisors.ts'];

async function runAudit() {
  console.log("🔍 Starting Modular CRM Security Audit...");
  let issuesFound = 0;

  for (const file of FINANCIAL_FILES) {
    const filePath = path.join(ACTIONS_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Warning: ${file} not found.`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`\n📄 Auditing ${file}...`);

    // Check for "advisor" role handling but no .or() filter for Source OR Assigned
    // This is a heuristic check: if we see role === 'advisor' or advisorId, 
    // we should see an .or() or explicit source_advisor_id check.
    
    const advisorHandlingFound = content.includes("'advisor'") || content.includes('"advisor"') || content.includes('advisorId');
    const orFilterFound = content.includes('.or(') || content.includes('source_advisor_id');

    if (advisorHandlingFound && !orFilterFound) {
      console.error(`❌ Security Gap: ${file} handles advisor role but lacks "Source OR Assigned" (.or) filtering.`);
      issuesFound++;
    } else if (advisorHandlingFound && orFilterFound) {
      console.log(`✅ ${file} passed basic advisor isolation check.`);
    } else {
      console.log(`ℹ️ ${file} does not appear to have advisor-specific filtering (likely Admin only).`);
    }

    // Check for "Interested Plan" legacy strings
    if (content.toLowerCase().includes('interestedplan') || content.toLowerCase().includes('interested_plan')) {
      console.error(`❌ Legacy Code: ${file} still contains "Interested Plan" references.`);
      issuesFound++;
    }
  }

  // Audit Lead Status Labels
  const MODALS_DIR = path.resolve(process.cwd(), 'components/enquiries');
  const modalFiles = fs.readdirSync(MODALS_DIR).filter(f => f.endsWith('.tsx'));
  
  for (const file of modalFiles) {
    const filePath = path.join(MODALS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('Closed Won') && !content.includes('🎉 Closed Won')) {
        // This might be a false positive if it's just a variable name, but good to check
        if (content.match(/"Closed Won"|'Closed Won'/)) {
             console.log(`ℹ️ Auditing labels in ${file}...`);
             // We already fixed some, but checking for others
        }
    }
  }

  console.log("\n-------------------------------------------");
  if (issuesFound === 0) {
    console.log("🟢 Audit Completed: No critical gaps found.");
  } else {
    console.log(`🔴 Audit Completed: ${issuesFound} potential issues identified.`);
  }
}

runAudit();
