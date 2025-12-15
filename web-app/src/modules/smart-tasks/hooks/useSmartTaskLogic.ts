import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { StrategicNode, TimeFrame, SmartProject } from '../../../types/SmartGoal';
import { getContextDates } from '../../../utils/dateUtils';

export const useSmartTaskLogic = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [rootNode, setRootNode] = useState<StrategicNode | null>(null);
  const [currentNode, setCurrentNode] = useState<StrategicNode | null>(null);
  const [history, setHistory] = useState<StrategicNode[]>([]);
  
  const timeframeHierarchy: TimeFrame[] = ['YEAR', 'SEMESTER', 'QUARTER', 'MONTH', 'WEEK', 'DAY'];

  const getNextLevel = (currentLevel: TimeFrame): TimeFrame | null => {
    const index = timeframeHierarchy.indexOf(currentLevel);
    if (index === -1 || index === timeframeHierarchy.length - 1) return null;
    return timeframeHierarchy[index + 1];
  };

  const startProcess = (mainGoal: string) => {
    const now = Timestamp.now();
    const root: StrategicNode = {
      id: crypto.randomUUID(),
      title: mainGoal,
      level: 'YEAR',
      startDate: now,
      dueDate: Timestamp.fromMillis(now.toMillis() + (365 * 24 * 60 * 60 * 1000)), // Approx 1 year
      isCompleted: false,
      reward: { xp: 1000, coins: 500 },
      children: [],
      placeholder: false,
    };
    setRootNode(root);
    setCurrentNode(root);
    setHistory([root]);
    setCurrentStep(0);
  };

  const submitAnswer = (answers: string[]) => {
    if (!currentNode) return;

    const nextLevel = getNextLevel(currentNode.level);
    if (!nextLevel) return;
    
    // Get start date from current node (default to now if missing)
    const currentStart = currentNode.startDate ? currentNode.startDate.toDate() : new Date();

    const newChildren: StrategicNode[] = answers.map((answer, index) => {
        // Calculate dates for this child based on parent context and index
        const { start, end } = getContextDates(currentStart, currentNode.level, index);
        
        return {
          id: crypto.randomUUID(),
          title: answer,
          level: nextLevel,
          startDate: Timestamp.fromDate(start),
          dueDate: Timestamp.fromDate(end),
          isCompleted: false,
          reward: { xp: 500 / (index + 1), coins: 100 },
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
          status: 'ACTIVE'
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
    timeframeHierarchy
  };
};
