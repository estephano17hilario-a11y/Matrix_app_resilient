import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { StrategicNode, TimeFrame, SmartProject } from '../../../types/SmartGoal';

export const useSmartTaskLogic = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [rootNode, setRootNode] = useState<StrategicNode | null>(null);
  const [currentNode, setCurrentNode] = useState<StrategicNode | null>(null);
  const [history, setHistory] = useState<StrategicNode[]>([]);
  
  const timeframeHierarchy: TimeFrame[] = ['YEAR', 'SEMESTER', 'MONTH', 'WEEK', 'DAY'];

  const getNextLevel = (currentLevel: TimeFrame): TimeFrame | null => {
    const index = timeframeHierarchy.indexOf(currentLevel);
    if (index === -1 || index === timeframeHierarchy.length - 1) return null;
    return timeframeHierarchy[index + 1];
  };

  const startProcess = (mainGoal: string) => {
    const root: StrategicNode = {
      id: crypto.randomUUID(),
      title: mainGoal,
      level: 'YEAR', // Always start with Year for this flow
      dueDate: Timestamp.now(),
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

    // Determine next level using the helper
    const nextLevel = getNextLevel(currentNode.level);
    if (!nextLevel) return;
    
    const newChildren: StrategicNode[] = answers.map((answer, index) => ({
      id: crypto.randomUUID(),
      title: answer,
      level: nextLevel,
      dueDate: Timestamp.now(),
      isCompleted: false,
      reward: { xp: 500 / (index + 1), coins: 100 },
      parentId: currentNode.id,
      children: [],
      placeholder: false,
    }));

    // Update the current node with these children
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
        
        // Drill Down Logic
        // We only drill down if we haven't reached the leaf nodes (DAY)
        // AND we have children to drill into.
        if (newChildren.length > 0 && nextLevel !== 'DAY') {
             // Drill down into the FIRST child
             const firstChild = newChildren[0];
             setCurrentNode(firstChild);
             setHistory([...history, firstChild]);
             setCurrentStep(prev => prev + 1);
        } else {
             // We reached the bottom (Days defined) or no children.
             // Increment step to signal completion in the UI.
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
    generateProject,
    history
  };
};
