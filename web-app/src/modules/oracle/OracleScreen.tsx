import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Brain } from 'lucide-react';
import { sendMessage, AIMessage } from '../../services/aiService';
import { useTranslation } from 'react-i18next';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- COMPONENTS ---

// 1. The Void Background (Aurora System - Optimized for Mobile)
const TheVoid = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#020204]">
    {/* Orbs - Replaced heavy blur with radial gradients */}
    <motion.div 
      animate={{ 
        scale: [1, 1.2, 1],
        rotate: [0, 90, 0],
        opacity: [0.3, 0.4, 0.3]
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute top-[-20%] left-[-10%] w-[100vw] h-[100vw] rounded-full"
      style={{ 
        background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
        transform: 'translateZ(0)'
      }}
    />
    <motion.div 
      animate={{ 
        scale: [1, 1.1, 1],
        x: [0, 100, 0],
        opacity: [0.2, 0.3, 0.2]
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      className="absolute bottom-[-10%] right-[-20%] w-[80vw] h-[80vw] rounded-full"
      style={{ 
        background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
        transform: 'translateZ(0)'
      }}
    />
    <motion.div 
      animate={{ 
        scale: [1, 1.3, 1],
        y: [0, -50, 0],
        opacity: [0.15, 0.25, 0.15]
      }}
      transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      className="absolute top-[40%] left-[30%] w-[60vw] h-[60vw] rounded-full"
      style={{ 
        background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)',
        transform: 'translateZ(0)'
      }}
    />
  </div>
);

// 2. Chat Bubble (Hyper-Glass - Optimized)
const ChatBubble = ({ message }: { message: AIMessage }) => {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex w-full mb-6",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "relative max-w-[80%] p-4 rounded-2xl backdrop-blur-md border", // Reduced blur from xl to md
        isUser 
          ? "bg-indigo-500/20 border-indigo-500/30 text-white rounded-br-sm" 
          : "bg-gray-900/60 border-white/10 text-white/90 rounded-bl-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
      )}>
        {/* Glow Shadow for Assistant - Reduced opacity */}
        {!isUser && (
          <div className="absolute inset-0 rounded-2xl shadow-[0_20px_50px_-12px_rgba(79,70,229,0.1)] pointer-events-none" />
        )}
        
        <p className="relative z-10 text-base leading-relaxed font-light tracking-wide whitespace-pre-wrap">
          {message.content}
        </p>
        
        <span className="text-[10px] text-white/40 mt-2 block font-mono uppercase tracking-widest">
          {isUser ? t('oracle.userLabel') : t('oracle.systemLabel')}
        </span>
      </div>
    </motion.div>
  );
};

// 3. Input Field (Liquid Bar)
const InputField = ({ onSend, isLoading }: { onSend: (text: string) => void, isLoading: boolean }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;
    onSend(text);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 blur"></div>
        <div className="relative flex items-center bg-gray-900/60 backdrop-blur-md rounded-full border border-white/10 p-2 shadow-2xl">
          
          <div className="pl-4 pr-2">
            <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>

          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('oracle.placeholder')}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/30 font-light px-4 py-2"
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={!text.trim() || isLoading}
            className={cn(
              "p-3 rounded-full transition-all duration-300",
              text.trim() && !isLoading
                ? "bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:scale-105 active:scale-95" 
                : "bg-white/5 text-white/20 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default function OracleScreen() {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      role: 'assistant',
      content: 'I am the Oracle. The Matrix is connected. How may I assist you, Operator?',
      timestamp: Date.now()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    const userMsg: AIMessage = { role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await sendMessage(text, messages);
      const aiMsg: AIMessage = { 
        role: 'assistant', 
        content: response.text, 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Oracle Error:", error);
      const errorMsg: AIMessage = {
        role: 'assistant',
        content: "Connection to the Intelligence Core interrupted.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans text-white">
      <TheVoid />
      
      {/* Header */}
      <header className="relative z-10 p-6 flex items-center justify-between border-b border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Oracle</h1>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-white/50">ONLINE // V.2.0.4</span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="relative z-10 flex-1 overflow-y-auto p-6 pb-32 scrollbar-hide">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode='popLayout'>
            {messages.map((msg, idx) => (
              <ChatBubble key={msg.timestamp + idx} message={msg} />
            ))}
          </AnimatePresence>
          <div ref={scrollRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="relative z-20 p-6 pb-8 backdrop-blur-lg border-t border-white/5">
        <InputField onSend={handleSend} isLoading={isLoading} />
      </footer>
    </div>
  );
}
