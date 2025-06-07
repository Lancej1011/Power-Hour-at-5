import React from 'react';
import {
  Box,
  Button,
  Typography,
  IconButton,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';

interface ModernPaginationProps {
  currentPage: number;
  totalResults?: number;
  resultsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  loading?: boolean;
  showResultsInfo?: boolean;
  compact?: boolean;
}

const ModernPagination: React.FC<ModernPaginationProps> = ({
  currentPage,
  totalResults,
  resultsPerPage,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  onNextPage,
  onPrevPage,
  loading = false,
  showResultsInfo = true,
  compact = false,
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();

  // Calculate page range to show
  const getPageNumbers = () => {
    const maxPagesToShow = compact ? 3 : 5;
    const pages: number[] = [];
    
    // Always show current page
    pages.push(currentPage);
    
    // Add pages before current
    for (let i = 1; i < Math.ceil(maxPagesToShow / 2); i++) {
      if (currentPage - i >= 1) {
        pages.unshift(currentPage - i);
      }
    }
    
    // Add pages after current
    for (let i = 1; i < Math.ceil(maxPagesToShow / 2); i++) {
      if (pages.length < maxPagesToShow) {
        pages.push(currentPage + i);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();
  const startResult = (currentPage - 1) * resultsPerPage + 1;
  const endResult = Math.min(currentPage * resultsPerPage, totalResults || 0);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: compact ? 'row' : { xs: 'column', sm: 'row' },
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        p: compact ? 1 : 2,
        backgroundColor: alpha(currentTheme.primary, 0.02),
        borderRadius: 2,
        border: `1px solid ${alpha(currentTheme.primary, 0.1)}`,
      }}
    >
      {/* Results info */}
      {showResultsInfo && totalResults && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {startResult}-{endResult} of {totalResults?.toLocaleString()} results
          </Typography>
          <Chip
            label={`Page ${currentPage}`}
            size="small"
            sx={{
              backgroundColor: alpha(currentTheme.primary, 0.1),
              color: currentTheme.primary,
              fontWeight: 600,
            }}
          />
        </Box>
      )}

      {/* Pagination controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {/* First page button (only show if not compact and not on first few pages) */}
        {!compact && currentPage > 3 && (
          <IconButton
            onClick={() => onPageChange(1)}
            disabled={loading || currentPage === 1}
            size="small"
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              '&:hover': {
                borderColor: currentTheme.primary,
                backgroundColor: alpha(currentTheme.primary, 0.1),
              },
            }}
          >
            <FirstPageIcon />
          </IconButton>
        )}

        {/* Previous button */}
        <IconButton
          onClick={onPrevPage}
          disabled={loading || !hasPrevPage}
          size="small"
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            '&:hover': {
              borderColor: currentTheme.primary,
              backgroundColor: alpha(currentTheme.primary, 0.1),
            },
            '&:disabled': {
              opacity: 0.5,
            },
          }}
        >
          <PrevIcon />
        </IconButton>

        {/* Page numbers */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {pageNumbers.map((pageNum) => (
            <Button
              key={pageNum}
              variant={pageNum === currentPage ? 'contained' : 'outlined'}
              size="small"
              onClick={() => onPageChange(pageNum)}
              disabled={loading}
              sx={{
                minWidth: 40,
                height: 40,
                borderRadius: 2,
                fontWeight: 600,
                ...(pageNum === currentPage
                  ? {
                      background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                      border: 'none',
                      color: 'white',
                      '&:hover': {
                        background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                        transform: 'translateY(-1px)',
                        boxShadow: `0 4px 12px ${alpha(currentTheme.primary, 0.3)}`,
                      },
                    }
                  : {
                      borderColor: 'divider',
                      color: 'text.primary',
                      '&:hover': {
                        borderColor: currentTheme.primary,
                        backgroundColor: alpha(currentTheme.primary, 0.1),
                        color: currentTheme.primary,
                      },
                    }),
              }}
            >
              {pageNum}
            </Button>
          ))}
        </Box>

        {/* Next button */}
        <IconButton
          onClick={onNextPage}
          disabled={loading || !hasNextPage}
          size="small"
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            '&:hover': {
              borderColor: currentTheme.primary,
              backgroundColor: alpha(currentTheme.primary, 0.1),
            },
            '&:disabled': {
              opacity: 0.5,
            },
          }}
        >
          <NextIcon />
        </IconButton>

        {/* Last page button (only show if not compact and there are many pages) */}
        {!compact && hasNextPage && currentPage < pageNumbers[pageNumbers.length - 1] + 2 && (
          <IconButton
            onClick={() => onPageChange(currentPage + 5)} // Approximate last page
            disabled={loading || !hasNextPage}
            size="small"
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              '&:hover': {
                borderColor: currentTheme.primary,
                backgroundColor: alpha(currentTheme.primary, 0.1),
              },
            }}
          >
            <LastPageIcon />
          </IconButton>
        )}
      </Box>

      {/* Loading indicator */}
      {loading && (
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          Loading...
        </Typography>
      )}
    </Box>
  );
};

export default ModernPagination;
