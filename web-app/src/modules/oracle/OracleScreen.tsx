import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Lock, Sparkles, X } from 'lucide-react';
import { useMatrix } from '../../context/MatrixContext';
import { sendMessageToOracle, OracleMessage } from '../../services/aiService';
import { useTokenLimit } from '../../hooks/useTokenLimit';

// --- HOOK: TYPEWRITER EFFECT ---
const useTypewriter = (text: string, speed: number = 30) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        setDisplayedText('');
        setIsTyping(true);
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                setDisplayedText((prev) => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(timer);
                setIsTyping(false);
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed]);

    return { displayedText, isTyping };
};

// --- COMPONENT: ORACLE MESSAGE BUBBLE ---
const MessageBubble = ({ message }: { message: OracleMessage }) => {
    const isUser = message.role === 'user';
    // Only stream the LAST message if it's from assistant
    // Ideally we'd pass a prop "shouldStream"
    // For simplicity, we'll just render text directly for history, 
    // but the main screen logic handles the streaming for the *newest* message.
    // Actually, let's just render full text here. The streaming happens in the main input area or we only stream the *latest* assistant message.
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}
        >
            <div 
                className={`
                    relative max-w-[85%] p-5 rounded-2xl border backdrop-blur-xl
                    ${isUser 
                        ? 'bg-slate-800/60 border-slate-600/30 text-slate-100 rounded-tr-sm' 
                        : 'bg-indigo-900/20 border-indigo-500/20 text-indigo-100 rounded-tl-sm shadow-[0_0_30px_rgba(79,70,229,0.1)]'
                    }
                `}
            >
                <p className="text-sm font-light leading-relaxed tracking-wide">
                    {message.content}
                </p>
                <span className="text-[10px] opacity-40 absolute bottom-1 right-3 font-mono">
                    {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
            </div>
        </motion.div>
    );
};

