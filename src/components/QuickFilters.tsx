import React from 'react';
import {
  Box,
  Chip,
  Typography,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AlbumIcon from '@mui/icons-material/Album';
import PersonIcon from '@mui/icons-material/Person';
import DateRangeIcon from '@mui/icons-material/DateRange';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HistoryIcon from '@mui/icons-material/History';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

interface QuickFilter {
  id: string;
  label: string;
  icon?: React.ReactElement;
  filter: {
    field: string;
    value: string;
    operator?: 'equals' | 'contains' | 'startsWith' | 'range';
  };
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

interface QuickFiltersProps {
  activeFilters: string[];
  onFilterToggle: (filterId: string) => void;
  onClearAllFilters: () => void;
  availableGenres: string[];
  availableYears: string[];
  recentlyPlayedCount: number;
  favoritesCount: number;
}

const QuickFilters: React.FC<QuickFiltersProps> = ({
  activeFilters,
  onFilterToggle,
  onClearAllFilters,
  availableGenres,
  availableYears,
  recentlyPlayedCount,
  favoritesCount,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [menuType, setMenuType] = React.useState<'genres' | 'years' | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, type: 'genres' | 'years') => {
    setAnchorEl(event.currentTarget);
    setMenuType(type);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuType(null);
  };

  const handleMenuItemClick = (value: string) => {
    const filterId = menuType === 'genres' ? `genre:${value}` : `year:${value}`;
    onFilterToggle(filterId);
    handleMenuClose();
  };

  // Predefined quick filters
  const quickFilters: QuickFilter[] = [
    {
      id: 'favorites',
      label: `Favorites (${favoritesCount})`,
      icon: <FavoriteIcon />,
      filter: { field: 'favorite', value: 'true' },
      color: 'error',
    },
    {
      id: 'recent',
      label: `Recently Played (${recentlyPlayedCount})`,
      icon: <HistoryIcon />,
      filter: { field: 'recent', value: 'true' },
      color: 'info',
    },
  ];

  // Generate genre filters from active filters
  const activeGenreFilters = activeFilters
    .filter(f => f.startsWith('genre:'))
    .map(f => f.replace('genre:', ''));

  const activeYearFilters = activeFilters
    .filter(f => f.startsWith('year:'))
    .map(f => f.replace('year:', ''));

  const isFilterActive = (filterId: string) => activeFilters.includes(filterId);

  return (
    <Box sx={{ mb: 0 }}> {/* Removed bottom margin completely */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Quick Filters:
        </Typography>
        {activeFilters.length > 0 && (
          <Tooltip title="Clear all filters">
            <IconButton size="small" onClick={onClearAllFilters}>
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        {/* Predefined filters */}
        {quickFilters.map((filter) => (
          <Chip
            key={filter.id}
            label={filter.label}
            icon={filter.icon}
            variant={isFilterActive(filter.id) ? 'filled' : 'outlined'}
            color={isFilterActive(filter.id) ? filter.color : 'default'}
            onClick={() => onFilterToggle(filter.id)}
            size="small"
            clickable
          />
        ))}

        {/* Genre dropdown */}
        <Chip
          label="Genres"
          icon={<AlbumIcon />}
          variant="outlined"
          onClick={(e) => handleMenuOpen(e, 'genres')}
          size="small"
          clickable
        />

        {/* Year dropdown */}
        <Chip
          label="Years"
          icon={<DateRangeIcon />}
          variant="outlined"
          onClick={(e) => handleMenuOpen(e, 'years')}
          size="small"
          clickable
        />

        {/* Active genre filters */}
        {activeGenreFilters.map((genre) => (
          <Chip
            key={`genre:${genre}`}
            label={genre}
            variant="filled"
            color="primary"
            size="small"
            onDelete={() => onFilterToggle(`genre:${genre}`)}
            deleteIcon={<ClearIcon />}
          />
        ))}

        {/* Active year filters */}
        {activeYearFilters.map((year) => (
          <Chip
            key={`year:${year}`}
            label={year}
            variant="filled"
            color="secondary"
            size="small"
            onDelete={() => onFilterToggle(`year:${year}`)}
            deleteIcon={<ClearIcon />}
          />
        ))}
      </Box>

      {/* Dropdown menus */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          style: {
            maxHeight: 300,
            width: '200px',
          },
        }}
      >
        {menuType === 'genres' && availableGenres.map((genre) => (
          <MenuItem
            key={genre}
            onClick={() => handleMenuItemClick(genre)}
            selected={activeGenreFilters.includes(genre)}
          >
            <ListItemIcon>
              <AlbumIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={genre} />
          </MenuItem>
        ))}

        {menuType === 'years' && availableYears.map((year) => (
          <MenuItem
            key={year}
            onClick={() => handleMenuItemClick(year)}
            selected={activeYearFilters.includes(year)}
          >
            <ListItemIcon>
              <DateRangeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={year} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default QuickFilters;
