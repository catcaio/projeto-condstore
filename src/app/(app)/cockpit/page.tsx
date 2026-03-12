import { rooms } from '@/modules/cockpit/rooms/rooms.registry';
import { RoomCard } from '@/ui/cockpit/room-card';
import { PageHeader } from '@/ui/components/PageHeader';

export const metadata = {
    title: 'Launcher Operacional — CONDSTORE OS',
};

export const dynamic = 'force-dynamic';

export default function CockpitPage() {
    return (
        <div className="flex-1 overflow-auto bg-gray-50/50 p-6">
            <div className="mx-auto max-w-6xl space-y-8">
                <PageHeader 
                    title="Launcher Operacional" 
                    subtitle="Bem-vindo ao centro de controle. Selecione a sala de trabalho desejada."
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {rooms.map((room) => (
                        <RoomCard key={room.id} {...room} />
                    ))}
                </div>
            </div>
        </div>
    );
}
