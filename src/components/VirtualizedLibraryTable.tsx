import React, { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  Checkbox,
  IconButton,
  Typography,
  useTheme,
  Tooltip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import AlbumIcon from '@mui/icons-material/Album';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import EditableCell from './EditableCell';
import ResizableColumnHeader from './ResizableColumnHeader';

interface LibrarySong {
  name: string;
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: string;
  tags?: string[];
}

interface LibraryTableProps {
  songs: LibrarySong[];
  selectedSongs: Set<string>;
  libraryPlayingIndex: number | null;
  onSelectSong: (songPath: string) => void;
  onSelectAll: () => void;
  onPlaySong: (song: LibrarySong, index: number) => void;
  onExtractClip: (song: LibrarySong) => void;
  librarySort: { field: 'title' | 'artist' | 'album' | 'genre' | 'year' | 'tags'; direction: 'asc' | 'desc' };
  onSortChange: (field: 'title' | 'artist' | 'album' | 'genre' | 'year' | 'tags') => void;
  favoriteTracks?: Set<string>;
  onToggleFavorite?: (songPath: string) => void;
  showWaveforms?: boolean;
  onUpdateSongMetadata?: (songPath: string, updates: Partial<LibrarySong>) => Promise<boolean>;
  columnWidths?: { [key: string]: number };
  onColumnResize?: (field: string, width: number) => void;
  showTagsColumn?: boolean;
  showExtractColumn?: boolean;
  showWildCardColumn?: boolean;
  onIndividualWildCard?: (song: LibrarySong) => void;
}

// Memoized row component to prevent unnecessary re-renders
const LibraryRow = memo(({
  song,
  index,
  selectedSongs,
  libraryPlayingIndex,
  onSelectSong,
  onPlaySong,
  onExtractClip,
  theme,
  favoriteTracks,
  onToggleFavorite,
  onUpdateSongMetadata,
  columnWidths,
  showTagsColumn,
  showExtractColumn,
  showWildCardColumn,
  onIndividualWildCard
}: any) => {
  try {
    if (!song) return null;

    const isSelected = selectedSongs.has(song.path);
    const isPlaying = libraryPlayingIndex === index;
    const isFavorite = favoriteTracks?.has(song.path) || false;

    // Memoize click handlers to prevent creating new functions on every render
    const handleSelectClick = useCallback(() => {
      onSelectSong(song.path);
    }, [onSelectSong, song.path]);

    const handlePlayClick = useCallback(() => {
      onPlaySong(song, index);
    }, [onPlaySong, song, index]);

    const handleExtractClick = useCallback(() => {
      onExtractClip(song);
    }, [onExtractClip, song]);

    const handleFavoriteClick = useCallback(() => {
      onToggleFavorite?.(song.path);
    }, [onToggleFavorite, song.path]);

    const handleWildCardClick = useCallback(() => {
      onIndividualWildCard?.(song);
    }, [onIndividualWildCard, song]);

    const handleUpdateMetadata = useCallback(async (field: string, value: string | string[]) => {
      try {
        if (onUpdateSongMetadata) {
          console.log('Updating metadata:', { field, value, songPath: song.path });
          const result = await onUpdateSongMetadata(song.path, { [field]: value });
          console.log('Update result:', result);
          return result;
        }
        return false;
      } catch (error) {
        console.error('Error in handleUpdateMetadata:', error);
        return false;
      }
    }, [onUpdateSongMetadata, song.path]);

    // Determine background color based on state
    const getBackgroundColor = () => {
      if (isPlaying) {
        // Currently playing - use a distinct highlight color
        return `${theme.secondary}25`; // Semi-transparent secondary color
      }
      return index % 2 === 0 ? theme.backgroundPaper : theme.backgroundDefault;
    };

    const getHoverBackgroundColor = () => {
      if (isPlaying) {
        // If playing, make hover slightly more intense
        return `${theme.secondary}35`;
      }
      return `${theme.primary}20`;
    };

    return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: getBackgroundColor(),
        borderBottom: `1px solid ${theme.divider}`,
        borderLeft: isPlaying ? `3px solid ${theme.secondary}` : '3px solid transparent',
        fontSize: '0.85rem',
        transition: 'all 0.2s',
        height: '40px',
        minHeight: '40px',
        width: '100%',
        overflow: 'hidden', // Ensure row content doesn't overflow
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = getHoverBackgroundColor();
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = getBackgroundColor();
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: '50px', // Increased width for better spacing
        padding: '6px 12px', // Increased horizontal padding
        textAlign: 'center',
        flexShrink: 0,
        borderRight: `1px solid ${theme.divider}`
      }}>
        <Checkbox
          checked={isSelected}
          onChange={handleSelectClick}
          sx={{ color: theme.textPrimary, padding: '2px' }}
          size="small"
        />
      </div>

      {/* Play button */}
      <div style={{
        width: '50px', // Increased width for better spacing
        padding: '6px 12px', // Increased horizontal padding
        textAlign: 'center',
        flexShrink: 0,
        borderRight: `1px solid ${theme.divider}`
      }}>
        <IconButton
          onClick={handlePlayClick}
          color={isPlaying ? 'primary' : 'default'}
          sx={{
            color: isPlaying ? theme.secondary : theme.textPrimary,
            padding: '4px'
          }}
          size="small"
        >
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
      </div>

      {/* Favorite button */}
      {onToggleFavorite && (
        <div style={{
          width: '50px', // Increased width for better spacing
          padding: '6px 12px', // Increased horizontal padding
          textAlign: 'center',
          flexShrink: 0,
          borderRight: `1px solid ${theme.divider}`
        }}>
          <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
            <IconButton
              onClick={handleFavoriteClick}
              sx={{
                color: isFavorite ? theme.error : theme.textSecondary,
                padding: '4px',
                '&:hover': {
                  color: isFavorite ? theme.errorDark : theme.error,
                }
              }}
              size="small"
            >
              {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
          </Tooltip>
        </div>
      )}

      {/* Song title */}
      <EditableCell
        value={song.title || song.name}
        field="title"
        onSave={(value) => handleUpdateMetadata('title', value)}
        width={columnWidths?.title ? `${columnWidths.title}px` : '30%'}
      />

      {/* Artist */}
      <EditableCell
        value={song.artist || ''}
        field="artist"
        onSave={(value) => handleUpdateMetadata('artist', value)}
        width={columnWidths?.artist ? `${columnWidths.artist}px` : '20%'}
      />

      {/* Album */}
      <EditableCell
        value={song.album || ''}
        field="album"
        onSave={(value) => handleUpdateMetadata('album', value)}
        width={columnWidths?.album ? `${columnWidths.album}px` : '20%'}
      />

      {/* Genre */}
      <EditableCell
        value={song.genre || ''}
        field="genre"
        onSave={(value) => handleUpdateMetadata('genre', value)}
        width={columnWidths?.genre ? `${columnWidths.genre}px` : '15%'}
      />

      {/* Year */}
      <EditableCell
        value={song.year || ''}
        field="year"
        onSave={(value) => handleUpdateMetadata('year', value)}
        width={columnWidths?.year ? `${columnWidths.year}px` : '10%'}
      />

      {/* Tags - conditionally rendered */}
      {showTagsColumn && (
        <EditableCell
          value={song.tags || []}
          field="tags"
          onSave={(value) => handleUpdateMetadata('tags', value)}
          width={columnWidths?.tags ? `${columnWidths.tags}px` : '15%'}
        />
      )}

      {/* Extract button - conditionally rendered */}
      {showExtractColumn && (
        <div style={{
          width: '50px', // Increased width for better spacing
          padding: '6px 12px', // Increased horizontal padding
          textAlign: 'center',
          flexShrink: 0,
          borderRight: `1px solid ${theme.divider}`
        }}>
          <IconButton
            onClick={handleExtractClick}
            sx={{
              color: theme.textPrimary,
              padding: '4px',
              '&:hover': {
                color: theme.secondary,
              }
            }}
            size="small"
            title="Extract Clip"
          >
            💿
          </IconButton>
        </div>
      )}

      {/* Wild Card button - conditionally rendered */}
      {showWildCardColumn && (
        <div style={{
          width: '50px',
          padding: '6px 12px',
          textAlign: 'center',
          flexShrink: 0,
          borderRight: `1px solid ${theme.divider}`
        }}>
          <IconButton
            onClick={handleWildCardClick}
            sx={{
              color: theme.textPrimary,
              padding: '4px',
              '&:hover': {
                color: theme.secondary,
              }
            }}
            size="small"
            title="Wild Card - Extract random minute"
          >
            🎲
          </IconButton>
        </div>
      )}
    </div>
    );
  } catch (error) {
    console.error('Error rendering library row:', error);
    return (
      <div style={{ padding: '8px', color: 'red', height: '40px', display: 'flex', alignItems: 'center' }}>
        Error loading song
      </div>
    );
  }
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.song.path === nextProps.song.path &&
    prevProps.index === nextProps.index &&
    prevProps.selectedSongs.has(prevProps.song.path) === nextProps.selectedSongs.has(nextProps.song.path) &&
    prevProps.libraryPlayingIndex === nextProps.libraryPlayingIndex &&
    prevProps.favoriteTracks?.has(prevProps.song.path) === nextProps.favoriteTracks?.has(nextProps.song.path) &&
    prevProps.onSelectSong === nextProps.onSelectSong &&
    prevProps.onPlaySong === nextProps.onPlaySong &&
    prevProps.onExtractClip === nextProps.onExtractClip &&
    prevProps.onToggleFavorite === nextProps.onToggleFavorite
  );
});

