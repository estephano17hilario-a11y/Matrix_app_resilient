import { Timestamp } from 'firebase/firestore';

export type TimeFrame = '10_YEARS' | '5_YEARS' | 'YEAR' | 'SEMESTER' | 'QUARTER' | 'MONTH' | 'WEEK' | 'DAY';

export interface StrategicNode {
  id: string;
  title: string;
  level: TimeFrame;
  startDate?: Timestamp;
  dueDate: Timestamp;
  isCompleted: boolean;
  reward: { xp: number; coins: number };
  parentId?: string;
  children: StrategicNode[];
  placeholder?: boolean;
}

export interface SmartProject {
  id: string;
  mainGoal: string;
  totalTimeframe: string;
  rootNode: StrategicNode;
  createdAt: Timestamp;
  status: 'ACTIVE' | 'COMPLETED';
  traitId?: string;
  traitColor?: string;
}
