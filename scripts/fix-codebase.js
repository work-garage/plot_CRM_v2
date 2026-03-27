#!/usr/bin/env node
/**
 * Automated Codebase Fix Script
 * Systematically fixes type safety and error handling issues
 */

const fs = require('fs');
const path = require('path');

const fixes = {
  // Remove 'as any' from getScopeContext calls
  removeScopeContextCasts: {
    pattern: /await getScopeContext\(supabase as any\)/g,
    replacement: 'await getScopeContext(supabase)',
    files: [
      'app/actions/advisors.ts',
      'app/actions/commissions.ts',
      'app/actions/customer-documents.ts',
      'app/actions/messaging-directory.ts',
      'app/actions/project-actions.ts',
      'app/actions/payments.ts',
      'app/actions/receipts.ts',
      'app/actions/reminders.ts',
      'app/actions/plots.ts',
      'app/actions/reports.ts',
      'app/actions/customers.ts',
      'app/actions/enquiries.ts',
      'app/actions/expenses.ts',
      'app/actions/emi.ts',
      'app/actions/self-profile.ts',
      'app/actions/settings.ts'
    ]
  },

  // Fix array type annotations
  fixArrayTypes: {
    pattern: /\(row: any\)/g,
    replacement: '(row)',
    files: ['app/actions/commissions.ts', 'app/actions/payments.ts']
  },

  // Fix form resolver casts
  fixFormResolvers: {
    pattern: /zodResolver\((.*?)\) as any/g,
    replacement: 'zodResolver($1)',
    files: [
      'components/payments/payment-form.tsx',
      'components/projects/project-form.tsx'
    ]
  }
};

function applyFixes() {
  let totalFixes = 0;
  
  Object.entries(fixes).forEach(([fixName, config]) => {
    console.log(`\nApplying fix: ${fixName}`);
    
    config.files.forEach(filePath => {
      const fullPath = path.join(__dirname, '..', filePath);
      
      if (!fs.existsSync(fullPath)) {
        console.log(`  ⚠️  File not found: ${filePath}`);
        return;
      }
      
      let content = fs.readFileSync(fullPath, 'utf8');
      const originalContent = content;
      
      content = content.replace(config.pattern, config.replacement);
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        const count = (originalContent.match(config.pattern) || []).length;
        console.log(`  ✓ Fixed ${count} occurrence(s) in ${filePath}`);
        totalFixes += count;
      }
    });
  });
  
  console.log(`\n✅ Total fixes applied: ${totalFixes}`);
}

if (require.main === module) {
  console.log('Starting automated codebase fixes...\n');
  applyFixes();
  console.log('\nDone! Please run "npm run build" to verify.');
}

module.exports = { applyFixes };
