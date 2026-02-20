import React from 'react';
import { getReports, getCommits, getBuildInfo } from './data';
import { DashboardClient } from './DashboardClient';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Condstore OS - Evolution Cockpit',
};

export default async function EvolutionPage() {
    const commitsPromise = getCommits();
    const reportsPromise = getReports();
    const buildInfoPromise = getBuildInfo();

    const [commits, { data: reports, error: dbError }, buildInfo] = await Promise.all([
        commitsPromise,
        reportsPromise,
        buildInfoPromise
    ]);

    return (
        <DashboardClient
            initialReports={reports}
            commits={commits}
            buildInfo={buildInfo}
            dbError={dbError}
        />
    );
}
