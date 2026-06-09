// webapp/src/theme/index.ts
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

const liquidGlass = {
  backgroundImage: `
    linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.035) 42%, rgba(230,0,35,0.07)),
    radial-gradient(circle at 18% 0%, rgba(255,255,255,0.18), transparent 30%)
  `,
  backgroundColor: 'rgba(22, 22, 30, 0.72)',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.14)',
  boxShadow: '0 18px 44px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.10)',
};

const baseTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#E60023', // Rosso MotoGP
      light: '#FF4C4C',
      dark: '#A8001A',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF6B00', // Arancione KTM/Honda
      light: '#FF8F40',
      dark: '#CC5500',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#0f0f13', 
      paper: '#1a1a23',
    },
    text: {
      primary: '#EDEDED',
      secondary: '#A0A0A0',
    },
    error: { main: '#FF3333' },
    success: { main: '#00E676' },
    warning: { main: '#FFC107' },
    info: { main: '#2979FF' },
    action: {
      hover: 'rgba(255, 255, 255, 0.08)',
      selected: 'rgba(230, 0, 35, 0.16)',
    }
  },
  shape: {
    borderRadius: 12, // Curve leggermente più squadrate per un look più tecnico
  }
});

let theme = createTheme(baseTheme, {
  typography: {
    fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { 
      fontWeight: 900, 
      letterSpacing: '-0.02em', 
      textTransform: 'uppercase',
      fontStyle: 'italic', // Stile Racing
    },
    h2: { 
      fontWeight: 800, 
      letterSpacing: '-0.01em',
      fontStyle: 'italic',
    },
    h3: { fontWeight: 700, fontStyle: 'italic' },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { 
      fontWeight: 700, 
      letterSpacing: '0.05em', 
      textTransform: 'uppercase',
      fontSize: '0.9rem' 
    },
    button: { 
      fontWeight: 700, 
      letterSpacing: '0.1em', 
      textTransform: 'uppercase' 
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0f0f13',
          // Texture "Carbon Fiber" simulata
          backgroundImage: `
            radial-gradient(circle at 50% 0%, #2a1a1a 0%, transparent 80%),
            linear-gradient(45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.03) 75%, rgba(255, 255, 255, 0.03)),
            linear-gradient(45deg, rgba(255, 255, 255, 0.03) 25%, transparent 25%, transparent 75%, rgba(255, 255, 255, 0.03) 75%, rgba(255, 255, 255, 0.03))
          `,
          backgroundSize: '100% 100%, 20px 20px, 20px 20px',
          backgroundPosition: '0 0, 0 0, 10px 10px',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
        },
        '::-webkit-scrollbar': { width: '8px' },
        '::-webkit-scrollbar-track': { background: '#0f0f13' },
        '::-webkit-scrollbar-thumb': { background: '#333', borderRadius: '4px' },
        '::-webkit-scrollbar-thumb:hover': { background: '#555' },
        '.fade-in': {
          animation: 'fadeIn 0.6s ease-out',
        },
        '.liquid-glass': liquidGlass,
        '.liquid-glass-strong': {
          ...liquidGlass,
          backgroundColor: 'rgba(18, 18, 25, 0.82)',
          borderColor: 'rgba(255,255,255,0.18)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.12)',
        },
        '.liquid-glass-nav': {
          ...liquidGlass,
          backgroundColor: 'rgba(18, 18, 25, 0.78)',
          borderColor: 'rgba(255,255,255,0.16)',
        },
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(26, 26, 35, 0.6)', // Più trasparente
          backdropFilter: 'blur(16px) saturate(180%)', // Effetto vetro avanzato
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&.interactive-card, &[data-interactive="true"]': {
            cursor: 'pointer',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
            '&:hover': {
              borderColor: '#E60023',
              boxShadow: '0 0 20px rgba(230, 0, 35, 0.4), 0 8px 32px 0 rgba(0, 0, 0, 0.6)',
              transform: 'translateY(-4px)',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(26, 26, 35, 0.9)',
          '&.liquid-glass, &.liquid-glass-strong, &.liquid-glass-nav': {
            backgroundImage: liquidGlass.backgroundImage,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
        },
        containedPrimary: {
          background: 'linear-gradient(90deg, #E60023 0%, #FF4C4C 100%)',
          boxShadow: '0 4px 15px rgba(230, 0, 35, 0.4)',
          '&:hover': {
            background: 'linear-gradient(90deg, #A8001A 0%, #E60023 100%)',
            boxShadow: '0 0 20px rgba(230, 0, 35, 0.6)', // Glow pulsante
            transform: 'scale(1.02)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #FF6B00 0%, #FF8F40 100%)',
          boxShadow: '0 4px 15px rgba(255, 107, 0, 0.4)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
        filled: {
          border: '1px solid rgba(255,255,255,0.05)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          ...liquidGlass,
          backgroundColor: 'rgba(15, 15, 19, 0.76)',
          borderLeft: 0,
          borderTop: 0,
          borderBottom: 0,
          borderRight: '1px solid rgba(255,255,255,0.14)',
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          ...liquidGlass,
          backgroundColor: 'rgba(15, 15, 19, 0.78)',
          borderLeft: 0,
          borderRight: 0,
          borderTop: 0,
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          ...liquidGlass,
          backgroundColor: 'rgba(18, 18, 25, 0.82)',
        }
      }
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 58,
          '& .MuiTabs-flexContainer': {
            gap: 4,
          },
        },
        indicator: {
          height: 3,
          borderRadius: 3,
          background: 'linear-gradient(90deg, #E60023, #FF6B00)',
          boxShadow: '0 0 18px rgba(230,0,35,0.65)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 58,
          borderRadius: 12,
          margin: '6px 4px',
          color: '#A0A0A0',
          transition: 'background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
          '&.Mui-selected': {
            color: '#FFFFFF',
            backgroundColor: 'rgba(255,255,255,0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          ...liquidGlass,
          backgroundColor: 'rgba(18, 18, 25, 0.9)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          ...liquidGlass,
          backgroundColor: 'rgba(18, 18, 25, 0.9)',
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          ...liquidGlass,
          backgroundColor: 'rgba(18, 18, 25, 0.9)',
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          ...liquidGlass,
          color: '#FFFFFF',
          '&:hover': {
            boxShadow: '0 22px 54px rgba(230,0,35,0.32), inset 0 1px 0 rgba(255,255,255,0.18)',
          },
        },
      },
    },
  },
});

theme = responsiveFontSizes(theme);
export { theme };
