'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, LineChart, Cpu, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/ui/components';
import { TrackedLink } from '@/ui/lib/track-client';

type Step = 'focus' | 'volume' | 'platform' | 'result';

export function AvaliacaoClient() {
    const [currentStep, setCurrentStep] = useState<Step>('focus');
    const [answers, setAnswers] = useState({
        focus: '',
        volume: '',
        platform: ''
    });

    const handleAnswer = (step: Step, value: string) => {
        setAnswers(prev => ({ ...prev, [step]: value }));
    };

    const nextStep = (next: Step) => {
        setCurrentStep(next);
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 w-full max-w-4xl mx-auto relative relative z-10 pt-24 sm:pt-32">
            <AnimatePresence mode="popLayout">
                {currentStep === 'focus' && (
                    <motion.div
                        key="focus"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="w-full"
                    >
                        <div className="text-center mb-12">
                            <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-4 block">Passo 1 de 3</span>
                            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#0A2540] tracking-tight">
                                Qual parte da sua operação você <span className="text-blue-600">PRECISA automatizar?</span>
                            </h1>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <button
                                onClick={() => handleAnswer('focus', 'freight')}
                                className={`p-8 rounded-3xl border-2 text-left transition-all duration-300 hover:-translate-y-1 ${answers.focus === 'freight' ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-600/20' : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-xl'
                                    }`}
                            >
                                <Package className={`w-10 h-10 mb-6 ${answers.focus === 'freight' ? 'text-blue-600' : 'text-gray-400'}`} />
                                <h3 className="text-xl font-bold text-[#0A2540] mb-2">Despacho de Fretes</h3>
                                <p className="text-sm text-[#425466]">Cotações lentas, impressão manual de etiquetas e rastreio ineficiente.</p>
                            </button>

                            <button
                                onClick={() => handleAnswer('focus', 'sales')}
                                className={`p-8 rounded-3xl border-2 text-left transition-all duration-300 hover:-translate-y-1 ${answers.focus === 'sales' ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-500/20' : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-xl'
                                    }`}
                            >
                                <LineChart className={`w-10 h-10 mb-6 ${answers.focus === 'sales' ? 'text-emerald-500' : 'text-gray-400'}`} />
                                <h3 className="text-xl font-bold text-[#0A2540] mb-2">Vendas B2B/CRM</h3>
                                <p className="text-sm text-[#425466]">Falta de follow-up, controle de clientes atacadistas perdido em planilhas.</p>
                            </button>

                            <button
                                onClick={() => handleAnswer('focus', 'tech')}
                                className={`p-8 rounded-3xl border-2 text-left transition-all duration-300 hover:-translate-y-1 ${answers.focus === 'tech' ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-600/20' : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-xl'
                                    }`}
                            >
                                <Cpu className={`w-10 h-10 mb-6 ${answers.focus === 'tech' ? 'text-indigo-600' : 'text-gray-400'}`} />
                                <h3 className="text-xl font-bold text-[#0A2540] mb-2">Infra / Integração</h3>
                                <p className="text-sm text-[#425466]">Sistemas legados caindo, necessidade de Webhooks e agentes de IA.</p>
                            </button>
                        </div>

                        <div className="mt-12 flex justify-end">
                            <Button
                                onClick={() => nextStep('volume')}
                                disabled={!answers.focus}
                                className="h-14 px-8 rounded-full font-bold text-lg shadow-lg group disabled:opacity-50"
                            >
                                Próximo Passo
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </motion.div>
                )}

                {currentStep === 'volume' && (
                    <motion.div
                        key="volume"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="w-full max-w-2xl mx-auto"
                    >
                        <div className="flex items-center mb-8">
                            <button onClick={() => setCurrentStep('focus')} className="text-gray-400 hover:text-gray-600 p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div className="flex-1 text-center pr-8">
                                <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-2 block">Passo 2 de 3</span>
                                <h2 className="text-3xl font-extrabold text-[#0A2540] tracking-tight">Qual é o seu volume mensal?</h2>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            {['Até 500 envios/mês', 'De 501 a 2.000 envios', 'De 2.001 a 10.000 envios', 'Mais de 10.000 envios (Enterprise)'].map(vol => (
                                <button
                                    key={vol}
                                    onClick={() => handleAnswer('volume', vol)}
                                    className={`p-6 rounded-2xl border-2 text-left font-bold text-lg transition-all ${answers.volume === vol ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white hover:border-blue-300 text-[#425466]'}`}
                                >
                                    {vol}
                                </button>
                            ))}
                        </div>

                        <div className="mt-10 flex justify-end">
                            <Button
                                onClick={() => nextStep('platform')}
                                disabled={!answers.volume}
                                className="h-14 px-8 rounded-full font-bold text-lg shadow-lg group disabled:opacity-50"
                            >
                                Próximo Passo
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </motion.div>
                )}

                {currentStep === 'platform' && (
                    <motion.div
                        key="platform"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="w-full max-w-2xl mx-auto"
                    >
                        <div className="flex items-center mb-8">
                            <button onClick={() => setCurrentStep('volume')} className="text-gray-400 hover:text-gray-600 p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div className="flex-1 text-center pr-8">
                                <span className="text-blue-600 font-semibold tracking-wider uppercase text-sm mb-2 block">Passo 3 de 3</span>
                                <h2 className="text-3xl font-extrabold text-[#0A2540] tracking-tight">Onde você vende hoje?</h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {['Nuvemshop', 'Shopify', 'Tray', 'Mercado Livre', 'Venda Direta / B2B', 'Desenvolvimento Próprio / API'].map(plat => (
                                <button
                                    key={plat}
                                    onClick={() => handleAnswer('platform', plat)}
                                    className={`p-6 rounded-xl border-2 text-center font-bold transition-all ${answers.platform === plat ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white hover:border-blue-300 text-[#425466]'}`}
                                >
                                    {plat}
                                </button>
                            ))}
                        </div>

                        <div className="mt-10 flex justify-end">
                            <Button
                                onClick={() => nextStep('result')}
                                disabled={!answers.platform}
                                className="h-14 px-8 rounded-full font-bold text-lg bg-[#00A859] hover:bg-[#008f4c] text-white shadow-lg group disabled:opacity-50"
                            >
                                Finalizar Avaliação
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </motion.div>
                )}

                {currentStep === 'result' && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-2xl mx-auto text-center"
                    >
                        <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 text-blue-600">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-4xl font-extrabold text-[#0A2540] tracking-tight mb-4">Tudo pronto!</h2>
                        <p className="text-lg text-[#425466] mb-10">
                            Detectamos que o <strong className="text-[#0A2540]">Condstore OS</strong> pode revolucionar seu lado logístico para a plataforma <strong>{answers.platform}</strong>. Crie sua conta gratuita agora e obtenha um trial completo com simulações ilimitadas.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <TrackedLink href="/signup" passHref trackPage="avaliacao" trackSection="result" trackElement="signup_cta" legacyBehavior>
                                <Button className="h-16 px-10 rounded-full font-bold text-xl bg-[#0A2540] hover:bg-[#112F4E] text-white shadow-xl shadow-[#0A2540]/20">
                                    Começar Gratuitamente
                                </Button>
                            </TrackedLink>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

