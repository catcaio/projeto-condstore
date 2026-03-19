import { Card, CardContent, CardHeader, Button } from '@/ui/components';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModuleLink } from './module-link';

interface RoomCardProps {
    id: string;
    label: string;
    description: string;
    icon: LucideIcon;
}

export function RoomCard({ id, label, description, icon: Icon }: RoomCardProps) {
    return (
        <Card variant="elevated" className={cn("transition-all hover:shadow-md h-full flex flex-col")}>
            <CardHeader 
                heading={label} 
                subheading={<span className="text-gray-500">{description}</span>}
                actions={<Icon className="h-6 w-6 text-indigo-500" />}
            />
            <CardContent className="flex-1 flex flex-col justify-end pt-4">
                <ModuleLink id={id} className="w-full">
                    <Button variant="secondary" className="w-full">
                        Abrir Sala
                    </Button>
                </ModuleLink>
            </CardContent>
        </Card>
    );
}
