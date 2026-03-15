import React from 'react';
import { ProjectClientView } from '@/modules/governance/components/project-client-view';

export default async function ProjectPage({ params }: { params: Promise<{ spaceSlug: string, projectSlug: string }> }) {
    const { spaceSlug, projectSlug } = await params;
    return <ProjectClientView spaceSlug={spaceSlug} projectSlug={projectSlug} />;
}
