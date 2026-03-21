import { execSync } from 'child_process';
import { format, parseISO, startOfWeek, subWeeks, isAfter } from 'date-fns';

export interface FrontActivity {
  id: string;
  name: string;
  count: number;
}

export interface EvolutionTimelinePoint {
  date: string;
  timestamp: number;
  fronts: Record<string, number>;
  total: number;
}

export interface EvolutionData {
  timeline: EvolutionTimelinePoint[];
  frontsTotal: Record<string, number>;
  latestCommits: { message: string; date: string }[];
  isFallback: boolean;
}

const FRONTS = [
  { id: 'auth', name: 'Auth & Security', matchers: ['src/infra/security', 'middleware', 'src/app/api/auth'] },
  { id: 'cockpit', name: 'Cockpit & CRM', matchers: ['src/modules/cockpit', 'src/modules/crm', 'src/app/(cockpit)', 'src/app/api/cockpit'] },
  { id: 'tenant', name: 'Tenant & Admin', matchers: ['src/modules/tenant', 'src/app/(admin)', 'src/infra/db', 'src/drizzle'] },
  { id: 'freight', name: 'Logística', matchers: ['src/modules/freight', 'src/modules/logistics', 'src/app/painel-logistico', 'src/app/api/freight'] },
  { id: 'observability', name: 'Observability & Core', matchers: ['sentry', 'instrumentation', 'logging', 'src/core', '.github'] },
  { id: 'integration', name: 'Integrações (API/Webhooks)', matchers: ['webhook', 'whatsapp', 'stripe', 'twilio', 'src/app/api'] }
];

function getFallbackData(): EvolutionData {
  const timeline: EvolutionTimelinePoint[] = [];
  const frontsTotal: Record<string, number> = {};
  
  FRONTS.forEach(f => { frontsTotal[f.id] = 0; });

  const now = new Date();
  for (let i = 8; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const point: EvolutionTimelinePoint = {
      date: format(weekStart, 'dd/MMM'),
      timestamp: weekStart.getTime(),
      fronts: {},
      total: 0
    };
    
    FRONTS.forEach(f => {
      const activity = Math.floor(Math.random() * (10 - i) + (i === 0 ? 5 : 1));
      point.fronts[f.id] = activity;
      point.total += activity;
      frontsTotal[f.id] += activity;
    });
    
    timeline.push(point);
  }

  return {
    timeline,
    frontsTotal,
    latestCommits: [
      { message: "feat(core): update platform modules", date: format(now, "yyyy-MM-dd") }
    ],
    isFallback: true
  };
}

export async function getGitEvolutionData(): Promise<EvolutionData> {
  try {
    const stdout = execSync('git log --pretty=format:"%ad|%s" --date=short --name-only -n 500', {
      encoding: 'utf-8',
      cwd: process.cwd(),
      maxBuffer: 1024 * 1024 * 10 
    });

    const lines = stdout.split('\n');
    let currentCommit: { date: string, message: string } | null = null;
    
    const weeksMap = new Map<string, EvolutionTimelinePoint>();
    const frontsTotal: Record<string, number> = {};
    const latestCommits: { message: string; date: string }[] = [];
    
    FRONTS.forEach(f => { frontsTotal[f.id] = 0; });

    for (const line of lines) {
      if (!line.trim()) continue;

      if (/^\d{4}-\d{2}-\d{2}\|/.test(line)) {
        const [dateStr, ...msgParts] = line.split('|');
        const message = msgParts.join('|');
        currentCommit = { date: dateStr, message };
        
        if (latestCommits.length < 5) {
          latestCommits.push({ date: dateStr, message });
        }
        continue;
      }

      if (currentCommit) {
        const filePath = line.trim();
        let matchedFrontId = 'observability';

        for (const front of FRONTS) {
          if (front.matchers.some(m => filePath.includes(m))) {
            matchedFrontId = front.id;
            break;
          }
        }

        const commitDate = parseISO(currentCommit.date);
        const weekStart = startOfWeek(commitDate, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');

        if (!weeksMap.has(weekKey)) {
          weeksMap.set(weekKey, {
            date: format(weekStart, 'dd/MMM'),
            timestamp: weekStart.getTime(),
            fronts: {},
            total: 0
          });
        }

        const point = weeksMap.get(weekKey)!;
        point.fronts[matchedFrontId] = (point.fronts[matchedFrontId] || 0) + 1;
        point.total += 1;
        frontsTotal[matchedFrontId] += 1;
      }
    }

    const timeline = Array.from(weeksMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    const recentTimeline = timeline.slice(-12);

    if (recentTimeline.length === 0) {
      return getFallbackData();
    }

    return {
      timeline: recentTimeline,
      frontsTotal,
      latestCommits,
      isFallback: false
    };

  } catch (error) {
    console.warn("Failed to read git history, using fallback data for evolution.", error);
    return getFallbackData();
  }
}
