import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { DefaultAvatar } from './ChatUI';
import { ASSISTANT_NAME_MAX, cleanAssistantName, getAssistantName, setAssistantName } from './coachIdentity';

/** Settings row: rename the coach who writes your chat-style messages. */
export const AssistantNameField = () => {
  const [value, setValue] = useState(getAssistantName);
  const clean = cleanAssistantName(value);
  const dirty = clean !== getAssistantName();

  const save = () => {
    if (clean.length < 2) return;
    setAssistantName(clean);
    toast.success(`Tu coach ahora se llama ${clean}`);
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
      <DefaultAvatar size={42} />
      <div className="min-w-0 flex-1">
        <label htmlFor="settings-assistant-name" className="block text-[11px] font-black uppercase tracking-wider text-emerald-300/80">
          Nombre de tu coach
        </label>
        <input
          id="settings-assistant-name"
          value={value}
          maxLength={ASSISTANT_NAME_MAX}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); }}
          className="mt-0.5 w-full bg-transparent text-[15px] font-bold text-white outline-none placeholder:text-white/25"
          placeholder="Ej: Nova"
        />
      </div>
      <button
        type="button"
        onClick={save}
        disabled={!dirty || clean.length < 2}
        className="shrink-0 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-black transition-opacity disabled:opacity-30 active:scale-95"
      >
        Guardar
      </button>
    </div>
  );
};
