import { notFound } from 'next/navigation';
import { rooms, subrooms } from '@/modules/cockpit';
import { SubRoomCard } from '@/ui/cockpit/subroom-card';
import { PageHeader } from '@/ui/components/PageHeader';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function RoomPage(props: { params: Promise<{ room: string }> }) {
    const { room } = await props.params;

    const currentRoom = rooms.find(r => r.id === room);

    if (!currentRoom) {
        notFound();
    }

    const roomSubrooms = subrooms.filter(sr => sr.roomId === room);

    return (
        <div className="flex-1 overflow-auto bg-gray-50/50 p-6">
            <div className="mx-auto max-w-4xl space-y-8">
                <div className="mb-4">
                    <Link href="/cockpit" className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Voltar para Launcher
                    </Link>
                </div>
                
                <PageHeader 
                    title={currentRoom.label} 
                    subtitle={currentRoom.description}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {roomSubrooms.map((subroom) => (
                        <SubRoomCard key={subroom.id} {...subroom} />
                    ))}
                </div>
                
                {roomSubrooms.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        Nenhuma subsala configurada para esta sala.
                    </div>
                )}
            </div>
        </div>
    );
}
