import { execSync } from 'child_process';

async function validate() {
  console.log('====================================================');
  console.log('🚀 STARTING PILOT LAUNCH READINESS VALIDATION');
  console.log('====================================================\n');

  const commands = [
    { name: 'Tenant Readiness', cmd: 'npm run tenant:readiness' },
    { name: 'Freight Readiness', cmd: 'npm run freight:readiness' },
    { name: 'WhatsApp Readiness', cmd: 'npm run whatsapp:readiness' },
    { name: 'Billing Readiness', cmd: 'npm run billing:readiness' },
    { name: 'Tracking Readiness', cmd: 'npm run tracking:readiness' },
    { name: 'Cockpit Smoke', cmd: 'npm run cockpit:smoke' }
  ];

  let hasErrors = false;

  for (const step of commands) {
    console.log(`\n--- Running: ${step.name} ---`);
    try {
      execSync(step.cmd, { stdio: 'inherit' });
      console.log(`✅ ${step.name}: PASS`);
    } catch (error: any) {
      console.error(`❌ ${step.name}: FAILED`);
      hasErrors = true;
    }
  }

  console.log('\n====================================================');
  if (hasErrors) {
    console.error('❌ PILOT LAUNCH READINESS: FAILED (Check logs above)');
    process.exit(1);
  } else {
    console.log('🌟 PILOT LAUNCH READINESS: ALL SYSTEMS GO!');
    process.exit(0);
  }
}

validate();
