import { resetTestUsers, ResetUserValidationError } from '../src/modules/auth/user-reset.service';

async function main() {
    console.log('🔄 Initiating test user reset operation...');

    try {
        const result = await resetTestUsers();

        console.log('✅ User reset completed successfully:');
        console.log(`   - Preserved Admin Email: ${result.adminUser.email}`);
        console.log(`   - Preserved Admin User ID: ${result.adminUser.id}`);
        console.log(`   - Preserved Admin Tenant ID: ${result.adminUser.tenantId}`);
        console.log(`   - Preserved Admin Role: ${result.adminUser.role}`);
        console.log(`   - Removed Test Users Count: ${result.removedUserCount}`);
        console.log('   - Cleaned Dependent Records:', result.cleanedRecords);

        process.exit(0);
    } catch (error: any) {
        if (error instanceof ResetUserValidationError) {
            console.error('❌ Fail-Safe Error: Unsafe or invalid admin identification.', error.message);
        } else {
            console.error('❌ Error executing user reset:', error?.message || error);
        }
        process.exit(1);
    }
}

main();
