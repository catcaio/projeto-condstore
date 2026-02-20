
import { inboundMessageRepository } from '../../../../modules/llm/repositories/message.repository';
import { IntentType } from '../../../../modules/llm/intents';
import { labelMessage } from '../actions';

// Force dynamic to ensure we always get fresh unlabelled messages
export const dynamic = 'force-dynamic';

export default async function LabelingPage() {
    const messages = await inboundMessageRepository.getUnlabelledMessages(20);
    const intents = Object.values(IntentType);

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
                    Rotulagem de Intenções (LLM Training)
                </h1>
                <div className="text-sm text-zinc-400">
                    Mensagens pendentes: <span className="text-emerald-400 font-mono">{messages.length}</span> (exibindo últimas 20)
                </div>
            </header>

            <div className="grid gap-4">
                {messages.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-zinc-700 rounded-lg text-zinc-500">
                        Nenhuma mensagem pendente de rotulagem encontrada.
                    </div>
                ) : (
                    messages.map((msg: any) => (
                        <div key={msg.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow-sm hover:border-zinc-700 transition-colors">
                            <div className="flex flex-col md:flex-row gap-4 justify-between">

                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mb-1">
                                        <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">
                                            {msg.fromNumber}
                                        </span>
                                        <span>{new Date(msg.receivedAt).toLocaleString('pt-BR')}</span>
                                        {msg.messageSid && <span title="MessageSid">ID: ...{msg.messageSid.slice(-4)}</span>}
                                    </div>

                                    <div className="p-3 bg-zinc-950/50 rounded border border-zinc-800/50 text-zinc-100 font-medium">
                                        {msg.bodyRaw}
                                    </div>
                                    {msg.bodyNorm !== msg.bodyRaw.toLowerCase().trim() && (
                                        <div className="text-xs text-zinc-600 truncate">Norm: {msg.bodyNorm}</div>
                                    )}
                                </div>

                                <div className="md:w-64 flex-shrink-0 pt-2 md:pt-0">
                                    <form action={labelMessage} className="flex flex-col gap-2">
                                        <input type="hidden" name="messageId" value={msg.id} />

                                        <label className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Classificar como:</label>
                                        <div className="flex gap-2">
                                            <select
                                                name="intent"
                                                className="flex-1 bg-zinc-800 border-zinc-700 text-zinc-200 text-sm rounded-md p-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                required
                                            >
                                                <option value="" disabled selected>Selecionar...</option>
                                                {intents.map(intent => (
                                                    <option key={intent} value={intent}>{intent}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="submit"
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-md transition-colors"
                                                title="Salvar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            </button>
                                        </div>
                                    </form>
                                </div>

                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
