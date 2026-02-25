import { LoginForm } from './login-form';

function detectBuildLabel(): string {
    const env = process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV || 'local';
    const sha =
        process.env.GIT_SHA?.trim() ||
        process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
        process.env.COMMIT_SHA?.trim() ||
        'dev';

    return `ENV: ${env} / SHA: ${sha.slice(0, 12)}`;
}

export default function LoginPage() {
    return <LoginForm buildLabel={detectBuildLabel()} />;
}
