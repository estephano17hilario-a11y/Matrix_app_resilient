import { NoteBlueprint, NoteBlock } from '../types';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const createBlock = (type: 'text' | 'check' | 'image', content: string, checked: boolean = false): NoteBlock => ({
  id: generateId(),
  type,
  content,
  checked
});

const morningProtocolBlocks: NoteBlock[] = [
  createBlock('text', '# 🌅 The Morning Protocol'),
  createBlock('check', 'Hydrate (500ml water)'),
  createBlock('check', 'Movement / 5min Stretch'),
  createBlock('check', 'Morning Sunlight'),
  createBlock('text', '## 🙏 Gratitude'),
  createBlock('text', '1. '),
  createBlock('text', '2. '),
  createBlock('text', '3. '),
  createBlock('text', '## ⚔️ Daily Intention'),
  createBlock('text', 'Today, I will focus on...')
];

const deepWorkBlocks: NoteBlock[] = [
  createBlock('text', '# 🧠 Deep Work Session'),
  createBlock('text', '## 🎯 Primary Objective'),
  createBlock('text', ''),
  createBlock('text', '## ⏳ Time Block'),
  createBlock('text', 'Start: '),
  createBlock('text', 'End: '),
  createBlock('text', '## 🛡️ Distraction Protocols'),
  createBlock('check', 'Phone in another room / DND'),
  createBlock('check', 'Slack/Email closed'),
  createBlock('check', 'Music/Binaural Beats ready')
];

const meetingIntelBlocks: NoteBlock[] = [
  createBlock('text', '# 🤝 Meeting Intel'),
  createBlock('text', '## 📅 Details'),
  createBlock('text', 'Topic: '),
  createBlock('text', 'Attendees: '),
  createBlock('text', '## 📝 Agenda'),
  createBlock('check', 'Review previous action items'),
  createBlock('check', 'Discuss current blockers'),
  createBlock('text', '## ✅ Action Items'),
  createBlock('check', '[WHO] will do [WHAT] by [WHEN]')
];

export const defaultBlueprints: NoteBlueprint[] = [
  {
    id: 'system_morning_protocol',
    name: 'Morning Protocol',
    icon: '🌅',
    content: JSON.stringify(morningProtocolBlocks),
    category: 'SYSTEM',
    accentColor: 'from-amber-400 to-orange-500'
  },
  {
    id: 'system_deep_work',
    name: 'Deep Work Session',
    icon: '🧠',
    content: JSON.stringify(deepWorkBlocks),
    category: 'SYSTEM',
    accentColor: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'system_meeting_intel',
    name: 'Meeting Intel',
    icon: '🤝',
    content: JSON.stringify(meetingIntelBlocks),
    category: 'SYSTEM',
    accentColor: 'from-emerald-400 to-teal-500'
  }
];
