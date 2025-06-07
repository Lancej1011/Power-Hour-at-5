import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    complementary: {
      primary: string;
      secondary: string;
    };
  }

  interface PaletteOptions {
    complementary?: {
      primary: string;
      secondary: string;
    };
  }
}
