import { useState } from 'react';
import { Timestamp } from '@/services/supabase';
import { StrategicNode, TimeFrame, SmartProject } from '../../../types/SmartGoal';
import { getContextDates } from '../../../utils/dateUtils';
import { generateTimeBlocks } from '../../../utils/fractalTimeEngine';

export const useSmartTaskLogic = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [rootNode, setRootNode] = useState<StrategicNode | null>(null);
  const [currentNode, setCurrentNode] = useState<StrategicNode | null>(null);
  const [history, setHistory] = useState<StrategicNode[]>([]);
  
  const [projectMeta, setProjectMeta] = useState<{ traitId?: string; traitColor?: string }>({});

  const [timeframeHierarchy, setTimeframeHierarchy] = useState<TimeFrame[]>([]);
  const [drillDownPath, setDrillDownPath] = useState<TimeFrame[]>([]);

  const getNextLevel = (currentLevel: TimeFrame): TimeFrame | null => {
    // If we have a dynamic drillDownPath, use it
    if (drillDownPath.length > 0) {
        const index = drillDownPath.indexOf(currentLevel);
        if (index === -1 || index === drillDownPath.length - 1) return null;
        return drillDownPath[index + 1];
    }

    // Fallback to static hierarchy if path not set
    const staticHierarchy: TimeFrame[] = ['10_YEARS', '5_YEARS', 'YEAR', 'SEMESTER', 'QUARTER', 'MONTH', 'WEEK', 'DAY'];
    const index = staticHierarchy.indexOf(currentLevel);
    if (index === -1 || index === staticHierarchy.length - 1) return null;
    return staticHierarchy[index + 1];
  };

  const startProcess = (mainGoal: string, traitId?: string, traitColor?: string, customStartDate?: Date, customEndDate?: Date) => {
    const now = customStartDate ? Timestamp.fromDate(customStartDate) : Timestamp.now();
    const endDate = customEndDate ? Timestamp.fromDate(customEndDate) : Timestamp.fromMillis(now.toMillis() + (365 * 24 * 60 * 60 * 1000));
    
    setProjectMeta({ traitId, traitColor });

    // Calculate Fractal Structure
    const { drillDownPath } = generateTimeBlocks(now.toDate(), endDate.toDate());
    
    // Cast TimeUnit to TimeFrame
    const mappedPath: TimeFrame[] = drillDownPath.map(u => {
        if (u === '1_YEAR') return 'YEAR';
        return u as TimeFrame;
    });

    // If path is empty (e.g. < 1 day), default to DAY
    const finalPath: TimeFrame[] = mappedPath.length > 0 ? mappedPath : ['DAY'];
    
    // ADJUSTMENT FOR ROOT LEVEL:
    const staticHierarchy: TimeFrame[] = ['10_YEARS', '5_YEARS', 'YEAR', 'SEMESTER', 'QUARTER', 'MONTH', 'WEEK', 'DAY'];
    let startLevel = finalPath[0];
    
    // Find the level strictly above the startLevel
    const startIndex = staticHierarchy.indexOf(startLevel);
    if (startIndex > 0) {
        startLevel = staticHierarchy[startIndex - 1];
        finalPath.unshift(startLevel);
    } else {
        // Already at top (10_YEARS)
    }

    setDrillDownPath(finalPath);
    setTimeframeHierarchy(finalPath); 

    // FORCE START DATE TO JAN 1st IF YEAR OR HIGHER (CALENDAR ALIGNMENT)
    // User Request: "quiero que la division de 3 meses parta desde enero siempre"
    let adjustedStartDate = now.toDate();
    let adjustedEndDate = endDate.toDate();

    if (startLevel === 'YEAR' || startLevel === '5_YEARS' || startLevel === '10_YEARS') {
        // Reset to Jan 1st of the start year
        adjustedStartDate.setMonth(0, 1);
        adjustedStartDate.setHours(0, 0, 0, 0);
        
        // If duration is roughly 1 year (300-400 days), align End to Dec 31
        const durationDays = (endDate.toMillis() - now.toMillis()) / (1000 * 60 * 60 * 24);
        if (durationDays > 300 && durationDays < 400) {
             adjustedEndDate = new Date(adjustedStartDate.getFullYear(), 11, 31, 23, 59, 59);
        }
    }

    const root: StrategicNode = {
      id: crypto.randomUUID(),
      title: mainGoal,
      level: startLevel,
      startDate: Timestamp.fromDate(adjustedStartDate),
      dueDate: Timestamp.fromDate(adjustedEndDate),
      isCompleted: false,
      reward: { xp: 200, coins: 150 },
      children: [],
      placeholder: false,
    };
    setRootNode(root);
    setCurrentNode(root);
    setHistory([root]);
    setCurrentStep(0);
  };

  const submitAnswer = (answers: (string | { title: string, startDate?: Date, endDate?: Date })[]) => {
    if (!currentNode) return;

    const nextLevel = getNextLevel(currentNode.level);
    if (!nextLevel) return;
    
    // Get start date from current node (default to now if missing)
    const currentStart = currentNode.startDate ? currentNode.startDate.toDate() : new Date();
    // Get end date from current node (default to start + 1 year if missing)
    const currentEnd = currentNode.dueDate ? currentNode.dueDate.toDate() : new Date(currentStart.getTime() + 31536000000);

    const newChildren: StrategicNode[] = answers.map((answer, index) => {
        const title = typeof answer === 'string' ? answer : answer.title;
        const customStart = typeof answer !== 'string' ? answer.startDate : undefined;
        const customEnd = typeof answer !== 'string' ? answer.endDate : undefined;

        // Calculate dates for this child based on parent context and index
        // UPDATED: Passing parentEnd and totalChildren for robust logic
        const { start, end } = getContextDates(currentStart, currentEnd, currentNode.level, index, answers.length);
        
        const finalStart = customStart || start;
        const finalEnd = customEnd || end;
        
        return {
          id: crypto.randomUUID(),
          title: title,
          level: nextLevel,
          startDate: Timestamp.fromDate(finalStart),
          dueDate: Timestamp.fromDate(finalEnd),
          isCompleted: false,
          // FIXED: User requested "Hard" difficulty rewards for all smart tasks
          // Matches 'A' difficulty in rewardCalculator.ts
          reward: { xp: 40, coins: 25 },
          parentId: currentNode.id,
          children: [],
          placeholder: false,
        };
    });

    const updatedCurrentNode = { ...currentNode, children: newChildren };
    
    const updateTree = (node: StrategicNode, targetId: string, updatedNode: StrategicNode): StrategicNode => {
      if (node.id === targetId) return updatedNode;
      return {
        ...node,
        children: node.children.map(child => updateTree(child, targetId, updatedNode))
      };
    };

    if (rootNode) {
        const newRoot = updateTree(rootNode, currentNode.id, updatedCurrentNode);
        setRootNode(newRoot);
        
        if (newChildren.length > 0 && nextLevel !== 'DAY') {
             const firstChild = newChildren[0];
             setCurrentNode(firstChild);
             setHistory([...history, firstChild]);
             setCurrentStep(prev => prev + 1);
        } else {
             setCurrentStep(prev => prev + 1);
        }
    }
  };

  const goBack = () => {
      if (history.length > 1) {
          const newHistory = [...history];
          newHistory.pop();
          setHistory(newHistory);
          setCurrentNode(newHistory[newHistory.length - 1]);
          setCurrentStep(prev => prev - 1);
      }
  };

  const jumpToLevel = (level: TimeFrame) => {
    if (!currentNode || currentNode.level === level) return;

    // Find the node in history that corresponds to this level
    // History stores the path taken.
    // e.g. [YearNode, SemesterNode, QuarterNode]
    // If we are at Month (not in history yet) and want to go to Semester:
    // We need to find SemesterNode in history.
    
    const targetIndex = history.findIndex(node => node.level === level);
    
    if (targetIndex !== -1) {
        // We found it in history, so we are going back
        const targetNode = history[targetIndex];
        
        // Reset history to up to that point (inclusive)
        const newHistory = history.slice(0, targetIndex + 1);
        setHistory(newHistory);
        setCurrentNode(targetNode);
        
        // Update step index based on hierarchy
        const newStepIndex = timeframeHierarchy.indexOf(level);
        setCurrentStep(newStepIndex);
        return;
    }
  };

  const generateProject = (): SmartProject | null => {
      if (!rootNode) return null;
      return {
          id: crypto.randomUUID(),
          mainGoal: rootNode.title,
          totalTimeframe: rootNode.level,
          rootNode: rootNode,
          createdAt: Timestamp.now(),
          status: 'ACTIVE',
          traitId: projectMeta.traitId,
          traitColor: projectMeta.traitColor
      };
  };

  return {
    currentStep,
    currentNode,
    rootNode,
    startProcess,
    submitAnswer,
    goBack,
    jumpToLevel,
    generateProject,
    history,
    timeframeHierarchy,
    projectMeta
  };
};
