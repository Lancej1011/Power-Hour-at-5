import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

interface ResizableColumnHeaderProps {
  field: string;
  label: string;
  width: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: "title" | "artist" | "album" | "genre" | "year" | "tags") => void;
  onResize?: (field: string, width: number) => void;
  minWidth?: number;
  maxWidth?: number;
}

const ResizableColumnHeader: React.FC<ResizableColumnHeaderProps> = ({
  field,
  label,
  width,
  sortField,
  sortDirection,
  onSort,
  onResize,
  minWidth = 80,
  maxWidth = 600,
}) => {
  const theme = useTheme();
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(width);
  const headerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start resizing if clicking on the right edge (resize handle)
    if (!headerRef.current) return;

    const rect = headerRef.current.getBoundingClientRect();
    const isNearRightEdge = e.clientX > rect.right - 10;

    if (isNearRightEdge) {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      setStartX(e.clientX);
      setStartWidth(width);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));

    onResize?.(field, newWidth);
  }, [isResizing, startX, startWidth, field, onResize, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const handleSort = () => {
    if (onSort && !isResizing) {
      onSort(field as "title" | "artist" | "album" | "genre" | "year" | "tags");
    }
  };

  const getSortIcon = () => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ?
      <ArrowUpwardIcon sx={{ fontSize: 16, ml: 0.5 }} /> :
      <ArrowDownwardIcon sx={{ fontSize: 16, ml: 0.5 }} />;
  };

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      ref={headerRef}
      onMouseDown={handleMouseDown}
      onClick={handleSort}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: `${width}px`,
        minWidth: '80px', // Minimum width to prevent too much shrinking
        maxWidth: `${width}px`, // Prevent growing beyond specified width
        flexShrink: 1, // Allow controlled shrinking
        flexGrow: 0, // Prevent growing
        padding: '6px 16px', // Match EditableCell padding exactly
        cursor: onSort ? 'pointer' : 'default',
        color: theme.palette.text.primary,
        fontWeight: 'bold',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center', // Center content horizontally
        position: 'relative',
        borderRight: `1px solid ${theme.palette.divider}`,
        userSelect: 'none',
        backgroundColor: isHovered && onSort ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
        boxSizing: 'border-box', // Include padding in width calculation
        overflow: 'hidden', // Ensure content doesn't overflow
      }}
    >
      <span style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textAlign: 'center', // Center text within the span
        flex: 1,
      }}>
        {label}
      </span>

      {/* Sort icon positioned absolutely to not interfere with centering */}
      <div style={{ position: 'absolute', right: '20px' }}>
        {getSortIcon()}
      </div>

      {/* Resize handle */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '10px',
          cursor: 'col-resize',
          backgroundColor: 'transparent',
          zIndex: 1,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsResizing(true);
          setStartX(e.clientX);
          setStartWidth(width);
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
        }}
      />

      {/* Visual resize indicator */}
      <div
        style={{
          position: 'absolute',
          right: '2px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '2px',
          height: '60%',
          backgroundColor: theme.palette.divider,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export default ResizableColumnHeader;
