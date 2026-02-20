export interface GitHubCommit {
    sha: string;
    commit: {
        message: string;
        author: {
            name: string;
            date: string;
        };
    };
    html_url: string;
}

export interface ProjectReport {
    id: string;
    module_key: string;
    title: string;
    summary: string;
    status: 'done' | 'in_progress' | 'planned' | 'warn' | string;
    changes?: string | null;
    metrics?: string | null;
    risks?: string | null;
    next_actions?: string | null;
    tags?: string | null;
    source: string;
    content_hash: string;
    created_at: string | Date;
}

export type TimeRange = '7d' | '14d' | '30d' | '90d';

export interface FilterState {
    q: string;
    range: TimeRange;
    modules: string[];
    statuses: string[];
    tags: string[];
    groupTimeline: 'day' | 'module';
    compactMode: boolean;
    autoRefresh: boolean;
}
