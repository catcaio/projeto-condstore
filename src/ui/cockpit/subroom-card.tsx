import { Card, CardContent, CardHeader, Button } from '@/ui/components';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface SubRoomCardProps {
    id: string;
    label: string;
    description: string;
    route: string;
    actionLabel?: string;
}

export function SubRoomCard({ label, description, route, actionLabel = 'Acessar' }: SubRoomCardProps) {
    return (
        <Card variant="grouped" className={cn("transition-all hover:bg-slate-50")}>
            <CardHeader 
                heading={label} 
                subheading={<span className="text-gray-500">{description}</span>}
            />
            <CardContent className="pt-2">
                <Link href={route}>
                    <Button variant="ghost" size="sm" className="pl-0 text-indigo-600 hover:text-indigo-700 hover:bg-transparent -ml-2">
                        {actionLabel} <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}
