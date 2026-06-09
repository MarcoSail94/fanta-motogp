// webapp/src/App.tsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Components & Pages
import { 
  AppBar, Box, Toolbar, IconButton, Typography, Drawer, List, 
  ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Avatar, useMediaQuery, BottomNavigation,
  BottomNavigationAction, Paper, Divider, CircularProgress, useTheme,
  alpha
} from '@mui/material';
import {
  Menu as MenuIcon, Home, SportsMotorsports, Groups, 
  CalendarToday, Person, AdminPanelSettings, 
  ChevronLeft
} from '@mui/icons-material';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import TeamsPage from './pages/TeamsPage';
import LeaguesPage from './pages/LeaguesPage';
import RidersPage from './pages/RidersPage';
import RaceCalendarPage from './pages/RaceCalendarPage';
import ProfilePage from './pages/ProfilePage';
import EditTeamPage from './pages/EditTeamPage';
import LineupPage from './pages/LineupPage';
import CreateTeamPage from './pages/CreateTeamPage';
import CreateLeaguePage from './pages/CreateLeaguePage';
import LeagueDetailPage from './pages/LeagueDetailPage';
import RaceDetailPage from './pages/RaceDetailPage';
import RiderDetailPage from './pages/RiderDetailPage';
import AdminDashboard from './pages/admin/AdminDashboard';

const DRAWER_WIDTH = 240;

