import React, { useState, useEffect, useRef } from 'react';
import { TextField, Chip, Box, Autocomplete } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface EditableCellProps {
  value: string | string[];
  field: 'title' | 'artist' | 'album' | 'genre' | 'year' | 'tags';
  onSave: (value: string | string[]) => Promise<boolean>;
  width?: string;
  isEditing?: boolean;
  onEditingChange?: (editing: boolean) => void;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  field,
  onSave,
  width = '100%',
  isEditing = false,
  onEditingChange
}) => {
  const theme = useTheme();
  const [editing, setEditing] = useState(isEditing);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update tempValue when value prop changes
  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    setEditing(isEditing);
  }, [isEditing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      try {
        inputRef.current.focus();
        if (field !== 'tags') {
          inputRef.current.select();
        }
      } catch (error) {
        console.error('Error focusing input:', error);
      }
    }
  }, [editing, field]);

  const handleDoubleClick = () => {
    if (!editing) {
      setEditing(true);
      onEditingChange?.(true);
    }
  };

  const handleSave = async () => {
    try {
      const success = await onSave(tempValue);
      if (success) {
        setEditing(false);
        onEditingChange?.(false);
      } else {
        // Revert to original value if save failed
        setTempValue(value);
      }
    } catch (error) {
      console.error('Error saving metadata:', error);
      // Revert to original value if save failed
      setTempValue(value);
      setEditing(false);
      onEditingChange?.(false);
    }
  };

  const handleCancel = () => {
    try {
      setTempValue(value);
      setEditing(false);
      onEditingChange?.(false);
    } catch (error) {
      console.error('Error canceling edit:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  // For tags field, use Autocomplete with chips
  if (field === 'tags') {
    const tagsArray = Array.isArray(value) ? value : [];
    const tempTagsArray = Array.isArray(tempValue) ? tempValue : [];

    if (editing) {
      return (
        <Box style={{ width }}>
          <Autocomplete
            multiple
            freeSolo
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            value={tempTagsArray}
            onChange={(_, newValue) => {
              try {
                console.log('Autocomplete onChange:', newValue);

                // Process the values to handle "Add ..." options
                const processedValues = (newValue as string[]).map(value => {
                  if (typeof value === 'string' && value.startsWith('Add "')) {
                    // Extract the custom tag from 'Add "customtag"'
                    return value.slice(5, -1);
                  }
                  return value;
                }).filter(v => v && v.trim());

                console.log('Processed values:', processedValues);
                setTempValue(processedValues);
              } catch (error) {
                console.error('Error updating tags:', error);
              }
            }}
            onInputChange={(_, newInputValue, reason) => {
              console.log('Input change:', { newInputValue, reason });
            }}
            filterOptions={(options, params) => {
              const filtered = options.filter(option =>
                option.toLowerCase().includes(params.inputValue.toLowerCase())
              );

              // Add the current input as an option if it's not empty and not already in the list
              const { inputValue } = params;
              const isExisting = options.some(option =>
                option.toLowerCase() === inputValue.toLowerCase()
              );

              if (inputValue !== '' && !isExisting) {
                filtered.push(`Add "${inputValue}"`);
              }

              return filtered;
            }}
            getOptionLabel={(option) => {
              // Handle the "Add ..." option
              if (typeof option === 'string' && option.startsWith('Add "')) {
                return option.slice(5, -1); // Remove 'Add "' and '"'
              }
              return option;
            }}
            options={['Chill', 'High Energy', 'Dance', 'Rock', 'Pop', 'Electronic']} // Common tags
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option}
                  size="small"
                  {...getTagProps({ index })}
                  key={index}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                size="small"
                placeholder="Type and press Enter to add custom tags..."
                onKeyDown={(e) => {
                  const target = e.target as HTMLInputElement;
                  console.log('TextField keydown:', e.key, target.value);

                  if (e.key === 'Enter') {
                    e.preventDefault();

                    // Get the current input value
                    const inputValue = target.value;
                    console.log('Enter pressed with input:', inputValue);

                    if (inputValue && inputValue.trim()) {
                      // Add the custom tag to the current tags
                      const newTag = inputValue.trim();
                      const currentTags = Array.isArray(tempValue) ? tempValue : [];

                      if (!currentTags.includes(newTag)) {
                        const updatedTags = [...currentTags, newTag];
                        console.log('Adding custom tag:', newTag, 'Updated tags:', updatedTags);
                        setTempValue(updatedTags);
                      }

                      // Clear the input
                      target.value = '';
                    } else {
                      // If no input, save the current tags
                      handleSave();
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel();
                  }
                }}
                onBlur={handleBlur}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    minHeight: '32px',
                    fontSize: '0.85rem',
                  },
                }}
              />
            )}
            sx={{
              width: '100%',
              '& .MuiAutocomplete-tag': {
                margin: '1px',
                height: '20px',
              },
            }}
          />
        </Box>
      );
    }

    // Create tooltip for tags
    const tagsTooltip = tagsArray.length > 0
      ? `Tags: ${tagsArray.join(', ')}`
      : 'No tags';

    return (
      <Box
        onDoubleClick={handleDoubleClick}
        sx={{
          width,
          minWidth: '80px', // Minimum width to prevent too much shrinking
          maxWidth: width, // Prevent growing beyond specified width
          flexShrink: 1, // Allow controlled shrinking
          flexGrow: 0, // Prevent growing
          padding: '6px 16px', // Increased horizontal padding
          cursor: 'pointer',
          minHeight: '32px',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 0.5,
          overflow: 'hidden',
          borderRight: `1px solid ${theme.palette.divider}`,
          boxSizing: 'border-box', // Include padding in width calculation
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            // Show expanded tags on hover if there are many
            ...(tagsArray.length > 3 && {
              overflow: 'visible',
              zIndex: 10,
              position: 'relative',
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '4px',
              boxShadow: theme.shadows[4],
              maxWidth: '400px',
              minWidth: width,
            }),
          },
        }}
        title={tagsTooltip}
      >
        {tagsArray.length > 0 ? (
          tagsArray.map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              size="small"
              variant="outlined"
              sx={{
                height: '20px',
                fontSize: '0.7rem',
                color: theme.palette.text.secondary,
                borderColor: theme.palette.divider,
              }}
            />
          ))
        ) : (
          <span style={{ color: theme.palette.text.disabled, fontSize: '0.85rem' }}>
            No tags
          </span>
        )}
      </Box>
    );
  }

  // For other fields, use regular TextField
  if (editing) {
    return (
      <Box style={{ width }}>
        <TextField
          ref={inputRef}
          value={tempValue as string || ''}
          onChange={(e) => {
            try {
              setTempValue(e.target.value);
            } catch (error) {
              console.error('Error updating field value:', error);
            }
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          variant="outlined"
          size="small"
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: '0.85rem',
              height: '32px',
              textAlign: 'center', // Center text in input field
            },
            '& .MuiOutlinedInput-input': {
              textAlign: 'center', // Center text in input field
            },
          }}
        />
      </Box>
    );
  }

  // Create a more informative tooltip
  const getTooltipText = () => {
    if (!value) return 'Empty';
    const valueStr = String(value);
    return valueStr;
  };

  return (
    <Box
      onDoubleClick={handleDoubleClick}
      sx={{
        width,
        minWidth: '80px', // Minimum width to prevent too much shrinking
        maxWidth: width, // Prevent growing beyond specified width
        flexShrink: 1, // Allow controlled shrinking
        flexGrow: 0, // Prevent growing
        padding: '6px 16px', // Increased horizontal padding
        cursor: 'pointer',
        color: theme.palette.text.secondary,
        minHeight: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center', // Center content horizontally
        borderRight: `1px solid ${theme.palette.divider}`,
        boxSizing: 'border-box', // Include padding in width calculation
        overflow: 'hidden', // Ensure content doesn't overflow
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        },
      }}
      title={getTooltipText()}
    >
      <span style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        width: '100%',
        display: 'block',
        textAlign: 'center', // Center text within the span
        minWidth: 0 // Important for flex children to shrink
      }}>
        {value || <span style={{ color: theme.palette.text.disabled }}>Empty</span>}
      </span>
    </Box>
  );
};

export default EditableCell;
