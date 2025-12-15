import { useState, useCallback, useRef, useEffect } from 'react';
import { doc, updateDoc, db } from '../../../firebase';
import { Subtask } from '../../../types';
import { useMatrix } from '../../../context/MatrixContext';

export const useSubtasks = (taskId: string, initialSubtasks: Subtask[] = []) => {
  const { user } = useMatrix();
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialSubtasks);
  
  // Debounce ref to prevent excessive writes
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Keep track of latest subtasks state for the debounced save
  const latestSubtasksRef = useRef(subtasks);

  useEffect(() => {
    latestSubtasksRef.current = subtasks;
  }, [subtasks]);

  const saveToFirestore = useCallback(async (newSubtasks: Subtask[]) => {
    if (!user?.uid || !taskId) return;

    // Clear existing timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Debounce write (500ms)
    debounceTimeout.current = setTimeout(async () => {
      try {
        const taskRef = doc(db, 'users', user.uid, 'quests', taskId);
        await updateDoc(taskRef, {
          subtasks: newSubtasks
        });
        console.log('Subtasks synced to Firestore');
      } catch (error) {
        console.error('Error syncing subtasks:', error);
        // Optionally revert local state or show error
      }
    }, 1000); // 1 second debounce to be safe
  }, [user?.uid, taskId]);

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
