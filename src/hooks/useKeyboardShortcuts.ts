import { useEffect, useCallback } from 'react';

interface KeyboardShortcuts {
  onPlayPause?: () => void;
  onStop?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onMute?: () => void;
  onSearch?: () => void;
  onAdvancedSearch?: () => void;
  onSmartPlaylists?: () => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onExtractSelected?: () => void;
  onWildCard?: () => void;
  onToggleSidebar?: () => void;
  onRefreshLibrary?: () => void;
  onSavePlaylist?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const { ctrlKey, shiftKey, altKey, key, code } = event;

    // Media controls
    if (key === ' ' || key === 'Spacebar') {
      event.preventDefault();
      shortcuts.onPlayPause?.();
      return;
    }

    if (key === 'Escape') {
      event.preventDefault();
      shortcuts.onStop?.();
      return;
    }

    if (key === 'ArrowRight' && !ctrlKey && !shiftKey && !altKey) {
      event.preventDefault();
      shortcuts.onNext?.();
      return;
    }

    if (key === 'ArrowLeft' && !ctrlKey && !shiftKey && !altKey) {
      event.preventDefault();
      shortcuts.onPrevious?.();
      return;
    }

    if (key === 'ArrowUp' && !ctrlKey && !shiftKey && !altKey) {
      event.preventDefault();
      shortcuts.onVolumeUp?.();
      return;
    }

    if (key === 'ArrowDown' && !ctrlKey && !shiftKey && !altKey) {
      event.preventDefault();
      shortcuts.onVolumeDown?.();
      return;
    }

    if (key === 'm' || key === 'M') {
      event.preventDefault();
      shortcuts.onMute?.();
      return;
    }

    // Search and navigation
    if (ctrlKey && key === 'f') {
      event.preventDefault();
      shortcuts.onSearch?.();
      return;
    }

    if (ctrlKey && shiftKey && key === 'F') {
      event.preventDefault();
      shortcuts.onAdvancedSearch?.();
      return;
    }

    if (ctrlKey && key === 'p') {
      event.preventDefault();
      shortcuts.onSmartPlaylists?.();
      return;
    }

    // Selection
    if (ctrlKey && key === 'a') {
      event.preventDefault();
      shortcuts.onSelectAll?.();
      return;
    }

    if (key === 'Delete' || key === 'Backspace') {
      if (!ctrlKey && !shiftKey && !altKey) {
        event.preventDefault();
        shortcuts.onClearSelection?.();
        return;
      }
    }

    // Actions
    if (ctrlKey && key === 'e') {
      event.preventDefault();
      shortcuts.onExtractSelected?.();
      return;
    }

    if (ctrlKey && key === 'r') {
      event.preventDefault();
      shortcuts.onWildCard?.();
      return;
    }

    if (ctrlKey && key === 'b') {
      event.preventDefault();
      shortcuts.onToggleSidebar?.();
      return;
    }

    if (key === 'F5' || (ctrlKey && key === 'r' && shiftKey)) {
      event.preventDefault();
      shortcuts.onRefreshLibrary?.();
      return;
    }

    if (ctrlKey && key === 's') {
      event.preventDefault();
      shortcuts.onSavePlaylist?.();
      return;
    }

    // Undo/Redo
    if (ctrlKey && key === 'z' && !shiftKey) {
      event.preventDefault();
      shortcuts.onUndo?.();
      return;
    }

    if (ctrlKey && (key === 'y' || (key === 'z' && shiftKey))) {
      event.preventDefault();
      shortcuts.onRedo?.();
      return;
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};

// Helper function to get shortcut descriptions for tooltips
export const getShortcutDescription = (action: string): string => {
  const shortcuts: Record<string, string> = {
    playPause: 'Space',
    stop: 'Esc',
    next: '→',
    previous: '←',
    volumeUp: '↑',
    volumeDown: '↓',
    mute: 'M',
    search: 'Ctrl+F',
    advancedSearch: 'Ctrl+Shift+F',
    smartPlaylists: 'Ctrl+P',
    selectAll: 'Ctrl+A',
    clearSelection: 'Del',
    extractSelected: 'Ctrl+E',
    wildCard: 'Ctrl+R',
    toggleSidebar: 'Ctrl+B',
    refreshLibrary: 'F5',
    savePlaylist: 'Ctrl+S',
    undo: 'Ctrl+Z',
    redo: 'Ctrl+Y',
  };

  return shortcuts[action] || '';
};

export default useKeyboardShortcuts;
