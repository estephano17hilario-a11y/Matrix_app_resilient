import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Key, FileText, CreditCard, Eye, EyeOff, Copy, Plus, Trash2, Shield, Search, ChevronRight, LogOut, ShieldAlert, Settings } from 'lucide-react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import FocusSession from '@/plugins/FocusPlugin';
import { SecurityGate } from '../../../components/ui/SecurityGate';

interface SecureItem {
    id: string;
    type: 'LOGIN' | 'NOTE' | 'CARD';
    title: string;
    value: string; // Password or Content
    secondaryValue?: string; // Username or Card Number
    category?: string;
    updatedAt: string;
}

interface SecureNotesHubProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenSettings?: () => void;
}

const PIN_LENGTH = 5;

export const SecureNotesHub = ({ isOpen, onClose, onOpenSettings }: SecureNotesHubProps) => {
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [pin, setPin] = useState('');
    const [setupPin, setSetupPin] = useState('');
    const [isSetupMode, setIsSetupMode] = useState(false);
    const [items, setItems] = useState<SecureItem[]>([]);
    const [activeTab, setActiveTab] = useState<'ALL' | 'LOGIN' | 'NOTE' | 'CARD'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<SecureItem | null>(null);
    const [isCreateMode, setIsCreateMode] = useState(false);

    // Privacy Shield (Screenshot Prevention)
    useEffect(() => {
        if (isOpen) {
            FocusSession.enablePrivacy().catch(err => console.error("Privacy Enable Failed", err));
        }
        
        return () => {
            FocusSession.disablePrivacy().catch(err => console.error("Privacy Disable Failed", err));
        };
    }, [isOpen]);

    // Load Data
    useEffect(() => {
        // Load data on every open to ensure we have latest state if updated elsewhere
        // But only if we haven't loaded yet or if we want to refresh.
        // For simplicity, let's just rely on initial load + local state.
        // Persistence is handled by effect below.
        
        // HOWEVER: The user complained about data loss.
        // This usually happens if we initialize state with empty array [], 
        // and then effect saves that empty array to localStorage, overwriting existing data.
        
        // FIX: Only save if we have loaded data OR if we explicitly know we have no data.
        // Better yet: Load synchronously or ensure we don't save empty state over existing state 
        // unless it's intentional.
        
        const savedData = localStorage.getItem('secure_vault_data');
        const savedPin = localStorage.getItem('secure_vault_pin');

        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (Array.isArray(parsed)) {
                    setItems(parsed);
                }
            } catch (e) {
                console.error("Failed to parse vault items", e);
            }
        }

        if (!savedPin) {
            setIsSetupMode(true);
        }
    }, [isOpen]); // Reload when opened to ensure fresh data

    // Save Data
    useEffect(() => {
        // PREVENT DATA LOSS: Only save if we are unlocked (meaning we successfully loaded/verified)
        // OR if we have items to save.
        // If locked and items is empty, it might mean we haven't loaded yet.
        if (isUnlocked || items.length > 0) {
            localStorage.setItem('secure_vault_data', JSON.stringify(items));
        }
    }, [items, isUnlocked]);

    const handlePinSubmit = (inputPin: string) => {
        const savedPin = localStorage.getItem('secure_vault_pin');
        
        if (isSetupMode) {
            if (setupPin) {
                // Confirming PIN
                if (inputPin === setupPin) {
                    localStorage.setItem('secure_vault_pin', inputPin);
                    setIsSetupMode(false);
                    setIsUnlocked(true);
                    setPin('');
                    setSetupPin('');
                    toast.success("Security PIN configured successfully");
                } else {
                    toast.error("PINs do not match. Try again.");
                    setPin('');
                    setSetupPin('');
                }
            } else {
                // First entry of new PIN
                setSetupPin(inputPin);
                setPin('');
            }
        } else {
            // Unlocking
            if (inputPin === savedPin) {
                setIsUnlocked(true);
                setPin('');
                toast.success("Vault Unlocked");
            } else {
                toast.error("Incorrect PIN");
                setPin('');
            }
        }
    };

    const handlePinInput = (num: string) => {
        if (pin.length < PIN_LENGTH) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === PIN_LENGTH) {
                setTimeout(() => handlePinSubmit(newPin), 300);
            }
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const handleAddItem = (newItem: SecureItem) => {
        setItems(prev => [newItem, ...prev]);
        setIsCreateMode(false);
        toast.success("Item secured");
    };

    const handleUpdateItem = (updatedItem: SecureItem) => {
        setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        setSelectedItem(null);
        toast.success("Item updated");
    };

    const handleDeleteItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
        setSelectedItem(null);
        toast.success("Item deleted");
    };

    const filteredItems = items.filter(item => {
        const matchesTab = activeTab === 'ALL' || item.type === activeTab;
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              (item.secondaryValue && item.secondaryValue.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesTab && matchesSearch;
    });

    if (!isOpen) return null;

    return createPortal(
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col font-sans"
        >
            {/* Background Ambient */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-emerald-500/5 blur-[120px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px]" />
            </div>

            {/* Header */}
            <div className="pt-safe-top px-4 md:px-6 pb-2 md:pb-6 border-b border-white/5 flex justify-between items-end h-14 md:h-28 shrink-0 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-1 md:mb-2">
                        <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <Shield size={10} className="md:w-4 md:h-4" />
                        </div>
                        <span className="text-[8px] md:text-xs font-bold text-emerald-500 uppercase tracking-widest">Secure Vault</span>
                    </div>
                    <h2 className="text-lg md:text-3xl font-black text-white tracking-tight">Passwords & Notes</h2>
                </div>
                <div className="flex items-center gap-2">
                    {onOpenSettings && isUnlocked && (
                        <button 
                            onClick={onOpenSettings}
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5 text-white/60 hover:text-white"
                        >
                            <Settings size={14} className="md:w-5 md:h-5" />
                        </button>
                    )}
                    <button 
                        onClick={onClose}
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors border border-white/5"
                    >
                        <X size={14} className="md:w-5 md:h-5" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative z-10">
                {!isUnlocked ? (
                    !isSetupMode ? (
                        <SecurityGate
                            isOpen={true}
                            pin={localStorage.getItem('secure_vault_pin') || ''}
                            onUnlock={() => {
                                setIsUnlocked(true);
                                toast.success("Vault Unlocked");
                            }}
                            onCancel={onClose}
                            title="Access Vault"
                            description="Enter your 5-digit security code."
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-4 md:p-6 animate-in fade-in zoom-in-95 duration-300">
                        <div className="mb-4 md:mb-8 relative">
                            <div className="w-12 h-12 md:w-24 md:h-24 rounded-[16px] md:rounded-[32px] bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                                <Lock className="text-white drop-shadow-md w-6 h-6 md:w-10 md:h-10" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 w-4 h-4 md:w-8 md:h-8 bg-[#111] rounded-full flex items-center justify-center border border-white/10">
                                <div className="w-1 h-1 md:w-2 md:h-2 bg-emerald-500 rounded-full animate-pulse" />
                            </div>
                        </div>

                        <h3 className="text-sm md:text-xl font-bold text-white mb-1 md:mb-2">
                            {setupPin ? "Confirm PIN" : "Create Vault PIN"}
                        </h3>
                        <p className="text-white/40 text-[10px] md:text-sm mb-4 md:mb-8 max-w-[200px] md:max-w-xs text-center leading-relaxed">
                            Set a 5-digit security code.
                        </p>

                        {/* PIN Dots */}
                        <div className="flex gap-2 md:gap-4 mb-4 md:mb-10">
                            {[...Array(PIN_LENGTH)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className={`w-2 h-2 md:w-4 md:h-4 rounded-full transition-all duration-300 ${
                                        i < pin.length 
                                            ? 'bg-emerald-500 scale-110 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
                                            : 'bg-white/10'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Numpad */}
                        <div className="grid grid-cols-3 gap-2 md:gap-4 w-full max-w-[200px] md:max-w-[280px]">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button
                                    key={num}
                                    onClick={() => handlePinInput(num.toString())}
                                    className="h-10 md:h-16 rounded-lg md:rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all text-base md:text-2xl font-medium text-white flex items-center justify-center"
                                >
                                    {num}
                                </button>
                            ))}
                            <div />
                            <button
                                onClick={() => handlePinInput('0')}
                                className="h-10 md:h-16 rounded-lg md:rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all text-base md:text-2xl font-medium text-white flex items-center justify-center"
                            >
                                0
                            </button>
                            <button
                                onClick={handleBackspace}
                                className="h-10 md:h-16 rounded-lg md:rounded-2xl bg-transparent hover:bg-white/5 text-white/40 hover:text-white flex items-center justify-center"
                            >
                                <ChevronRight className="rotate-180 w-4 h-4 md:w-6 md:h-6" />
                            </button>
                        </div>
                    </div>
                    )
                ) : (
                    <div className="h-full flex flex-col">
                        {/* Toolbar */}
                        <div className="px-6 py-4 flex gap-3 overflow-x-auto no-scrollbar border-b border-white/5">
                            {['ALL', 'LOGIN', 'NOTE', 'CARD'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                                        activeTab === tab 
                                            ? 'bg-white text-black border-white shadow-lg' 
                                            : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {tab === 'ALL' ? 'All Items' : tab}
                                </button>
                            ))}
                        </div>

                        {/* Search & Add */}
                        <div className="px-6 py-4 flex gap-3">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search vault..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/20"
                                />
                            </div>
                            <button 
                                onClick={() => setIsCreateMode(true)}
                                className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                            >
                                <Plus size={24} />
                            </button>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-3">
                            {filteredItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                                    <ShieldAlert size={48} className="mb-4 text-white/20" />
                                    <p className="text-sm font-medium">No items found</p>
                                </div>
                            ) : (
                                filteredItems.map(item => (
                                    <div 
                                        key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        className="bg-[#111] border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer group"
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                            item.type === 'LOGIN' ? 'bg-blue-500/20 text-blue-400' :
                                            item.type === 'NOTE' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-purple-500/20 text-purple-400'
                                        }`}>
                                            {item.type === 'LOGIN' ? <Key size={20} /> :
                                             item.type === 'NOTE' ? <FileText size={20} /> :
                                             <CreditCard size={20} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-bold truncate">{item.title}</h4>
                                            <p className="text-white/40 text-xs truncate">
                                                {item.type === 'LOGIN' ? item.secondaryValue || '********' : 
                                                 item.type === 'CARD' ? `•••• ${item.secondaryValue?.slice(-4) || '****'}` : 
                                                 'Secure Note'}
                                            </p>
                                        </div>
                                        <ChevronRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors" />
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {/* Lock Button Footer */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                            <button 
                                onClick={() => setIsUnlocked(false)}
                                className="flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest border border-white/5 backdrop-blur-md"
                            >
                                <LogOut size={12} />
                                Lock Vault
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {(selectedItem || isCreateMode) && (
                    <ItemDetailModal 
                        onClose={() => { setSelectedItem(null); setIsCreateMode(false); }}
                        item={selectedItem}
                        onSave={selectedItem ? handleUpdateItem : handleAddItem}
                        onDelete={selectedItem ? () => handleDeleteItem(selectedItem.id) : undefined}
                    />
                )}
            </AnimatePresence>

        </motion.div>,
        document.body
    );
};

// Sub-component for Item Details
const ItemDetailModal = ({ onClose, item, onSave, onDelete }: { 
    onClose: () => void; 
    item: SecureItem | null; 
    onSave: (item: SecureItem) => void;
    onDelete?: () => void;
}) => {
    const [title, setTitle] = useState(item?.title || '');
    const [value, setValue] = useState(item?.value || '');
    const [secondaryValue, setSecondaryValue] = useState(item?.secondaryValue || '');
    const [type, setType] = useState<SecureItem['type']>(item?.type || 'LOGIN');
    const [showValue, setShowValue] = useState(false);

    const handleSave = () => {
        if (!title) {
            toast.error("Title is required");
            return;
        }
        onSave({
            id: item?.id || Date.now().toString(),
            type,
            title,
            value,
            secondaryValue,
            updatedAt: new Date().toISOString()
        });
        onClose();
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">{item ? 'Edit Item' : 'New Secure Item'}</h3>
                    <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Type Selector */}
                    <div className="grid grid-cols-3 gap-3">
                        {['LOGIN', 'NOTE', 'CARD'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setType(t as any)}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                    type === t 
                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                        : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'
                                }`}
                            >
                                {t === 'LOGIN' ? <Key size={20} /> : t === 'NOTE' ? <FileText size={20} /> : <CreditCard size={20} />}
                                <span className="text-[10px] font-bold uppercase">{t}</span>
                            </button>
                        ))}
                    </div>

                    {/* Fields */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-white/40 uppercase ml-1">Title</label>
                            <input 
                                type="text" 
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder={type === 'LOGIN' ? 'e.g. Netflix' : type === 'CARD' ? 'e.g. Visa Gold' : 'e.g. Private Note'}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-white/30"
                            />
                        </div>

                        {type === 'LOGIN' && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-white/40 uppercase ml-1">Username / Email</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={secondaryValue}
                                        onChange={e => setSecondaryValue(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-white/30"
                                    />
                                    {secondaryValue && (
                                        <button onClick={() => copyToClipboard(secondaryValue)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/40 hover:text-white">
                                            <Copy size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-white/40 uppercase ml-1">
                                {type === 'LOGIN' ? 'Password' : type === 'CARD' ? 'Card Number' : 'Content'}
                            </label>
                            <div className="relative">
                                {type === 'NOTE' ? (
                                    <textarea 
                                        value={value}
                                        onChange={e => setValue(e.target.value)}
                                        rows={6}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-white/30 resize-none"
                                    />
                                ) : (
                                    <input 
                                        type={showValue ? "text" : "password"} 
                                        value={value}
                                        onChange={e => setValue(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pr-24 text-white focus:outline-none focus:border-white/30 font-mono"
                                    />
                                )}
                                
                                {type !== 'NOTE' && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        <button onClick={() => setShowValue(!showValue)} className="p-2 text-white/40 hover:text-white">
                                            {showValue ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                        <button onClick={() => copyToClipboard(value)} className="p-2 text-white/40 hover:text-white">
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {type === 'CARD' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-white/40 uppercase ml-1">Expiry</label>
                                    <input 
                                        type="text" 
                                        placeholder="MM/YY"
                                        value={secondaryValue}
                                        onChange={e => setSecondaryValue(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-white/30 text-center"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-white/40 uppercase ml-1">CVV</label>
                                    <input 
                                        type="text" 
                                        placeholder="123"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-white/30 text-center"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex gap-3">
                        {onDelete && (
                            <button 
                                onClick={onDelete}
                                className="p-4 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button 
                            onClick={handleSave}
                            className="flex-1 py-4 rounded-xl bg-white text-black font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
                        >
                            Save Item
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
