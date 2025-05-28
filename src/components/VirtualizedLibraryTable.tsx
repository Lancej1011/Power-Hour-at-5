import React, { memo, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  Checkbox,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import AlbumIcon from '@mui/icons-material/Album';

interface LibrarySong {
  name: string;
  path: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: string;
}

interface VirtualizedLibraryTableProps {
  songs: LibrarySong[];
  selectedSongs: Set<string>;
  libraryPlayingIndex: number | null;
  onSelectSong: (songPath: string) => void;
  onSelectAll: () => void;
  onPlaySong: (song: LibrarySong, index: number) => void;
  onExtractClip: (song: LibrarySong) => void;
  librarySort: { field: 'title' | 'artist' | 'album' | 'genre' | 'year'; direction: 'asc' | 'desc' };
  onSortChange: (field: 'title' | 'artist' | 'album' | 'genre' | 'year') => void;
}

// Memoized row component to prevent unnecessary re-renders
const LibraryRow = memo(({ index, style, data }: any) => {
  const { songs, selectedSongs, libraryPlayingIndex, onSelectSong, onPlaySong, onExtractClip, theme } = data;
  const song = songs[index];

  if (!song) return null;

  const isSelected = selectedSongs.has(song.path);
  const isPlaying = libraryPlayingIndex === index;

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        background: index % 2 === 0 ? theme.palette.background.paper : theme.palette.background.default,
        borderBottom: `1px solid ${theme.palette.divider}`,
        fontSize: '0.85rem',
        transition: 'background 0.2s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = `${theme.palette.primary.main}20`;
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = index % 2 === 0 ? theme.palette.background.paper : theme.palette.background.default;
      }}
    >
      {/* Checkbox */}
      <div style={{ width: '40px', padding: '6px 8px', textAlign: 'center', flexShrink: 0 }}>
        <Checkbox
          checked={isSelected}
          onChange={() => onSelectSong(song.path)}
          sx={{ color: theme.palette.text.primary, padding: '2px' }}
          size="small"
        />
      </div>

      {/* Play button */}
      <div style={{ width: '40px', padding: '6px 8px', textAlign: 'center', flexShrink: 0 }}>
        <IconButton
          onClick={() => onPlaySong(song, index)}
          color={isPlaying ? 'primary' : 'default'}
          sx={{
            color: isPlaying ? theme.palette.secondary.main : theme.palette.text.primary,
            padding: '4px'
          }}
          size="small"
        >
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
      </div>

      {/* Song title */}
      <div style={{
        width: '30%',
        padding: '6px 12px',
        color: theme.palette.text.primary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {song.title || song.name}
      </div>

      {/* Artist */}
      <div style={{
        width: '20%',
        padding: '6px 12px',
        color: theme.palette.text.secondary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {song.artist || ''}
      </div>

      {/* Album */}
      <div style={{
        width: '20%',
        padding: '6px 12px',
        color: theme.palette.text.secondary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {song.album || ''}
      </div>

      {/* Genre */}
      <div style={{
        width: '15%',
        padding: '6px 12px',
        color: theme.palette.text.secondary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {song.genre || ''}
      </div>

      {/* Year */}
      <div style={{
        width: '10%',
        padding: '6px 12px',
        color: theme.palette.text.secondary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {song.year || ''}
      </div>

      {/* Extract button */}
      <div style={{ width: '40px', padding: '6px 8px', textAlign: 'center', flexShrink: 0 }}>
        <IconButton
          onClick={() => onExtractClip(song)}
          sx={{
            color: theme.palette.text.primary,
            padding: '4px',
            '&:hover': {
              color: theme.palette.secondary.main,
            }
          }}
          size="small"
          title="Extract Clip"
        >
          <AlbumIcon />
        </IconButton>
      </div>
    </div>
  );
});

LibraryRow.displayName = 'LibraryRow';

const VirtualizedLibraryTable: React.FC<VirtualizedLibraryTableProps> = ({
  songs,
  selectedSongs,
  libraryPlayingIndex,
  onSelectSong,
  onSelectAll,
  onPlaySong,
  onExtractClip,
  librarySort,
  onSortChange,
}) => {
  const theme = useTheme();

  // Memoize the data object to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    songs,
    selectedSongs,
    libraryPlayingIndex,
    onSelectSong,
    onPlaySong,
    onExtractClip,
    theme,
  }), [songs, selectedSongs, libraryPlayingIndex, onSelectSong, onPlaySong, onExtractClip, theme]);

  const getSortIcon = useCallback((field: string) => {
    if (librarySort.field === field) {
      return librarySort.direction === 'asc' ? '▲' : '▼';
    }
    return '';
  }, [librarySort]);

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
    <div style={{ width: '100%', height: '600px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: theme.palette.background.default,
          borderBottom: `2px solid ${theme.palette.secondary.main}`,
          fontSize: '0.85rem',
          fontWeight: 'bold',
          height: '48px',
        }}
      >
        <div style={{ width: '40px', padding: '8px', textAlign: 'center', flexShrink: 0 }}>
          <Checkbox
            checked={selectedSongs.size === songs.length && songs.length > 0}
            indeterminate={selectedSongs.size > 0 && selectedSongs.size < songs.length}
            onChange={onSelectAll}
            sx={{ color: theme.palette.text.primary, padding: '2px' }}
            size="small"
          />
        </div>
        <div style={{ width: '40px', padding: '8px', textAlign: 'center', flexShrink: 0 }}></div>
        <div
          style={{
            width: '30%',
            padding: '8px 12px',
            cursor: 'pointer',
            color: theme.palette.text.primary
          }}
          onClick={() => onSortChange('title')}
        >
          Song {getSortIcon('title')}
        </div>
        <div
          style={{
            width: '20%',
            padding: '8px 12px',
            cursor: 'pointer',
            color: theme.palette.text.primary
          }}
          onClick={() => onSortChange('artist')}
        >
          Artist {getSortIcon('artist')}
        </div>
        <div
          style={{
            width: '20%',
            padding: '8px 12px',
            cursor: 'pointer',
            color: theme.palette.text.primary
          }}
          onClick={() => onSortChange('album')}
        >
          Album {getSortIcon('album')}
        </div>
        <div
          style={{
            width: '15%',
            padding: '8px 12px',
            cursor: 'pointer',
            color: theme.palette.text.primary
          }}
          onClick={() => onSortChange('genre')}
        >
          Genre {getSortIcon('genre')}
        </div>
        <div
          style={{
            width: '10%',
            padding: '8px 12px',
            cursor: 'pointer',
            color: theme.palette.text.primary
          }}
          onClick={() => onSortChange('year')}
        >
          Year {getSortIcon('year')}
        </div>
        <div style={{ width: '40px', padding: '8px', textAlign: 'center', flexShrink: 0 }}></div>
      </div>

      {/* Virtual list */}
      <List
        height={552} // 600 - 48 (header height)
        width="100%"
        itemCount={songs.length}
        itemSize={40}
        itemData={itemData}
        overscanCount={5}
      >
        {LibraryRow}
      </List>
    </div>
  );
};

export default VirtualizedLibraryTable;
