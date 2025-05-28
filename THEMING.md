# Power Hour Theming System

The Power Hour app now includes a flexible theming system that allows users to easily switch between different color themes.

## Available Themes

The app comes with 6 built-in color themes plus a custom theme option:

1. **Purple** (Default) - The original purple theme
2. **Blue** - Professional blue theme
3. **Green** - Nature-inspired green theme
4. **Orange** - Warm orange theme
5. **Red** - Bold red theme
6. **Teal** - Modern teal theme
7. **Custom** - Create your own personalized theme

## How to Use

### Switching Themes
1. Look for the palette icon (🎨) in the top-right corner of the app bar
2. Click the palette icon to open the theme selector menu
3. Choose your preferred theme from the list
4. The theme will be applied immediately and saved for future sessions

### Creating Custom Themes
1. Click the palette icon (🎨) in the top-right corner
2. Select "Create Custom Theme" from the menu
3. Use the color picker interface to customize:
   - **Primary Color**: Main brand color for buttons, app bar, etc.
   - **Secondary Color**: Accent color for highlights and secondary elements
   - **Dark Background**: Background color for dark mode
   - **Dark Paper**: Card/paper background for dark mode
   - **Light Background**: Background color for light mode
   - **Light Paper**: Card/paper background for light mode
4. Preview your colors in real-time
5. Click "Save Custom Theme" to apply and save your theme

### Light/Dark Mode
- Use the brightness icon next to the theme selector to toggle between light and dark modes
- Your preference is automatically saved

## Theme Persistence

- Your selected theme and light/dark mode preference are automatically saved to localStorage
- When you restart the app, it will remember your last selected theme

## For Developers

### Adding New Themes

To add a new theme, edit `src/themes/index.ts`:

```typescript
export const colorThemes: ColorTheme[] = [
  // ... existing themes
  {
    id: 'your-theme-id',
    name: 'Your Theme Name',
    primary: '#your-primary-color',
    secondary: '#your-secondary-color',
    darkBackground: '#your-dark-bg',
    darkPaper: '#your-dark-paper',
    lightBackground: '#your-light-bg',
    lightPaper: '#your-light-paper',
  },
];
```

### Theme Structure

Each theme includes:
- `primary`: Main brand color used for buttons, app bar, etc.
- `secondary`: Accent color used for highlights and secondary elements
- `darkBackground`: Background color for dark mode
- `darkPaper`: Paper/card background color for dark mode
- `lightBackground`: Background color for light mode
- `lightPaper`: Paper/card background color for light mode

### Using Theme Colors in Components

Components can access theme colors using the `useTheme` hook:

```typescript
import { useTheme } from '@mui/material/styles';

const MyComponent = () => {
  const theme = useTheme();

  return (
    <div style={{ backgroundColor: theme.palette.primary.main }}>
      Content with theme color
    </div>
  );
};
```

## Custom Theme Creation

Users can create and manage multiple custom themes through the theme selector:

1. Click the palette icon (🎨) in the top-right corner
2. Select "Create Custom Theme" from the menu
3. Enter a custom name for your theme
4. Click on color boxes to open the color picker wheel
5. Adjust colors using the visual color picker or hex input fields
6. Preview the theme in real-time
7. Save the custom theme

### Custom Theme Editor Features

- **Theme Naming**: Give each custom theme a unique, memorable name
- **Visual Color Picker**: Click color boxes to open a full-featured color wheel
- **Color Input Fields**: Direct hex color input for precise control
- **Real-time Preview**: See color changes instantly
- **Edit Existing Themes**: Modify previously created custom themes
- **Delete Themes**: Remove unwanted custom themes
- **Reset Functionality**: Restore default colors
- **Multiple Custom Themes**: Create and save unlimited custom themes

### Managing Custom Themes

- **Edit**: Click the edit icon (✏️) next to any custom theme to modify it
- **Delete**: Click the delete icon (🗑️) to remove a custom theme (with confirmation)
- **Switch**: Click on any theme name to apply it immediately
- **Persistence**: All custom themes are automatically saved and restored on app restart

## Files Modified

- `src/themes/index.ts` - Theme definitions and utilities
- `src/contexts/ThemeContext.tsx` - Theme state management and persistence
- `src/components/ThemeSelector.tsx` - Theme selection UI component
- `src/components/CustomThemeEditor.tsx` - Custom theme creation interface
- `src/App.tsx` - Integration of theming system
- `src/components/Playlists.tsx` - Updated to use dynamic theme colors
- `src/components/SongUploader.tsx` - Power Hour Library and Create Mix page theming

## Benefits

- **Easy Customization**: Users can quickly switch between themes or create their own
- **Advanced Theme Creator**: Built-in editor with visual color picker and theme naming
- **Multiple Custom Themes**: Create, edit, and manage unlimited custom themes
- **Persistent Preferences**: All theme choices and custom themes are remembered across sessions
- **Developer Friendly**: Easy to add new themes or modify existing ones
- **Consistent**: All components automatically use the selected theme colors
- **Accessible**: Supports both light and dark modes for better accessibility
- **Real-time Preview**: See color changes instantly while creating custom themes
- **Professional Color Picker**: Full-featured color wheel for precise color selection
