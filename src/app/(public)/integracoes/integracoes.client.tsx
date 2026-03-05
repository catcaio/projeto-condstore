'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const partners = [
    { name: "Itaú Empresas", type: "Banco", ping: "12ms", status: "online" },
    { name: "Banco Bradesco", type: "Banco", ping: "18ms", status: "online" },
    { name: "Cora API", type: "Banco", ping: "8ms", status: "online" },
    { name: "Braspress", type: "Transportadora", ping: "24ms", status: "online" },
    { name: "Jadlog Logística", type: "Transportadora", ping: "35ms", status: "syncing" },
    { name: "Correios SEDEX", type: "Transportadora", ping: "15ms", status: "online" },
    { name: "Jamef Encomendas", type: "Transportadora", ping: "22ms", status: "online" },
    { name: "Stripe Brasil", type: "Pagamento", ping: "5ms", status: "online" }
];

export function InteractiveIntegrationsGrid() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {partners.map((partner, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                    className="group relative h-32 rounded-2xl border border-gray-200 bg-white flex flex-col items-center justify-center p-6 hover:shadow-2xl hover:border-blue-300 transition-all cursor-pointer overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    {/* Status Indicator */}
                    <div className="absolute top-3 right-3 flex items-center gap-1">
                        <motion.div
                            animate={partner.status === "syncing" ? { opacity: [0.3, 1, 0.3] } : {}}
                            transition={{ repeat: Infinity, duration: 1 }}
                            className={`w-2 h-2 rounded-full ${partner.status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]'}`}
                        ></motion.div>
                        <span className="text-[9px] font-mono text-gray-400 capitalize">{partner.status}</span>
                    </div>

                    <span className="text-gray-700 font-bold text-lg relative z-10 text-center">{partner.name}</span>
                    <span className="text-gray-400 text-xs mt-1 relative z-10">{partner.type}</span>

                    {/* Ping hover reveal */}
                    <div className="absolute bottom-[-20px] group-hover:bottom-3 transition-all duration-300 font-mono text-[10px] text-blue-500 tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        PING: {partner.ping}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

