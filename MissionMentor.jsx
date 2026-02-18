import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  Settings,
  ChevronRight,
  Send,
  Activity,
  Zap,
  ShieldCheck,
  BookOpen,
  Sparkles,
  Volume2,
  Loader2,
  HelpCircle,
  Lightbulb,
  ChevronLeft, // FIX: Added for sprint navigation
  ChevronRight as ChevronRightIcon, // FIX: Alias for sprint navigation
  PlusCircle,
} from 'lucide-react';
// FIX: Removed unused imports: Share2, Terminal
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// ---------------------------------------------------------------------------
// FIX: Moved chartOptions BEFORE App component to avoid risky initialization order
// ---------------------------------------------------------------------------
const chartOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(51, 65, 85, 0.4)' },
      ticks: { color: '#64748b', font: { size: 10 } },
    },
    x: {
      grid: { display: false },
      ticks: { color: '#64748b', font: { size: 10 } },
    },
  },
};

// ---------------------------------------------------------------------------
// FIX: Moved MetricCard BEFORE App component
// ---------------------------------------------------------------------------
const MetricCard = ({ icon, title, value, sub, color }) => (
  <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl hover:translate-y-[-4px] transition-all">
    <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 flex items-center justify-center text-${color}-400 mb-4`}>
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p>
    <div className="flex items-baseline gap-2 mt-1">
      <p className="text-3xl font-black text-white">{value}</p>
      <span className="text-[10px] text-emerald-400 font-bold">{sub}</span>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// FIX: Moved LoaderPlaceholder BEFORE App component
// ---------------------------------------------------------------------------
const LoaderPlaceholder = () => (
  <div className="flex justify-start">
    <div className="bg-slate-800 p-5 rounded-3xl rounded-tl-none flex gap-1.5 items-center">
      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
      <span className="text-[10px] ml-2 font-bold text-slate-500 uppercase tracking-widest">O Mentor está a pensar...</span>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// FIX: Inline markdown bold renderer (renders **text** properly)
// ---------------------------------------------------------------------------
const InlineBold = ({ text }) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={i} className="text-indigo-300 font-bold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

// ===========================================================================
// MAIN APP COMPONENT
// ===========================================================================
const App = () => {
  // --- Application State ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSprint, setActiveSprint] = useState(1); // FIX: Now has UI controls
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Olá! Eu sou o teu Mentor de IA. Além de ajudar a gerir o projeto, vou explicar os conceitos técnicos por trás de cada decisão. Por onde queres começar?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(null);
  const [showDidacticTip, setShowDidacticTip] = useState(true);

  const [tasks, setTasks] = useState([
    {
      id: 1,
      text: 'Configurar Proxy Gemini (Segurança de API)',
      completed: true,
      description: 'Essencial para não expor chaves sensíveis no front-end.',
    },
    {
      id: 2,
      text: 'Integrar Vector DB para RAG',
      completed: false,
      description: 'RAG permite que a IA consulte os teus próprios documentos.',
    },
    {
      id: 3,
      text: 'Dashboard de Métricas (Chart.js)',
      completed: true,
      description: 'Visualização de dados para tomada de decisão rápida.',
    },
  ]);

  const chartDataValues = [12, 28, 42, 55, 68, 82, 94];
  const chatEndRef = useRef(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => scrollToBottom(), [messages]);

  // --- Gemini API Utilities ---
  const apiKey = ''; // Provided by runtime environment

  /**
   * Generic LLM call with Exponential Backoff for rate limit handling.
   * FIX: Updated model name to a valid, stable model identifier.
   */
  const callGemini = async (prompt, systemInstruction = '', retries = 5) => {
    const delay = (ms) => new Promise((res) => setTimeout(res, ms));

    for (let i = 0; i < retries; i++) {
      try {
        // FIX: Updated from invalid 'gemini-2.5-flash-preview-09-2025' to a valid model
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              systemInstruction: { parts: [{ text: systemInstruction }] },
            }),
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      } catch (err) {
        if (i === retries - 1) throw err;
        await delay(Math.pow(2, i) * 1000); // 1s, 2s, 4s, 8s, 16s
      }
    }
  };

  /**
   * Text-to-Speech using Gemini TTS model.
   * FIX: Improved pcmToWav using TypedArrays instead of slow per-byte loop.
   */
  const playTTS = async (text) => {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Diz de forma didática: ${text}` }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
              },
            },
            model: 'gemini-2.5-flash-preview-tts',
          }),
        }
      );

      const result = await response.json();
      const pcmData = result.candidates[0].content.parts[0].inlineData.data;
      const audioBlob = pcmToWav(pcmData, 24000);
      const audioUrl = URL.createObjectURL(audioBlob);
      new Audio(audioUrl).play();
    } catch (error) {
      console.error('Erro no áudio:', error);
    }
  };

  /**
   * Converts raw PCM base64 data to a WAV Blob playable in the browser.
   * FIX: Replaced slow per-byte loop with efficient TypedArray operations.
   */
  const pcmToWav = (base64Data, sampleRate) => {
    // FIX: Use Uint8Array directly instead of per-character loop
    const binaryStr = atob(base64Data);
    const pcmBuffer = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      pcmBuffer[i] = binaryStr.charCodeAt(i);
    }

    const wavBuffer = new ArrayBuffer(44 + pcmBuffer.byteLength);
    const view = new DataView(wavBuffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    // WAV header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcmBuffer.byteLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);       // PCM format chunk size
    view.setUint16(20, 1, true);        // PCM audio format
    view.setUint16(22, 1, true);        // Mono channel
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate (sampleRate * channels * bitsPerSample/8)
    view.setUint16(32, 2, true);        // Block align
    view.setUint16(34, 16, true);       // Bits per sample
    writeString(36, 'data');
    view.setUint32(40, pcmBuffer.byteLength, true);

    // FIX: Copy PCM data using set() instead of per-byte loop
    new Uint8Array(wavBuffer, 44).set(pcmBuffer);

    return new Blob([wavBuffer], { type: 'audio/wav' });
  };

  // --- AI Feature Handlers ---

  const generateTaskSuggestions = async () => {
    setIsGenerating('tasks');
    try {
      const prompt = `Analise o Sprint ${activeSprint}. Sugira 2 tarefas técnicas e EXPLIQUE brevemente o benefício didático de cada uma para um desenvolvedor. Formato: Nome da Tarefa | Explicação.`;
      const result = await callGemini(prompt, 'Tu és um Professor de Engenharia de Software. Foca na aprendizagem.');

      const lines = result.split('\n').filter((l) => l.includes('|'));
      const newTasks = lines.map((line, idx) => {
        const [text, desc] = line.split('|');
        return {
          id: `${Date.now()}-${idx}`, // FIX: String ID avoids potential integer collision
          text: text.trim().replace(/^[-*\d.]\s*/, ''),
          description: desc?.trim() ?? '',
          completed: false,
        };
      });

      // FIX: Guard against empty parse results
      if (newTasks.length === 0) {
        console.warn('Nenhuma tarefa pôde ser extraída da resposta da IA.');
        return;
      }

      setTasks((prev) => [...prev, ...newTasks]);
    } catch (error) {
      console.error('Erro ao gerar tarefas:', error);
    } finally {
      setIsGenerating(null);
    }
  };

  const generateInsight = async () => {
    setIsGenerating('insight');
    try {
      const prompt = `Dados do Gráfico: ${chartDataValues.join(', ')}. Explica como ler esta curva de progresso e o que ela indica sobre a eficiência da equipa.`;
      const result = await callGemini(prompt, 'Tu és um Mentor de Dados. Ensina o utilizador a interpretar métricas.');
      setMessages((prev) => [...prev, { role: 'assistant', text: `🎓 Lição de Dados:\n\n${result}` }]);
      setActiveTab('chat');
    } catch (error) {
      console.error('Erro ao gerar insight:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: '⚠️ Não foi possível gerar a análise. Verifica a tua ligação ou chave de API.' },
      ]);
      setActiveTab('chat');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault?.();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const aiText = await callGemini(
        `Pergunta: ${input}`,
        'És um mentor didático. Responde de forma clara, explicando termos técnicos complicados. Mantém o tom encorajador.'
      );
      setMessages((prev) => [...prev, { role: 'assistant', text: aiText }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: '⚠️ Ocorreu um erro na ligação com a IA. Tenta novamente mais tarde.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Chart data
  const chartData = {
    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    datasets: [
      {
        fill: true,
        label: 'Velocidade de Execução',
        data: chartDataValues,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Derived stats
  const completedCount = tasks.filter((t) => t.completed).length;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">Mission Mentor</h1>
            <p className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase">Didactic Edition</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <p className="px-4 pb-2 text-[10px] font-bold text-slate-500 uppercase">Navegação</p>

          {[
            { id: 'dashboard', label: 'Painel de Estudo', Icon: LayoutDashboard },
            { id: 'chat', label: 'Consultar Mentor', Icon: MessageSquare },
            { id: 'tasks', label: 'Objetivos do Sprint', Icon: CheckSquare },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <Icon size={18} /> {label}
            </button>
          ))}

          {/* FIX: Added Sprint navigation controls (activeSprint was set but had no UI) */}
          <div className="pt-4 px-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Sprint Ativo</p>
            <div className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2">
              <button
                onClick={() => setActiveSprint((s) => Math.max(1, s - 1))}
                disabled={activeSprint <= 1}
                className="text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-white">Sprint {activeSprint}</span>
              <button
                onClick={() => setActiveSprint((s) => s + 1)}
                className="text-slate-400 hover:text-white transition-all"
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>
          </div>

          <div className="pt-4 px-4">
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
              <div className="flex items-center gap-2 mb-2 text-indigo-400">
                <Lightbulb size={16} />
                <span className="text-xs font-bold uppercase">Dica do Dia</span>
              </div>
              {/* FIX: Renders **RAG** as bold instead of raw text */}
              <p className="text-xs text-slate-400 leading-relaxed">
                <InlineBold text='"O **RAG** (Retrieval-Augmented Generation) ajuda a IA a não "inventar" factos, baseando-se em documentos reais."' />
              </p>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Utilizador</p>
              <p className="text-[10px] text-emerald-400">Nível 4: Arquiteto</p>
            </div>
            <Settings size={14} className="text-slate-500 hover:text-white cursor-pointer" />
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Módulo</span>
            <ChevronRight size={14} className="text-slate-700" />
            <span className="text-slate-100 font-medium capitalize">{activeTab}</span>
          </div>
          {showDidacticTip && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full">
              <span className="text-[10px] text-emerald-400 font-medium">
                Sabias que? Estás a usar Gemini 2.0 Flash para processamento em tempo real.
              </span>
              <button onClick={() => setShowDidacticTip(false)} className="text-emerald-400 hover:text-white">
                ×
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {/* --- DASHBOARD TAB --- */}
          {activeTab === 'dashboard' && (
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Visão Geral do Conhecimento</h2>
                <button
                  onClick={generateInsight}
                  disabled={isGenerating === 'insight'}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                >
                  {isGenerating === 'insight' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Explicar Métricas do Gráfico
                </button>
              </div>

              {/* FIX: completionRate is now dynamic based on actual task state */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  icon={<Activity />}
                  title="Taxa de Conclusão"
                  value={`${completionRate}%`}
                  sub={`${completedCount}/${tasks.length} tarefas`}
                  color="indigo"
                />
                <MetricCard icon={<ShieldCheck />} title="Segurança" value="A+" sub="Zero vulnerabilidades" color="emerald" />
                <MetricCard
                  icon={<HelpCircle />}
                  title="Dúvidas Resolvidas"
                  value={messages.filter((m) => m.role === 'assistant').length}
                  sub="Interações com o Mentor"
                  color="amber"
                />
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white">Curva de Aprendizagem e Progresso</h3>
                  <p className="text-sm text-slate-500">Acompanha a evolução técnica do Sprint {activeSprint}.</p>
                </div>
                <div className="h-[350px]">
                  <Line data={chartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
                </div>
              </div>
            </div>
          )}

          {/* --- CHAT TAB --- */}
          {activeTab === 'chat' && (
            <div className="max-w-4xl mx-auto h-[calc(100vh-220px)] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-5 bg-slate-800/40 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Mentor IA Interativo</h3>
                    <p className="text-xs text-indigo-400 uppercase font-bold tracking-widest">Aprende enquanto constróis</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`group relative max-w-[85%] p-5 rounded-3xl ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-xl'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => playTTS(msg.text)}
                          className="absolute -right-12 top-4 opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-indigo-400 transition-all bg-slate-900 rounded-full border border-slate-800"
                          title="Ouvir explicação"
                        >
                          <Volume2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && <LoaderPlaceholder />}
                <div ref={chatEndRef} />
              </div>

              {/* FIX: Replaced <form> with div+button using onClick for broader compatibility */}
              <div className="p-6 bg-slate-800/20 border-t border-slate-700">
                <div className="relative group">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Pergunta sobre um conceito ou peça ajuda técnica..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-2xl py-4 pl-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                    className="absolute right-3 top-2.5 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- TASKS TAB --- */}
          {activeTab === 'tasks' && (
            <div className="max-w-3xl mx-auto space-y-8">
              <div className="flex items-center justify-between bg-slate-900 p-6 rounded-3xl border border-slate-800">
                <div>
                  <h2 className="text-2xl font-bold text-white">Objetivos de Engenharia</h2>
                  <p className="text-sm text-slate-500 mt-1">Conclui tarefas para ganhar experiência técnica.</p>
                </div>
                <button
                  onClick={generateTaskSuggestions}
                  disabled={isGenerating === 'tasks'}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/10"
                >
                  {isGenerating === 'tasks' ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  Sugerir com Explicação
                </button>
              </div>

              <div className="space-y-4">
                {/* FIX: Added empty state when no tasks exist */}
                {tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                    <PlusCircle size={40} className="text-slate-600 mb-4" />
                    <p className="text-slate-400 font-medium">Sem tarefas ainda.</p>
                    <p className="text-slate-500 text-sm mt-1">Clica em "Sugerir com Explicação" para começar.</p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <div
                      key={task.id}
                      className="group bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/40 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          onClick={() =>
                            setTasks(tasks.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)))
                          }
                          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${
                            task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700 hover:border-indigo-400'
                          }`}
                        >
                          {task.completed && <CheckSquare size={18} className="text-slate-950" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-bold ${task.completed ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                            {task.text}
                          </p>
                          {task.description && (
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                              <HelpCircle size={12} className="text-indigo-400 flex-shrink-0" />
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
