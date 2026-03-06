'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/ui/components/button';
import { TrackedLink } from '@/ui/lib/track-client';

export type PlanDefinition = {
    name: string;
    cta: string;
    color: string;
};

export type FeatureCategory = {
    category: string;
    items: {
        name: string;
        info?: string;
        vals: (boolean | string)[];
    }[];
};

export function PricingTable({
    title,
    planos,
    features,
}: {
    title: string;
    planos: PlanDefinition[];
    features: FeatureCategory[];
}) {
    const [openCategories, setOpenCategories] = useState<string[]>(features.map(f => f.category));

    const toggleCategory = (cat: string) => {
        setOpenCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    return (
        <div data-testid="pricing-plans" className="w-full overflow-x-auto pb-12 pt-16 relative">
            <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-extrabold text-[#0A2540] tracking-tight">{title}</h2>
            </div>

            <table className="w-full min-w-[900px] border-collapse mx-auto max-w-7xl">
                {/* Sticky Header */}
                <thead className="sticky top-16 z-40 bg-white/90 backdrop-blur-md shadow-sm">
                    <tr>
                        <th className="p-6 text-left w-[25%] bg-[#F4F7FA] rounded-tl-2xl border-b border-gray-200 align-bottom">
                            <span className="text-lg font-bold text-[#425466]">Comparativo</span>
                        </th>
                        {planos.map((p, i) => (
                            <th key={i} data-testid="pricing-plan-card" className={`p-6 text-center border-b border-gray-200 ${i === planos.length - 1 ? 'rounded-tr-2xl' : ''}`} style={{ width: `${75 / planos.length}%` }}>
                                <div className="flex flex-col items-center gap-4">
                                    <span data-testid="pricing-plan-price" className="text-2xl font-bold text-[#0A2540] tracking-tight">{p.name}</span>
                                    <TrackedLink href="/login" passHref trackPage="pricing_table" trackSection="table" trackElement={`cta_${p.name.toLowerCase()}`} legacyBehavior>
                                        <Button className={`w-full max-w-[160px] rounded-full font-bold h-10 ${p.color}`}>
                                            {p.cta}
                                        </Button>
                                    </TrackedLink>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>

                {/* Accordion Body */}
                <tbody className="bg-white">
                    {features.map((section, sIdx) => {
                        const isOpen = openCategories.includes(section.category);
                        return (
                            <optgroup key={sIdx} className="contents">
                                <tr>
                                    <td colSpan={planos.length + 1} className="p-0 border-b border-gray-200">
                                        <button
                                            onClick={() => toggleCategory(section.category)}
                                            className="w-full flex items-center justify-between p-6 bg-[#F4F7FA] font-bold text-[#0A2540] text-lg uppercase tracking-wider hover:bg-gray-100 transition-colors"
                                        >
                                            {section.category}
                                            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                    </td>
                                </tr>
                                <AnimatePresence initial={false}>
                                    {isOpen && section.items.map((row, rIdx) => (
                                        <motion.tr
                                            key={rIdx}
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="hover:bg-blue-50/50 transition-colors border-b border-gray-100 overflow-hidden"
                                        >
                                            <td className="p-5 pl-8 text-[#425466] font-medium border-r border-gray-50 flex items-center gap-2">
                                                {row.name}
                                                {row.info && (
                                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold cursor-help" title={row.info}>?</span>
                                                )}
                                            </td>
                                            {row.vals.map((val, vIdx) => (
                                                <td key={vIdx} className="p-5 text-center border-r border-gray-50 last:border-0 align-middle">
                                                    {typeof val === 'boolean' ? (
                                                        val
                                                            ? <Check className="w-5 h-5 text-[#20C05C] mx-auto" />
                                                            : <X className="w-5 h-5 text-gray-300 mx-auto" />
                                                    ) : (
                                                        <span className="text-[#0A2540] font-medium whitespace-nowrap">{val}</span>
                                                    )}
                                                </td>
                                            ))}
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </optgroup>
                        );
                    })}
                </tbody>
            </table>
        </div >
    );
}
