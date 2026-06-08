// webapp/src/theme/index.ts
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

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
          backgroundColor: '#0f0f13',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }
      }
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(26, 26, 35, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }
      }
    }
  },
});

theme = responsiveFontSizes(theme);
export { theme };
