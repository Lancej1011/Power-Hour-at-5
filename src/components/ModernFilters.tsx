import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Grid,
  Paper,
  Divider,
  useTheme,
  alpha,
  Collapse,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Sort as SortIcon,
  ViewModule as ViewIcon,
  Tune as TuneIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';

interface FilterOption {
  value: string;
  label: string;
  icon?: string;
}

interface ModernFiltersProps {
  // Search mode
  searchMode: 'videos' | 'channels';
  onSearchModeChange: (mode: 'videos' | 'channels') => void;

  // Results per page
  resultsPerPage: number;
  onResultsPerPageChange: (count: number) => void;

  // Video filters
  sortOrder: string;
  onSortOrderChange: (order: string) => void;
  videoDuration: string;
  onVideoDurationChange: (duration: string) => void;

  // Channel filters
  channelSortOrder: string;
  onChannelSortOrderChange: (order: string) => void;

  // Card size
  cardSize: 'small' | 'medium' | 'large';
  onCardSizeChange: (size: 'small' | 'medium' | 'large') => void;

  // UI state
  expanded: boolean;
  onToggleExpanded: () => void;
  onApplyFilters: () => void;
  loading?: boolean;
}

const ModernFilters: React.FC<ModernFiltersProps> = ({
  searchMode,
  onSearchModeChange,
  resultsPerPage,
  onResultsPerPageChange,
  sortOrder,
  onSortOrderChange,
  videoDuration,
  onVideoDurationChange,
  channelSortOrder,
  onChannelSortOrderChange,
  cardSize,
  onCardSizeChange,
  expanded,
  onToggleExpanded,
  onApplyFilters,
  loading = false,
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();

  const videoSortOptions: FilterOption[] = [
    { value: 'relevance', label: 'Relevance', icon: '🎯' },
    { value: 'date', label: 'Upload Date', icon: '📅' },
    { value: 'viewCount', label: 'View Count', icon: '👁️' },
    { value: 'rating', label: 'Rating', icon: '⭐' },
    { value: 'title', label: 'Title (A-Z)', icon: '🔤' },
  ];

  const channelSortOptions: FilterOption[] = [
    { value: 'relevance', label: 'Best Match', icon: '🎯' },
    { value: 'music', label: 'Music Priority', icon: '🎵' },
    { value: 'title', label: 'Name (A-Z)', icon: '🔤' },
    { value: 'subscribers', label: 'Subscribers', icon: '👥' },
    { value: 'recent', label: 'Recent Activity', icon: '📅' },
  ];

  const durationOptions: FilterOption[] = [
    { value: 'any', label: 'Any Duration', icon: '⏱️' },
    { value: 'short', label: 'Under 4 min', icon: '⚡' },
    { value: 'medium', label: '4-20 min', icon: '⏰' },
    { value: 'long', label: 'Over 20 min', icon: '🎬' },
  ];

  const resultsOptions = [
    { value: 10, label: '10 results' },
    { value: 25, label: '25 results' },
    { value: 50, label: '50 results' },
    { value: 100, label: '100 results' },
  ];

  const cardSizeOptions = [
    { value: 'small', label: 'Small', icon: '📱', desc: 'Compact view' },
    { value: 'medium', label: 'Medium', icon: '💻', desc: 'Balanced view' },
    { value: 'large', label: 'Large', icon: '🖥️', desc: 'Detailed view' },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${alpha(currentTheme.primary, 0.2)}`,
        borderRadius: 3,
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${alpha(currentTheme.primary, 0.03)} 0%, ${alpha(currentTheme.secondary, 0.03)} 100%)`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          background: `linear-gradient(135deg, ${alpha(currentTheme.primary, 0.1)} 0%, ${alpha(currentTheme.secondary, 0.1)} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={onToggleExpanded}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TuneIcon sx={{ color: currentTheme.primary }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: currentTheme.primary }}>
            Search Filters & Options
          </Typography>
          <Chip
            label={expanded ? 'Collapse' : 'Expand'}
            size="small"
            sx={{
              backgroundColor: alpha(currentTheme.primary, 0.2),
              color: currentTheme.primary,
              fontWeight: 600,
            }}
          />
        </Box>
        <Button
          variant="contained"
          onClick={(e) => {
            e.stopPropagation();
            onApplyFilters();
          }}
          disabled={loading}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
          }}
        >
          Apply Filters
        </Button>
      </Box>

      {/* Expandable content */}
      <Collapse in={expanded}>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Search Mode */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterIcon /> Search Mode
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={searchMode === 'videos' ? 'contained' : 'outlined'}
                  onClick={() => onSearchModeChange('videos')}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    ...(searchMode === 'videos' && {
                      background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                    }),
                  }}
                >
                  🎬 Search Videos
                </Button>
                <Button
                  variant={searchMode === 'channels' ? 'contained' : 'outlined'}
                  onClick={() => onSearchModeChange('channels')}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    ...(searchMode === 'channels' && {
                      background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                    }),
                  }}
                >
                  📺 Search Channels
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Sort Options */}
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SortIcon /> Sort By
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {(searchMode === 'videos' ? videoSortOptions : channelSortOptions).map((option) => (
                  <Chip
                    key={option.value}
                    label={`${option.icon} ${option.label}`}
                    variant={
                      (searchMode === 'videos' ? sortOrder : channelSortOrder) === option.value
                        ? 'filled'
                        : 'outlined'
                    }
                    onClick={() =>
                      searchMode === 'videos'
                        ? onSortOrderChange(option.value)
                        : onChannelSortOrderChange(option.value)
                    }
                    sx={{
                      borderRadius: 2,
                      fontWeight: 600,
                      ...(((searchMode === 'videos' ? sortOrder : channelSortOrder) === option.value) && {
                        backgroundColor: currentTheme.primary,
                        color: 'white',
                      }),
                    }}
                  />
                ))}
              </Box>
            </Grid>

            {/* Duration Filter (Videos only) */}
            {searchMode === 'videos' && (
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Duration
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {durationOptions.map((option) => (
                    <Chip
                      key={option.value}
                      label={`${option.icon} ${option.label}`}
                      variant={videoDuration === option.value ? 'filled' : 'outlined'}
                      onClick={() => onVideoDurationChange(option.value)}
                      sx={{
                        borderRadius: 2,
                        fontWeight: 600,
                        ...(videoDuration === option.value && {
                          backgroundColor: currentTheme.secondary,
                          color: 'white',
                        }),
                      }}
                    />
                  ))}
                </Box>
              </Grid>
            )}

            {/* Results per page */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Results per page</InputLabel>
                <Select
                  value={resultsPerPage}
                  onChange={(e) => onResultsPerPageChange(e.target.value as number)}
                  label="Results per page"
                  sx={{ borderRadius: 2 }}
                >
                  {resultsOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Card Size */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <ViewIcon /> Card Size
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {cardSizeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={cardSize === option.value ? 'contained' : 'outlined'}
                    onClick={() => onCardSizeChange(option.value as any)}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      flexDirection: 'column',
                      minHeight: 60,
                      minWidth: 100,
                      ...(cardSize === option.value && {
                        background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                      }),
                    }}
                  >
                    <Box sx={{ fontSize: '1.2rem', mb: 0.5 }}>{option.icon}</Box>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {option.label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', opacity: 0.8 }}>
                      {option.desc}
                    </Typography>
                  </Button>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ModernFilters;
