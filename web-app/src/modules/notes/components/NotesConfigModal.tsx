import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Key, Shield, HelpCircle, AlertTriangle, Book, Target, Cake, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import FocusSession from '@/plugins/FocusPlugin';
import { useTranslation } from 'react-i18next';

import { hashPin } from '../../../utils/crypto';

interface NotesConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: NotesConfig) => void;
    initialConfig: NotesConfig;
    isPro?: boolean;
    onOpenPro?: () => void;
}

export interface NotesConfig {
    enabledFeatures: string[];
    security: {
        pin: string;
        recoveryMethod: 'QUESTION' | 'PASSWORD' | 'BOTH';
        recoveryQuestion?: string;
        recoveryAnswer?: string;
        accountPassword?: string; // In a real app, this would be validated against backend, not stored here.
        protectedAreas: {
            memories: boolean;
            notes: boolean;
            charts: boolean;
            journal: boolean;
        }
    }
}

export const NotesConfigModal = ({ isOpen, onClose, onSave, initialConfig, isPro, onOpenPro }: NotesConfigModalProps) => {
    const { t } = useTranslation();
    const [config, setConfig] = useState<NotesConfig>(initialConfig || {
        enabledFeatures: [],
        security: {
            pin: '',
            recoveryMethod: 'PASSWORD',
            protectedAreas: { memories: false, notes: false, charts: false, journal: false }
        }
    });

    // Temp state for UI interactions
    const [activeTab, setActiveTab] = useState<'FEATURES' | 'SECURITY' | 'RECOVERY'>('FEATURES');
    
    useEffect(() => {
        if (initialConfig) setConfig(initialConfig);
    }, [initialConfig, isOpen]);

    // Privacy Shield
    useEffect(() => {
        if (isOpen) {
            FocusSession.enablePrivacy().catch(console.error);
        }
        return () => {
            FocusSession.disablePrivacy().catch(console.error);
        };
    }, [isOpen]);

    const toggleFeature = (id: string) => {
        setConfig(prev => ({
            ...prev,
            enabledFeatures: prev.enabledFeatures.includes(id) 
                ? prev.enabledFeatures.filter(f => f !== id) 
                : [...prev.enabledFeatures, id]
        }));
    };

    const toggleProtectedArea = (area: keyof typeof config.security.protectedAreas) => {
        if (!isPro) {
            if (onOpenPro) onOpenPro();
            return;
        }
        setConfig(prev => ({
            ...prev,
            security: {
                ...prev.security,
                protectedAreas: {
                    ...prev.security.protectedAreas,
                    [area]: !prev.security.protectedAreas[area]
                }
            }
        }));
    };

    const handlePinChange = (val: string) => {
        if (!isPro) {
            if (onOpenPro) onOpenPro();
            return;
        }
        if (config.security.pin.length === 64 && val.includes('•')) {
            val = val.replace(/•/g, '');
        }
        val = val.replace(/[^0-9]/g, '').slice(0, 5);
        setConfig(prev => ({ ...prev, security: { ...prev.security, pin: val } }));
    };

    const handleSave = async () => {
        // Validation
        let finalConfig = { ...config };
        if (config.enabledFeatures.includes('KEY')) {
            // Check if PIN needs to be hashed (it is exactly 5 digits)
            if (config.security.pin.length === 5) {
                const hashed = await hashPin(config.security.pin);
                finalConfig.security.pin = hashed;
            } else if (config.security.pin.length !== 64) {
                toast.error('PIN must be exactly 5 digits');
                return;
            }
            if (config.security.recoveryMethod === 'QUESTION' && (!config.security.recoveryQuestion || !config.security.recoveryAnswer)) {
                toast.error('Please complete the security question setup');
                setActiveTab('RECOVERY');
                return;
            }
             // For 'PASSWORD' method, we assume the account password is handled by auth provider, 
             // but here we might ask for it if we were simulating locally.
        }

        onSave(finalConfig);
        onClose();
        toast.success("Configuration saved");
    };

    if (!isOpen) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 font-sans">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 bg-black/80"
                        onClick={onClose}
                    />
                    
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
                        className="relative z-10 w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] antialiased"
                        style={{ willChange: 'transform, opacity', backfaceVisibility: 'hidden', transform: 'translate3d(0,0,0)' }}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#161616]">
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">{t('notes.settings', 'Settings')}</h2>
                                <p className="text-xs text-white/40">{t('notes.customizeExperience', 'Customize your experience')}</p>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-white/5 p-2 gap-2 bg-[#111]">
                            {[
                                { id: 'FEATURES', label: 'Features', icon: Target },
                                { id: 'SECURITY', label: 'Security', icon: Lock },
                                { id: 'RECOVERY', label: 'Recovery', icon: Shield }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
                                >
                                    <tab.icon size={14} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            
                            {/* FEATURES TAB */}
                            {activeTab === 'FEATURES' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-150">
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest block">{t('notes.quickActions', 'Quick Actions')}</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'BIRTHDAY', icon: Cake, label: 'Memories' },
                                                { id: 'KEY', icon: Key, label: 'Vault' }
                                            ].map(btn => {
                                                const isSelected = config.enabledFeatures.includes(btn.id);
                                                return (
                                                    <button
                                                        key={btn.id}
                                                        onClick={() => toggleFeature(btn.id)}
                                                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all duration-300 ${isSelected ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white'}`}
                                                    >
                                                        <btn.icon size={24} />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">{btn.label}</span>
                                                        {isSelected && <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECURITY TAB */}
                            {activeTab === 'SECURITY' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-150">
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Key size={12} />
                                            Master PIN (5 Digits)
                                            {!isPro && <Lock size={12} className="text-yellow-400 ml-auto" />}
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={config.security.pin.length === 64 ? '•••••' : config.security.pin}
                                            onChange={(e) => handlePinChange(e.target.value)}
                                            placeholder="•••••"
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl p-4 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-white/30 transition-colors text-white shadow-inner"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest block">{t('notes.lockTheseAreas', 'Lock these areas')}</label>
                                        <div className="space-y-2">
                                            {[
                                                { id: 'memories', label: t('notes.celebrationsMemories', 'Celebrations & Memories'), icon: Cake },
                                                { id: 'notes', label: t('notes.generalNotes', 'General Notes'), icon: Key },
                                                { id: 'journal', label: t('notes.journalingZone', 'Journaling Zone'), icon: Book },
                                                { id: 'charts', label: t('notes.statisticsCharts', 'Statistics & Charts'), icon: Target }
                                            ].map(area => (
                                                <div key={area.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${config.security.protectedAreas[area.id as keyof typeof config.security.protectedAreas] ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/40'}`}>
                                                            <area.icon size={16} />
                                                        </div>
                                                        <span className="text-sm font-medium text-white">{area.label}</span>
                                                        {!isPro && <Lock size={12} className="text-yellow-400" />}
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={config.security.protectedAreas[area.id as keyof typeof config.security.protectedAreas]}
                                                            onChange={() => toggleProtectedArea(area.id as any)}
                                                            className="sr-only peer" 
                                                        />
                                                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* RECOVERY TAB */}
                            {activeTab === 'RECOVERY' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-150">
                                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex gap-3">
                                        <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
                                        <p className="text-xs text-yellow-200/80 leading-relaxed">
                                            If you forget your PIN, these methods will be the <strong>only way</strong> to recover your data. Ensure at least one is enabled.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Option 1: Account Password */}
                                        <div className={`p-4 rounded-2xl border transition-all ${config.security.recoveryMethod === 'PASSWORD' || config.security.recoveryMethod === 'BOTH' ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 opacity-60'}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                                                        <Shield size={16} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white">{t('notes.accountPassword', 'Account Password')}</h4>
                                                        <p className="text-[10px] text-white/40">{t('notes.useLoginPassword', 'Use your login password to reset PIN')}</p>
                                                    </div>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={config.security.recoveryMethod === 'PASSWORD' || config.security.recoveryMethod === 'BOTH'}
                                                        onChange={() => {
                                                            const current = config.security.recoveryMethod;
                                                            // Logic: 
                                                            // If PASSWORD is on (PASSWORD or BOTH), turn it off -> If BOTH then QUESTION, if PASSWORD then... user needs one.
                                                            // Let's simplify: Click to toggle this specific option.
                                                            const isPwOn = current === 'PASSWORD' || current === 'BOTH';
                                                            if (isPwOn) {
                                                                // Turn off
                                                                setConfig(p => ({...p, security: {...p.security, recoveryMethod: p.security.recoveryMethod === 'BOTH' ? 'QUESTION' : 'QUESTION'}})); // Fallback to QUESTION if forcing one
                                                            } else {
                                                                // Turn on
                                                                setConfig(p => ({...p, security: {...p.security, recoveryMethod: p.security.recoveryMethod === 'QUESTION' ? 'BOTH' : 'PASSWORD'}}));
                                                            }
                                                        }}
                                                        className="sr-only peer" 
                                                    />
                                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                                </label>
                                            </div>
                                            {(config.security.recoveryMethod === 'PASSWORD' || config.security.recoveryMethod === 'BOTH') && (
                                                 <div className="text-xs text-green-400 flex items-center gap-2 mt-2 bg-green-500/10 p-2 rounded-lg">
                                                     <Check size={12} /> Active by default
                                                 </div>
                                            )}
                                        </div>

                                        {/* Option 2: Security Question */}
                                        <div className={`p-4 rounded-2xl border transition-all ${config.security.recoveryMethod === 'QUESTION' || config.security.recoveryMethod === 'BOTH' ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 opacity-60'}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                                        <HelpCircle size={16} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-bold text-white">{t('notes.securityQuestion', 'Security Question')}</h4>
                                                        <p className="text-[10px] text-white/40">{t('notes.answerPersonalQuestion', 'Answer a personal question')}</p>
                                                    </div>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={config.security.recoveryMethod === 'QUESTION' || config.security.recoveryMethod === 'BOTH'}
                                                        onChange={() => {
                                                            const current = config.security.recoveryMethod;
                                                            const isQOn = current === 'QUESTION' || current === 'BOTH';
                                                            if (isQOn) {
                                                                setConfig(p => ({...p, security: {...p.security, recoveryMethod: p.security.recoveryMethod === 'BOTH' ? 'PASSWORD' : 'PASSWORD'}}));
                                                            } else {
                                                                setConfig(p => ({...p, security: {...p.security, recoveryMethod: p.security.recoveryMethod === 'PASSWORD' ? 'BOTH' : 'QUESTION'}}));
                                                            }
                                                        }}
                                                        className="sr-only peer" 
                                                    />
                                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                                                </label>
                                            </div>

                                            {(config.security.recoveryMethod === 'QUESTION' || config.security.recoveryMethod === 'BOTH') && (
                                                <div className="space-y-3 mt-4 animate-in fade-in slide-in-from-top-2">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Question (e.g. First pet's name?)"
                                                        value={config.security.recoveryQuestion || ''}
                                                        onChange={(e) => setConfig(p => ({...p, security: {...p.security, recoveryQuestion: e.target.value}}))}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-purple-500/50 transition-colors"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Answer"
                                                        value={config.security.recoveryAnswer || ''}
                                                        onChange={(e) => setConfig(p => ({...p, security: {...p.security, recoveryAnswer: e.target.value}}))}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-purple-500/50 transition-colors"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-[#161616]">
                            <button
                                onClick={handleSave}
                                className="w-full py-4 rounded-xl bg-white text-black font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl"
                            >
                                <Check size={18} />
                                Save Configuration
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};
