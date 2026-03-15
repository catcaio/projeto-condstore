'use client';

import React from 'react';
import { TaskCard } from './task-card';

export function TaskBoard({ projectSlug }: { projectSlug: string }) {
    return (
        <div className="flex-1 overflow-x-auto p-6 bg-neutral-subtle dark:bg-transparent flex space-x-6">
            {['To Do', 'In Progress', 'Blocked', 'Done'].map(status => (
                <div key={status} className="w-80 flex-shrink-0 flex flex-col pt-1">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                            {status}
                            <span className="ml-2 bg-slate-200 dark:bg-neutral-subtle text-slate-600 dark:text-neutral-content text-xs py-0.5 px-2 rounded-full">
                                2
                            </span>
                        </h3>
                        <button className="text-neutral-content hover:text-indigo-500">+</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 pb-4 scrollbar-hide">
                        {status === 'To Do' && (
                            <>
                                <TaskCard title="Investigar latência na rota de metrics" id={`TSK-${Math.floor(Math.random() * 1000)}`} priority="high" label="Ops" />
                                <TaskCard title="Revisar playbook de atendimento WhatsApp" id={`TSK-${Math.floor(Math.random() * 1000)}`} priority="normal" />
                            </>
                        )}
                        {status === 'In Progress' && (
                            <>
                                <TaskCard title="Onboarding do tenant enterprise" id={`TSK-${Math.floor(Math.random() * 1000)}`} priority="urgent" label="Onboarding" />
                            </>
                        )}
                        {status === 'Blocked' && (
                            <>
                                <TaskCard title="Ajuste de caching por tenant" id={`TSK-${Math.floor(Math.random() * 1000)}`} priority="high" />
                                <TaskCard title="Vincular simulação de frete ao pedido" id={`TSK-${Math.floor(Math.random() * 1000)}`} priority="urgent" label="Bug" />
                            </>
                        )}
                        {status === 'Done' && (
                            <>
                                <TaskCard title="Corrigir inconsistência dashboards antigos/novos" id={`TSK-${Math.floor(Math.random() * 1000)}`} priority="normal" />
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