LibraryRow.displayName = 'LibraryRow';

const LibraryTable: React.FC<LibraryTableProps> = ({
  songs,
  selectedSongs,
  libraryPlayingIndex,
  onSelectSong,
  onSelectAll,
  onPlaySong,
  onExtractClip,
  librarySort,
  onSortChange,
  favoriteTracks,
  onToggleFavorite,
  showWaveforms,
  onUpdateSongMetadata,
  columnWidths,
  onColumnResize,
  showTagsColumn = true,
  showExtractColumn = true,
  showWildCardColumn = false,
  onIndividualWildCard,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(songs.length, 100) });

  // Default column widths - increased for better visibility and spacing
  const defaultColumnWidths = {
    title: 400,  // Increased from 350
    artist: 280, // Increased from 250
    album: 280,  // Increased from 250
    genre: 200,  // Increased from 180
    year: 120,   // Increased from 100
    tags: 220,   // Increased from 200
  };

  const currentColumnWidths = { ...defaultColumnWidths, ...columnWidths };

  // Constants for virtualization
  const ITEM_HEIGHT = 40;
  const OVERSCAN = 15; // Render extra items outside viewport for smooth scrolling
  const CONTAINER_HEIGHT = songs.length * ITEM_HEIGHT;

  // Update visible range when songs change
  useEffect(() => {
    setVisibleRange(prev => ({
      start: 0,
      end: Math.min(songs.length, Math.max(prev.end, 100))
    }));
  }, [songs.length]);

  // Memoize theme colors to prevent unnecessary re-renders
  const themeColors = useMemo(() => ({
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    textPrimary: theme.palette.text.primary,
    textSecondary: theme.palette.text.secondary,
    backgroundPaper: theme.palette.background.paper,
    backgroundDefault: theme.palette.background.default,
    divider: theme.palette.divider,
    error: theme.palette.error.main,
    errorDark: theme.palette.error.dark,
  }), [theme]);

  // Calculate visible items based on scroll position
  useEffect(() => {
    let ticking = false;
    let scrollContainer: HTMLElement | null = null;

    const updateVisibleRange = () => {
      if (!containerRef.current) return;

      // Find the main content scroll container by ID
      scrollContainer = document.getElementById('main-content-scroll-container');
      if (!scrollContainer) {
        // Fallback: try to find it in the next frame
        requestAnimationFrame(() => updateVisibleRange());
        return;
      }

      const scrollTop = scrollContainer.scrollTop;
      const viewportHeight = scrollContainer.clientHeight;

      // Calculate visible range with some buffer
      const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
      const visibleCount = Math.ceil(viewportHeight / ITEM_HEIGHT) + 2 * OVERSCAN;
      const end = Math.min(songs.length, start + visibleCount);

      setVisibleRange(prev => {
        // Only update if the range actually changed to prevent unnecessary re-renders
        if (prev.start !== start || prev.end !== end) {
          return { start, end };
        }
        return prev;
      });
    };

    // Throttle scroll updates using requestAnimationFrame
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateVisibleRange();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Initial update with a small delay to ensure DOM is ready
    const initialUpdate = () => {
      setTimeout(() => {
        updateVisibleRange();

        // Set up scroll listener after initial update
        scrollContainer = document.getElementById('main-content-scroll-container');
        if (scrollContainer) {
          scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        }
      }, 100);
    };

    initialUpdate();
    window.addEventListener('resize', updateVisibleRange);

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('resize', updateVisibleRange);
    };
  }, [songs.length, ITEM_HEIGHT, OVERSCAN]);

  // Memoize visible songs to prevent unnecessary slicing
  const visibleSongs = useMemo(() => {
    return songs.slice(visibleRange.start, visibleRange.end);
  }, [songs, visibleRange.start, visibleRange.end]);

  const getSortIcon = useCallback((field: string) => {
    if (librarySort.field === field) {
      return librarySort.direction === 'asc' ? '▲' : '▼';
    }
    return '';
  }, [librarySort]);

  // Function to create a distinct header background color
  const getDarkerBackground = useCallback(() => {
    const isDark = theme.palette.mode === 'dark';

    if (isDark) {
      // For dark themes, create a color that's darker than paper but lighter than default
      // This ensures it's distinct from both the navigation bar (paper) and table rows
      const paperColor = theme.palette.background.paper;
      const defaultColor = theme.palette.background.default;

      // Parse the paper color and make it darker
      if (paperColor.startsWith('rgb')) {
        const match = paperColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          const r = parseInt(match[1]);
          const g = parseInt(match[2]);
          const b = parseInt(match[3]);

          // Make it darker than paper but not as dark as default
          const darkenAmount = 12;
          const newR = Math.max(0, r - darkenAmount);
          const newG = Math.max(0, g - darkenAmount);
          const newB = Math.max(0, b - darkenAmount);

          return `rgb(${newR}, ${newG}, ${newB})`;
        }
      } else if (paperColor.startsWith('#')) {
        const hex = paperColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        const darkenAmount = 12;
        const newR = Math.max(0, r - darkenAmount);
        const newG = Math.max(0, g - darkenAmount);
        const newB = Math.max(0, b - darkenAmount);

        return `rgb(${newR}, ${newG}, ${newB})`;
      }

      // Fallback for dark themes - use a darker shade
      return 'rgba(0, 0, 0, 0.3)';
    } else {
      // For light themes, create a more distinct darker shade
      const baseColor = theme.palette.background.default;

      // Handle different color formats
      if (baseColor.startsWith('rgb')) {
        // Extract RGB values from rgb() format
        const match = baseColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          const r = parseInt(match[1]);
          const g = parseInt(match[2]);
          const b = parseInt(match[3]);

          // Use a more significant darkening amount for better distinction
          const darkenAmount = 25;
          const newR = Math.max(0, r - darkenAmount);
          const newG = Math.max(0, g - darkenAmount);
          const newB = Math.max(0, b - darkenAmount);

          return `rgb(${newR}, ${newG}, ${newB})`;
        }
      } else if (baseColor.startsWith('#')) {
        // Handle hex colors
        const hex = baseColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        const darkenAmount = 25;
        const newR = Math.max(0, r - darkenAmount);
        const newG = Math.max(0, g - darkenAmount);
        const newB = Math.max(0, b - darkenAmount);

        return `rgb(${newR}, ${newG}, ${newB})`;
      }

      // Fallback to a more distinct darker color for light themes
      return 'rgba(0, 0, 0, 0.08)';
    }
  }, [theme]);

  if (songs.length === 0) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: theme.palette.text.secondary
      }}>
        <Typography>No audio files found in this folder.</Typography>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: getDarkerBackground(),
          borderBottom: `2px solid ${theme.palette.secondary.main}`,
          fontSize: '0.85rem',
          fontWeight: 'bold',
          height: '48px',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          overflow: 'hidden', // Prevent columns from extending beyond container
          width: '100%', // Ensure container takes full width
        }}
      >
        <div style={{
          width: '50px', // Increased width to match rows
          padding: '6px 16px', // Match ResizableColumnHeader padding exactly
          textAlign: 'center',
          flexShrink: 0,
          borderRight: `1px solid ${theme.palette.divider}`
        }}>
          <Checkbox
            checked={selectedSongs.size === songs.length && songs.length > 0}
            indeterminate={selectedSongs.size > 0 && selectedSongs.size < songs.length}
            onChange={onSelectAll}
            sx={{ color: theme.palette.text.primary, padding: '2px' }}
            size="small"
          />
        </div>
        <div style={{
          width: '50px', // Increased width to match rows
          padding: '6px 16px', // Match ResizableColumnHeader padding exactly
          textAlign: 'center',
          flexShrink: 0,
          borderRight: `1px solid ${theme.palette.divider}`
        }}></div>
        {onToggleFavorite && (
          <div style={{
            width: '50px', // Increased width to match rows
            padding: '6px 16px', // Match ResizableColumnHeader padding exactly
            textAlign: 'center',
            flexShrink: 0,
            borderRight: `1px solid ${theme.palette.divider}`
          }}>
            <FavoriteIcon sx={{ fontSize: '1rem', color: theme.palette.text.secondary }} />
          </div>
        )}

        <ResizableColumnHeader
          field="title"
          label="Song"
          width={currentColumnWidths.title}
          sortField={librarySort.field}
          sortDirection={librarySort.direction}
          onSort={onSortChange}
          onResize={onColumnResize}
        />
        <ResizableColumnHeader
          field="artist"
          label="Artist"
          width={currentColumnWidths.artist}
          sortField={librarySort.field}
          sortDirection={librarySort.direction}
          onSort={onSortChange}
          onResize={onColumnResize}
        />
        <ResizableColumnHeader
          field="album"
          label="Album"
          width={currentColumnWidths.album}
          sortField={librarySort.field}
          sortDirection={librarySort.direction}
          onSort={onSortChange}
          onResize={onColumnResize}
        />
        <ResizableColumnHeader
          field="genre"
          label="Genre"
          width={currentColumnWidths.genre}
          sortField={librarySort.field}
          sortDirection={librarySort.direction}
          onSort={onSortChange}
          onResize={onColumnResize}
        />
        <ResizableColumnHeader
          field="year"
          label="Year"
          width={currentColumnWidths.year}
          sortField={librarySort.field}
          sortDirection={librarySort.direction}
          onSort={onSortChange}
          onResize={onColumnResize}
        />
        {showTagsColumn && (
          <ResizableColumnHeader
            field="tags"
            label="Tags"
            width={currentColumnWidths.tags}
            sortField={librarySort.field}
            sortDirection={librarySort.direction}
            onSort={onSortChange}
            onResize={onColumnResize}
          />
        )}

        {showExtractColumn && (
          <div style={{
            width: '50px', // Increased width to match rows
            padding: '6px 16px', // Match ResizableColumnHeader padding exactly
            textAlign: 'center',
            flexShrink: 0,
            borderRight: `1px solid ${theme.palette.divider}`,
            fontSize: '0.85rem',
            fontWeight: 'bold'
          }}>
          </div>
        )}

        {showWildCardColumn && (
          <div style={{
            width: '50px',
            padding: '6px 16px',
            textAlign: 'center',
            flexShrink: 0,
            borderRight: `1px solid ${theme.palette.divider}`,
            fontSize: '0.85rem',
            fontWeight: 'bold'
          }}>
          </div>
        )}
      </div>

      {/* Virtualized song list - Fixed implementation for contained scrolling */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: CONTAINER_HEIGHT,
          position: 'relative'
        }}
      >
        {/* Render only visible items */}
        {visibleSongs.map((song, relativeIndex) => {
          const absoluteIndex = visibleRange.start + relativeIndex;
          return (
            <div
              key={song.path}
              style={{
                position: 'absolute',
                top: absoluteIndex * ITEM_HEIGHT,
                left: 0,
                right: 0,
                height: ITEM_HEIGHT,
              }}
            >
              <LibraryRow
                song={song}
                index={absoluteIndex}
                selectedSongs={selectedSongs}
                libraryPlayingIndex={libraryPlayingIndex}
                onSelectSong={onSelectSong}
                onPlaySong={onPlaySong}
                onExtractClip={onExtractClip}
                theme={themeColors}
                favoriteTracks={favoriteTracks}
                onToggleFavorite={onToggleFavorite}
                onUpdateSongMetadata={onUpdateSongMetadata}
                columnWidths={currentColumnWidths}
                showTagsColumn={showTagsColumn}
                showExtractColumn={showExtractColumn}
                showWildCardColumn={showWildCardColumn}
                onIndividualWildCard={onIndividualWildCard}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LibraryTable;
