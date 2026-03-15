export function GovernanceShell({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="governance-shell">
            <header className="mb-4">
                <h1 className="text-xl font-bold">{title}</h1>
            </header>
            <main>
                {children}
            </main>
        </div>
    );
}
