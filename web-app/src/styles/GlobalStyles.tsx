import React from 'react';

export const GlobalStyles = React.memo(() => (
  <style>{`
    :root {
      color-scheme: dark; 
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      user-select: none;
      --spring-easing: cubic-bezier(0.19, 1, 0.22, 1);
      --fluid-easing: cubic-bezier(0.32, 0.72, 0, 1);
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background: #000;
      color: white;
      overscroll-behavior-y: none;
    }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    
    .accordion-grid { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.6s var(--spring-easing); will-change: grid-template-rows; contain: content; }
    .accordion-grid.open { grid-template-rows: 1fr; }
    .accordion-inner { overflow: hidden; transform: translateZ(0); }

    .glass-panel {
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.25)), rgba(17, 17, 17, 0.7); 
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.15), 0 20px 50px -12px rgba(79, 70, 229, 0.15);
      transform: translateZ(0);
      will-change: transform;
      border-radius: 1rem;
    }

    .apple-btn {
        background: #ffffff;
        color: #000000;
        border: none;
        box-shadow: 0 0 20px rgba(255,255,255,0.1);
        transition: all 0.4s var(--spring-easing);
    }
    .apple-btn:active { transform: scale(0.96); opacity: 0.8; }
    
    .apple-input {
        background: rgba(26, 26, 26, 0.7);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 18px;
        transition: all 0.3s ease;
    }
    .apple-input:focus-within {
        background: rgba(34, 34, 34, 0.8);
        border-color: rgba(255,255,255,0.3);
        box-shadow: 0 0 0 1px rgba(255,255,255,0.1);
        transform: scale(1.01);
    }

    .trait-card {
        background: rgba(26, 26, 26, 0.7);
        border: 1px solid rgba(255,255,255,0.05);
        transition: all 0.4s var(--spring-easing);
    }
    .trait-card.selected {
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.4);
        box-shadow: 0 0 30px -5px rgba(255,255,255,0.1);
        transform: scale(1.02);
    }

    .bar-animate {
        transition: clip-path 0.6s var(--spring-easing), background-color 0.3s ease;
        will-change: clip-path;
    }
    .date-slide-enter { animation: slideInDate 0.4s var(--fluid-easing) forwards; }
    @keyframes slideInDate { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
    
    input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.6; }

    @property --angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
    @keyframes spin-aura { to { --angle: 360deg; } }
    
    .aura-container {
      position: relative; isolation: isolate; overflow: hidden;
      will-change: transform, opacity;
      box-shadow: 0 12px 30px -10px rgba(0,0,0,0.45);
      transform: translateZ(0);
    }
    .aura-container::before {
      content: ''; position: absolute; inset: 0;
      padding: 1.5px;
      border-radius: inherit;
      background: conic-gradient(from var(--angle), #3b82f6, #8b5cf6, #d946ef, #06b6d4, #3b82f6);
      animation: spin-aura 4s linear infinite; z-index: -2; 
      opacity: 0; transition: opacity 0.5s ease-in-out; will-change: opacity;
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
    }
    .aura-container::after {
      content: ''; position: absolute; inset: 2px; 
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.35)); 
      border-radius: inherit; z-index: -1;
      transition: background 0.5s ease;
      box-shadow: inset 0 0 14px rgba(255,255,255,0.04);
    }
    .aura-active::before { opacity: 1; }
    .aura-active::after { background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.45)); box-shadow: inset 0 0 16px rgba(255,255,255,0.03); } 
    .aura-active { box-shadow: 0 16px 40px -18px rgba(0,0,0,0.7); border: none; }

    .btn-orb-glow {
      position: relative; overflow: hidden;
      background: #1a1a1a; z-index: 10;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 10px 30px -5px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.1);
      transform: translateZ(0);
    }
    .btn-orb-active {
        background: rgba(0,0,0,0.2) !important;
        box-shadow: none !important;
        border-color: rgba(255,255,255,0.05) !important;
    }
    .btn-orb-glow::before {
      content: ''; position: absolute; top: 50%; left: 50%;
      width: 200%; height: 200%;
      background: conic-gradient(from 0deg, #06b6d4, transparent 40%, #ec4899, transparent 90%, #06b6d4);
      transform: translate(-50%, -50%);
      animation: orb-spin 10s linear infinite;
      z-index: -1; opacity: 0.6;
      will-change: transform;
    }
    @keyframes orb-spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }

    .animate-enter-view { animation: enterView 0.5s var(--spring-easing) forwards; will-change: transform, opacity; }
    @keyframes enterView { 0% { opacity: 0; transform: translateY(10px) scale(0.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
    .animate-modal-enter { animation: modalMagnet 0.5s var(--spring-easing) forwards; will-change: transform, opacity; }
    @keyframes modalMagnet { 0% { opacity: 0; transform: scale(0.92) translateY(20px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
    
    .ring-progress { transition: stroke-dashoffset 1s linear; will-change: stroke-dashoffset; }
    .pulse-glow { animation: pulseGlow 3s ease-in-out infinite; }
    @keyframes pulseGlow { 0%, 100% { filter: drop-shadow(0 0 10px currentColor); } 50% { filter: drop-shadow(0 0 25px currentColor); } }
    
    .editor-block:focus-within { background: rgba(255,255,255,0.03); }
    .glass-editor {
        background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0) 60%), rgba(10, 10, 12, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 12px 30px -16px rgba(0,0,0,0.65);
    }
  `}</style>
));
