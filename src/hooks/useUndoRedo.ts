import { useState, useCallback, useRef } from 'react';

export interface UndoRedoAction<T> {
  type: string;
  description: string;
  undo: () => T;
  redo: () => T;
  timestamp: number;
}

export interface UndoRedoState<T> {
  canUndo: boolean;
  canRedo: boolean;
  undoStack: UndoRedoAction<T>[];
  redoStack: UndoRedoAction<T>[];
  currentState: T;
}

export const useUndoRedo = <T>(initialState: T, maxHistorySize: number = 50) => {
  const [currentState, setCurrentState] = useState<T>(initialState);
  const [undoStack, setUndoStack] = useState<UndoRedoAction<T>[]>([]);
  const [redoStack, setRedoStack] = useState<UndoRedoAction<T>[]>([]);
  
  // Keep track of the previous state for creating undo actions
  const previousStateRef = useRef<T>(initialState);

  const executeAction = useCallback((
    action: Omit<UndoRedoAction<T>, 'timestamp' | 'undo'>,
    newState: T
  ) => {
    const previousState = previousStateRef.current;
    
    const undoAction: UndoRedoAction<T> = {
      ...action,
      timestamp: Date.now(),
      undo: () => previousState,
    };

    // Add to undo stack
    setUndoStack(prev => {
      const newStack = [...prev, undoAction];
      // Limit stack size
      if (newStack.length > maxHistorySize) {
        return newStack.slice(-maxHistorySize);
      }
      return newStack;
    });

    // Clear redo stack when new action is performed
    setRedoStack([]);

    // Update state
    previousStateRef.current = currentState;
    setCurrentState(newState);
  }, [currentState, maxHistorySize]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    const actionToUndo = undoStack[undoStack.length - 1];
    const undoState = actionToUndo.undo();

    // Move action from undo to redo stack
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [
      ...prev,
      {
        ...actionToUndo,
        undo: () => currentState,
        redo: () => undoState,
      }
    ]);

    previousStateRef.current = currentState;
    setCurrentState(undoState);

    return {
      action: actionToUndo,
      newState: undoState,
    };
  }, [undoStack, currentState]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const actionToRedo = redoStack[redoStack.length - 1];
    const redoState = actionToRedo.redo();

    // Move action from redo to undo stack
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [
      ...prev,
      {
        ...actionToRedo,
        undo: () => currentState,
        redo: () => redoState,
      }
    ]);

    previousStateRef.current = currentState;
    setCurrentState(redoState);

    return {
      action: actionToRedo,
      newState: redoState,
    };
  }, [redoStack, currentState]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const getLastAction = useCallback(() => {
    return undoStack[undoStack.length - 1] || null;
  }, [undoStack]);

  const getNextRedoAction = useCallback(() => {
    return redoStack[redoStack.length - 1] || null;
  }, [redoStack]);

  // Helper function to create common actions
  const createAction = useCallback((
    type: string,
    description: string,
    newState: T
  ) => {
    executeAction({ type, description, redo: () => newState }, newState);
  }, [executeAction]);

  return {
    // Current state
    state: currentState,
    setState: setCurrentState,
    
    // Action execution
    executeAction,
    createAction,
    
    // Undo/Redo operations
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    
    // History management
    clearHistory,
    undoStack,
    redoStack,
    getLastAction,
    getNextRedoAction,
    
    // State info
    historySize: undoStack.length,
    maxHistorySize,
  };
};

// Specialized hook for array operations
export const useArrayUndoRedo = <T>(initialArray: T[], maxHistorySize: number = 50) => {
  const undoRedo = useUndoRedo(initialArray, maxHistorySize);

  const addItem = useCallback((item: T, description?: string) => {
    const newArray = [...undoRedo.state, item];
    undoRedo.createAction(
      'ADD_ITEM',
      description || `Add item`,
      newArray
    );
  }, [undoRedo]);

  const removeItem = useCallback((index: number, description?: string) => {
    const newArray = undoRedo.state.filter((_, i) => i !== index);
    undoRedo.createAction(
      'REMOVE_ITEM',
      description || `Remove item at index ${index}`,
      newArray
    );
  }, [undoRedo]);

  const updateItem = useCallback((index: number, newItem: T, description?: string) => {
    const newArray = undoRedo.state.map((item, i) => i === index ? newItem : item);
    undoRedo.createAction(
      'UPDATE_ITEM',
      description || `Update item at index ${index}`,
      newArray
    );
  }, [undoRedo]);

  const moveItem = useCallback((fromIndex: number, toIndex: number, description?: string) => {
    const newArray = [...undoRedo.state];
    const [movedItem] = newArray.splice(fromIndex, 1);
    newArray.splice(toIndex, 0, movedItem);
    undoRedo.createAction(
      'MOVE_ITEM',
      description || `Move item from ${fromIndex} to ${toIndex}`,
      newArray
    );
  }, [undoRedo]);

  const clearArray = useCallback((description?: string) => {
    undoRedo.createAction(
      'CLEAR_ARRAY',
      description || 'Clear all items',
      []
    );
  }, [undoRedo]);

  return {
    ...undoRedo,
    array: undoRedo.state,
    addItem,
    removeItem,
    updateItem,
    moveItem,
    clearArray,
  };
};

export default useUndoRedo;
