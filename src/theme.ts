// Banking Design System — SFS Finance
export const theme = {
  colors: {
    // Brand
    primary: '#6B1A1A',       // Deep Crimson Red
    primaryDark: '#4A0E0E',   // Darker Red
    primaryLight: '#8B2323',  // Lighter Red
    accent: '#C9922A',        // Rich Gold
    accentLight: '#E8B84B',   // Light Gold
    brown: '#3D1C02',         // Deep Brown
    brownLight: '#5C2D0E',    // Light Brown

    // Neutrals
    black: '#0A0A0A',
    darkGray: '#1C1C1E',
    gray: '#4A4A4A',
    midGray: '#8A8A8A',
    lightGray: '#D1C9C0',
    offWhite: '#FAF7F4',
    white: '#FFFFFF',

    // Status
    success: '#15803D',
    successBg: '#F0FDF4',
    error: '#DC2626',
    errorBg: '#FEF2F2',
    warning: '#D97706',
    warningBg: '#FFFBEB',

    // Surface
    surface: '#FFFFFF',
    surfaceAlt: '#F5F0EB',
    border: '#E2D9D0',
    borderStrong: '#C4B5A5',
  },

  typography: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontFamilySans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sizes: {
      xs: 11,
      sm: 13,
      base: 15,
      lg: 17,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 38,
    },
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
  },

  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48,
  },

  radius: {
    sm: 4, md: 8, lg: 12, xl: 16, full: 999,
  },

  shadows: {
    card: {
      shadowColor: '#3D1C02',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    elevated: {
      shadowColor: '#3D1C02',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};

export type Theme = typeof theme;
