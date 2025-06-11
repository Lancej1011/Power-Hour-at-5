/**
 * Artist Disambiguation Dialog
 * Allows users to manually select which artist they meant when there are multiple possibilities
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
  Box,
  Alert,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  MusicNote as MusicIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { ArtistDisambiguationInfo } from '../services/artistDisambiguationService';

interface ArtistDisambiguationDialogProps {
  open: boolean;
  onClose: () => void;
  artistName: string;
  suggestions: ArtistDisambiguationInfo[];
  onSelect: (selectedArtist: ArtistDisambiguationInfo) => void;
  onCustomSearch?: (customQuery: string) => void;
}

const ArtistDisambiguationDialog: React.FC<ArtistDisambiguationDialogProps> = ({
  open,
  onClose,
  artistName,
  suggestions,
  onSelect,
  onCustomSearch
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [customQuery, setCustomQuery] = useState('');
  const [showCustomSearch, setShowCustomSearch] = useState(false);

  const handleSelect = () => {
    if (selectedIndex !== null && suggestions[selectedIndex]) {
      onSelect(suggestions[selectedIndex]);
      onClose();
    }
  };

  const handleCustomSearch = () => {
    if (customQuery.trim() && onCustomSearch) {
      onCustomSearch(customQuery.trim());
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedIndex(null);
    setCustomQuery('');
    setShowCustomSearch(false);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MusicIcon color="primary" />
          <Typography variant="h6">
            Which "{artistName}" did you mean?
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            We found multiple artists with the name "{artistName}". Please select the one you're looking for:
          </Typography>
        </Alert>

        <List>
          {suggestions.map((suggestion, index) => (
            <ListItem key={index} disablePadding>
              <ListItemButton
                selected={selectedIndex === index}
                onClick={() => setSelectedIndex(index)}
                sx={{
                  border: selectedIndex === index ? 2 : 1,
                  borderColor: selectedIndex === index ? 'primary.main' : 'divider',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    borderColor: 'primary.light'
                  }
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h6" component="span">
                        {suggestion.name}
                      </Typography>
                      {suggestion.country && (
                        <Chip 
                          label={suggestion.country} 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {suggestion.description}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {suggestion.genres.map((genre, genreIndex) => (
                          <Chip
                            key={genreIndex}
                            label={genre}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                      
                      {suggestion.activeYears && (
                        <Typography variant="caption" color="text.secondary">
                          Active: {suggestion.activeYears}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        {/* Custom Search Option */}
        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          {!showCustomSearch ? (
            <Button
              variant="outlined"
              startIcon={<SearchIcon />}
              onClick={() => setShowCustomSearch(true)}
              fullWidth
            >
              None of these? Search with custom terms
            </Button>
          ) : (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Custom Search
              </Typography>
              <TextField
                fullWidth
                placeholder={`e.g., "${artistName} progressive rock" or "${artistName} 1970s"`}
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleCustomSearch()}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Add genre, year, or other terms to help identify the specific artist
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        
        {showCustomSearch && customQuery.trim() && (
          <Button 
            onClick={handleCustomSearch}
            variant="contained"
            startIcon={<SearchIcon />}
          >
            Search "{customQuery}"
          </Button>
        )}
        
        {selectedIndex !== null && (
          <Button 
            onClick={handleSelect}
            variant="contained"
            startIcon={<MusicIcon />}
          >
            Select {suggestions[selectedIndex]?.name}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ArtistDisambiguationDialog;
