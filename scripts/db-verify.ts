import { execSync } from 'child_process';

console.log('=> Starting Schema Drift Verification...');

try {
    // Generate migrations based on current schema.ts
    execSync('npx drizzle-kit generate', { encoding: 'utf-8', stdio: 'inherit' });

    // Check if any tracked or untracked files were modified/created in the drizzle folder
    const gitStatus = execSync('git status --porcelain drizzle/', { encoding: 'utf-8' }).trim();

    if (gitStatus.length > 0) {
        console.error('\n❌ SCHEMA DRIFT DETECTED!');
        console.error('Your "src/drizzle/schema.ts" contains changes that are not reflected in a committed migration file.');
        console.error('The following changes were generated dynamically:\n');
        console.error(gitStatus);
        console.error('\nTo fix this: Run "npm run db:generate" locally, and commit the newly generated files in drizzle/.');
        process.exit(1);
    }

    console.log('\n✅ Schema is perfectly aligned with committed migrations [No drift].');
    process.exit(0);
} catch (error: any) {
    console.error('Verification script failed catastrophically:', error.message);
    process.exit(1);
}
