import { execSync } from 'child_process';

console.log('=> Starting Schema Drift Verification...');

// Ensure drizzle-kit doesn't crash if DATABASE_URL is not set in CI
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'mysql://user:pass@127.0.0.1:3306/placeholder';
    console.log('=> DATABASE_URL not found. Running offline check (drizzle-kit generate)...');
}

try {
    // Generate migrations based on current schema.ts
    execSync('npx drizzle-kit generate', { encoding: 'utf-8', stdio: 'inherit' });

    // Check if any tracked or untracked files were modified/created in the drizzle folder
    const gitStatus = execSync('git status --porcelain drizzle/', { encoding: 'utf-8' }).trim();

    if (gitStatus.length > 0) {
        console.error('\n❌ schema drift detected: commit migrations');
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
