'use client';

import { motion } from 'framer-motion';
import { Database, Truck, Package, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

export function DataFlowWidget() {
    return (
        <div className="relative w-full max-w-lg mx-auto mt-12 mb-8 h-32 bg-white/60 backdrop-blur-md border border-gray-200 rounded-3xl shadow-xl overflow-hidden flex items-center justify-between px-8">
            <div className="flex flex-col items-center gap-2 z-10">
                <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center shadow-inner">
                    <Database className="text-blue-600 w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ERP / WMS</span>
            </div>

            {/* Path */}
            <div className="flex-1 h-0.5 bg-gray-200 mx-6 relative flex items-center">
                {/* Flowing packets */}
                <motion.div
                    animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-3 w-8 h-8 bg-green-50 rounded-lg border border-green-200 flex items-center justify-center shadow-sm z-20"
                >
                    <Package className="w-4 h-4 text-green-600" />
                </motion.div>

                <motion.div
                    animate={{ left: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: 1.25 }}
                    className="absolute -top-3 w-8 h-8 bg-purple-50 rounded-lg border border-purple-200 flex items-center justify-center shadow-sm z-20"
                >
                    <FileText className="w-4 h-4 text-purple-600" />
                </motion.div>
            </div>

            <div className="flex flex-col items-center gap-2 z-10">
                <div className="w-14 h-14 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-center shadow-inner">
                    <Truck className="text-green-600 w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expedição B2B</span>
            </div>
        </div>
    );
}

export function Particles247() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {[...Array(25)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                    initial={{
                        x: Math.random() * window.innerWidth,
                        y: Math.random() * 600,
                        opacity: 0
                    }}
                    animate={{
                        y: [null, Math.random() * -200 - 50],
                        opacity: [0, 0.6, 0]
                    }}
                    transition={{
                        duration: Math.random() * 4 + 3,
                        repeat: Infinity,
                        ease: "linear",
                        delay: Math.random() * 5
                    }}
                />
            ))}
        </div>
    );
}