function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);

  useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);

  const toggleDrawer = () => setDrawerOpen(!drawerOpen);

  const menuItems = [
    { label: 'Dashboard', icon: <Home />, path: '/' },
    { label: 'I Miei Team', icon: <SportsMotorsports />, path: '/teams' },
    { label: 'Leghe', icon: <Groups />, path: '/leagues' },
    { label: 'Piloti', icon: <Person />, path: '/riders' },
    { label: 'Calendario', icon: <CalendarToday />, path: '/calendar' },
  ];

  if (user?.isAdmin) {
    menuItems.push({ label: 'Admin', icon: <AdminPanelSettings />, path: '/admin' });
  }

  const getActivePath = () => {
    if (location.pathname.startsWith('/teams')) return '/teams';
    if (location.pathname.startsWith('/leagues')) return '/leagues';
    if (location.pathname.startsWith('/riders')) return '/riders';
    if (location.pathname.startsWith('/calendar') || location.pathname.startsWith('/races')) return '/calendar';
    if (location.pathname.startsWith('/admin')) return '/admin';
    return '/';
  };

  const activePath = getActivePath();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      
      {/* Desktop Sidebar (Drawer) */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          open={drawerOpen}
          sx={{
            width: drawerOpen ? DRAWER_WIDTH : 65,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
            '& .MuiDrawer-paper': {
              width: drawerOpen ? DRAWER_WIDTH : 65,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
              backgroundColor: theme.palette.background.paper,
              borderRight: '1px solid rgba(255,255,255,0.08)',
            },
          }}
        >
          <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: drawerOpen ? 'space-between' : 'center', px: [1] }}>
            {drawerOpen && (
              <Typography variant="h6" color="primary" fontWeight="bold" sx={{ ml: 2, letterSpacing: 1, fontStyle: 'italic' }}>
                Fanta MotoGP
              </Typography>
            )}
            <IconButton onClick={toggleDrawer}>
              {drawerOpen ? <ChevronLeft /> : <MenuIcon />}
            </IconButton>
          </Toolbar>
          <Divider />
          <List component="nav" sx={{ mt: 1 }}>
            {menuItems.map((item) => (
              <ListItem key={item.label} disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  sx={{
                    minHeight: 48,
                    justifyContent: drawerOpen ? 'initial' : 'center',
                    px: 2.5,
                    mb: 0.5,
                    bgcolor: activePath === item.path ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                    borderLeft: activePath === item.path ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
                    '&:hover': {
                       bgcolor: alpha(theme.palette.text.primary, 0.05),
                    }
                  }}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon sx={{ 
                    minWidth: 0, 
                    mr: drawerOpen ? 3 : 'auto', 
                    justifyContent: 'center', 
                    color: activePath === item.path ? 'primary.main' : 'text.secondary'
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} sx={{ opacity: drawerOpen ? 1 : 0 }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ mt: 'auto', p: 2 }}>
             <Divider sx={{ mb: 2 }} />
             <Box display="flex" alignItems="center" justifyContent={drawerOpen ? 'flex-start' : 'center'} gap={2}>
                <Avatar 
                  sx={{ bgcolor: 'secondary.main', cursor: 'pointer', width: 32, height: 32, fontSize: 14 }} 
                  onClick={() => navigate('/profile')}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </Avatar>
                {drawerOpen && (
                  <Box overflow="hidden">
                    <Typography variant="body2" noWrap fontWeight="bold">{user?.username}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: 'error.main' } }} onClick={logout}>
                      Logout
                    </Typography>
                  </Box>
                )}
             </Box>
          </Box>
        </Drawer>
      )}

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, pb: { xs: 10, md: 4 }, width: '100%', overflowX: 'hidden' }}>
        {/* Mobile Header */}
        {isMobile && (
          <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.default', mb: 2, top: 0, zIndex: 1100 }}>
            <Toolbar>
               <Typography variant="h6" color="primary" sx={{ flexGrow: 1, fontWeight: 800, fontStyle: 'italic' }}>
                 Fanta MotoGP
               </Typography>
               <IconButton onClick={() => navigate('/profile')}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14 }}>
                    {user?.username?.charAt(0).toUpperCase()}
                  </Avatar>
               </IconButton>
            </Toolbar>
          </AppBar>
        )}
        <Outlet />
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }} elevation={3}>
          <BottomNavigation
            showLabels
            value={activePath}
            onChange={(_, newValue) => navigate(newValue)}
            sx={{ 
              bgcolor: 'background.paper', 
              height: 72,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              '& .MuiBottomNavigationAction-root': {
                minWidth: 0,
                px: 0.5,
                color: 'text.secondary',
              },
              '& .Mui-selected': {
                color: 'primary.main',
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.68rem',
                fontWeight: 700,
                mt: 0.25,
              },
            }}
          >
            <BottomNavigationAction label="Home" value="/" icon={<Home />} />
            <BottomNavigationAction label="Team" value="/teams" icon={<SportsMotorsports />} />
            <BottomNavigationAction label="Leghe" value="/leagues" icon={<Groups />} />
            <BottomNavigationAction label="Piloti" value="/riders" icon={<Person />} />
            <BottomNavigationAction label="Gare" value="/calendar" icon={<CalendarToday />} />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}

function AuthLayout() {
    return <Outlet />;
}

function App() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      {/* Logica condizionale: se loggato mostra MainLayout, altrimenti AuthLayout */}
      {isAuthenticated && user ? (
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:teamId/edit" element={<EditTeamPage />} />
          <Route path="/teams/:teamId/lineup/:raceId" element={<LineupPage />} />
          <Route path="/leagues" element={<LeaguesPage />} />
          <Route path="/leagues/create" element={<CreateLeaguePage />} />
          <Route path="/leagues/:leagueId" element={<LeagueDetailPage />} />
          <Route path="/leagues/:leagueId/create-team" element={<CreateTeamPage />} />
          <Route path="/riders" element={<RidersPage />} />
          <Route path="/riders/:riderId" element={<RiderDetailPage />} />
          <Route path="/calendar" element={<RaceCalendarPage />} />
          <Route path="/races/:raceId" element={<RaceDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Admin Route Protection */}
          {user.isAdmin && <Route path="/admin" element={<AdminDashboard />} />}
          
          {/* Redirect di fallback per utenti loggati */}
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      ) : (
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* <-- MODIFICA PUNTO 5: Salviamo da dove arrivava l'utente */}
          <Route path="*" element={<Navigate to="/login" state={{ from: location.pathname }} replace />} />
        </Route>
      )}
    </Routes>
  );
}

export default App;