// --- COMPONENT: THE EYE (ORB) ---
const OracleOrb = ({ isThinking }: { isThinking: boolean }) => {
    return (
        <div className="relative flex items-center justify-center w-64 h-64 mb-8 pointer-events-none">
            {/* Core */}
            <motion.div
                animate={{ 
                    scale: isThinking ? [1, 1.2, 1] : [1, 1.05, 1],
                    filter: isThinking ? "hue-rotate(90deg)" : "hue-rotate(0deg)" 
                }}
                transition={{ duration: isThinking ? 1.5 : 4, repeat: Infinity }}
                className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 blur-xl opacity-60"
            />
            {/* Inner Light */}
            <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute w-24 h-24 bg-white rounded-full blur-2xl opacity-40 mix-blend-overlay"
            />
            {/* Rings */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute w-48 h-48 border border-white/10 rounded-full"
            />
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute w-56 h-56 border border-white/5 rounded-full border-dashed"
            />
        </div>
    );
};

// --- MAIN SCREEN ---
export const OracleScreen = ({ onClose }: { onClose: () => void }) => {
    const { user } = useMatrix();
    const { remaining, isLimitReached, consumeToken } = useTokenLimit(false); // Assume free tier for now
    
    const [messages, setMessages] = useState<OracleMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    // Initial Greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 'init',
                role: 'assistant',
                content: `Saludos, ${user?.preferences?.archetype || 'Viajero'}. El Oráculo está en línea. ¿Qué perturba tu mente hoy?`,
                timestamp: Date.now()
            }]);
        }
    }, []);

    const handleSend = async () => {
        if (!inputValue.trim() || isThinking) return;
        
        if (isLimitReached) {
            // Shake effect or toast could go here
            return;
        }

        const userMsg: OracleMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsThinking(true);
        
        // Consume token
        if (!consumeToken()) {
            setIsThinking(false);
            return;
        }

        // Prepare context
        const context = {
            hp: user?.stats.hp || 100,
            xp: user?.stats.xp || 0,
            level: user?.stats.level || 1,
            streak: user?.currentStreak || 0,
            archetype: user?.preferences.archetype,
            weakness: user?.preferences.weakness
        };

        try {
            const responseText = await sendMessageToOracle(userMsg.content, context, messages);
            
            const aiMsg: OracleMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: responseText,
                timestamp: Date.now()
            };
            
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            // Error handled in service, but we need to stop thinking state
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex flex-col bg-[#020204]/95 backdrop-blur-xl"
        >
            {/* HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <Sparkles size={18} className="text-cyan-400" />
                    <span className="text-sm font-bold tracking-widest text-white uppercase">The Oracle</span>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 transition-colors rounded-full hover:bg-white/10 text-white/50 hover:text-white"
                >
                    <X size={20} />
                </button>
            </div>

            {/* MAIN CONTENT */}
            <div className="relative flex flex-col flex-1 overflow-hidden">
                
                {/* Background Atmosphere */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px] animate-pulse-slow" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-900/10 rounded-full blur-[100px]" />
                </div>

                {/* Messages Area */}
                <div className="relative z-10 flex-1 px-4 overflow-y-auto scroll-smooth">
                    <div className="flex flex-col items-center justify-start min-h-full py-8 max-w-2xl mx-auto w-full">
                        
                        {/* The Orb is always visible at top, shrinks when chat grows? 
                            Or maybe it stays in background? 
                            Let's put it at the top as a header graphic that scrolls away. 
                        */}
                        <div className="shrink-0">
                            <OracleOrb isThinking={isThinking} />
                        </div>

                        <AnimatePresence mode="popLayout">
                            {messages.map((msg) => (
                                <MessageBubble key={msg.id} message={msg} />
                            ))}
                            
                            {isThinking && (
                                <motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }}
                                    className="self-start ml-4 mb-4 text-cyan-400/50 text-xs font-mono animate-pulse"
                                >
                                    ACCESSING NEURAL LINK...
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </div>

                {/* INPUT AREA */}
                <div className="relative z-20 w-full px-4 pb-8 pt-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                    <div className="max-w-2xl mx-auto">
                        
                        {/* Token Limit Indicator */}
                        <div className="flex justify-between items-center px-4 mb-2 text-[10px] font-mono tracking-wider text-white/30">
                            <span>NEURAL BANDWIDTH</span>
                            <span className={remaining === 0 ? "text-red-400" : "text-cyan-400"}>
                                {remaining} / 5 SIGNALS REMAINING
                            </span>
                        </div>

                        <div className="relative group">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                disabled={isLimitReached || isThinking}
                                placeholder={isLimitReached ? "LINK SEVERED. RECHARGE REQUIRED." : "Consult the Oracle..."}
                                className={`
                                    w-full h-14 pl-6 pr-14 rounded-full 
                                    bg-white/5 border border-white/10 
                                    text-white placeholder:text-white/20
                                    focus:outline-none focus:bg-white/10 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50
                                    transition-all duration-300
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                `}
                            />
                            
                            <button
                                onClick={handleSend}
                                disabled={!inputValue.trim() || isLimitReached || isThinking}
                                className={`
                                    absolute right-2 top-2 w-10 h-10 rounded-full flex items-center justify-center
                                    transition-all duration-300
                                    ${inputValue.trim() && !isLimitReached
                                        ? 'bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95' 
                                        : 'bg-white/5 text-white/10 cursor-not-allowed'
                                    }
                                `}
                            >
                                {isLimitReached ? <Lock size={16} /> : <Send size={18} />}
                            </button>
                        </div>
                        
                        {isLimitReached && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 p-4 rounded-xl border border-red-500/20 bg-red-900/10 text-center"
                            >
                                <p className="text-red-200 text-xs font-medium">Neural Link Overheated</p>
                                <p className="text-white/40 text-[10px] mt-1">Upgrade to Matrix PRO to restore connection immediately.</p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
