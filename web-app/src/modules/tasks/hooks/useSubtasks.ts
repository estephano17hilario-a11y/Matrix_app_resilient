import { useState, useCallback, useRef, useEffect } from 'react';
import { doc, updateDoc, db } from '../../../services/firebase';
import { Subtask } from '../../../types';
import { useLux } from '@/context/LuxContext';

export const useSubtasks = (taskId: string, initialSubtasks: Subtask[] = []) => {
  const { user } = useLux();
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const latestSubtasksRef = useRef(subtasks);

  const areSubtasksEqual = useCallback((a: Subtask[], b: Subtask[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      const left = a[i];
      const right = b[i];
      if (!right) return false;
      if (left.id !== right.id) return false;
      if (left.title !== right.title) return false;
      if (left.isCompleted !== right.isCompleted) return false;
      if (left.createdAt !== right.createdAt) return false;
    }
    return true;
  }, []);

  useEffect(() => {
    if (!areSubtasksEqual(initialSubtasks, latestSubtasksRef.current)) {
      setSubtasks(initialSubtasks);
    }
  }, [initialSubtasks, areSubtasksEqual]);

  useEffect(() => {
    latestSubtasksRef.current = subtasks;
  }, [subtasks]);

  const saveImmediate = useCallback(async (newSubtasks: Subtask[]) => {
    if (!user?.uid || !taskId) return;

    try {
      const taskRef = doc(db, 'users', user.uid, 'quests', taskId);
      await updateDoc(taskRef, {
        subtasks: newSubtasks
      });
    } catch (error) {
      console.error('Error syncing subtasks:', error);
    }
  }, [user?.uid, taskId]);

  const saveToFirestore = useCallback((newSubtasks: Subtask[]) => {
    if (!user?.uid || !taskId) return;
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      void saveImmediate(newSubtasks);
    }, 500);
  }, [user?.uid, taskId, saveImmediate]);

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      void saveImmediate(latestSubtasksRef.current);
    };
  }, [saveImmediate]);

  const addSubtask = useCallback((title: string) => {
    const newSubtask: Subtask = {
      id: crypto.randomUUID(),
      title,
      isCompleted: false,
      createdAt: Date.now()
    };

    setSubtasks(prev => {
      const updated = [...prev, newSubtask];
      saveToFirestore(updated);
      return updated;
    });
  }, [saveToFirestore]);

  const toggleSubtask = useCallback((subtaskId: string) => {
    setSubtasks(prev => {
      const updated = prev.map(t => 
        t.id === subtaskId ? { ...t, isCompleted: !t.isCompleted } : t
      );
      saveToFirestore(updated);
      return updated;
    });
  }, [saveToFirestore]);

  const deleteSubtask = useCallback((subtaskId: string) => {
    setSubtasks(prev => {
      const updated = prev.filter(t => t.id !== subtaskId);
      saveToFirestore(updated);
      return updated;
    });
  }, [saveToFirestore]);

  const reorderSubtasks = useCallback((newOrder: Subtask[]) => {
    setSubtasks(newOrder);
    saveToFirestore(newOrder);
  }, [saveToFirestore]);

  return {
    subtasks,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    reorderSubtasks
  };
};
