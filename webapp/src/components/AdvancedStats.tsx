// webapp/src/components/AdvancedStats.tsx
import {
  Box, Paper, Typography, Grid, Stack, Avatar,
  useTheme,
} from '@mui/material';
import {
  TrendingUp, TrendingDown, Remove
} from '@mui/icons-material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

interface StatsData {
  teamPerformance: any[];
  riderStats: any[];
  categoryDistribution: any[];
  trendData: any[];
}

export default function AdvancedStats({ data }: { data: StatsData }) {
  const theme = useTheme();
  
  const COLORS = ['#FF6B00', '#1976D2', '#388E3C', '#FFC107', '#9C27B0'];

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp sx={{ color: 'success.main' }} />;
    if (trend < 0) return <TrendingDown sx={{ color: 'error.main' }} />;
    return <Remove sx={{ color: 'text.secondary' }} />;
  };

  return (
    <Grid container spacing={3}>
      {/* Grafico Performance Team */}

      <Grid size={{ xs: 12, md: 8}}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Performance Team nel Tempo
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="race" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="points" 
                stroke={theme.palette.primary.main}
                strokeWidth={2}
                dot={{ fill: theme.palette.primary.main }}
              />
              <Line 
                type="monotone" 
                dataKey="average" 
                stroke={theme.palette.grey[400]}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Distribuzione Punti per Categoria */}
      <Grid size={{ xs: 12, md: 4}}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Distribuzione Punti
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.categoryDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Radar Chart Performance Piloti */}
      <Grid size={{ xs: 12, md: 6}}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Analisi Performance Piloti
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={data.riderStats}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar 
                name="Performance" 
                dataKey="value" 
                stroke={theme.palette.primary.main}
                fill={theme.palette.primary.main}
                fillOpacity={0.6}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Top Performers */}
      <Grid size={{ xs: 12, md: 6}}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Top Performers Ultima Gara
          </Typography>
          <Stack spacing={2}>
            {data.riderStats.slice(0, 5).map((rider, index) => (
              <Box 
                key={rider.id}
                display="flex" 
                alignItems="center" 
                justifyContent="space-between"
                p={1.5}
                borderRadius={1}
                bgcolor={index === 0 ? 'rgba(255, 193, 7, 0.12)' : 'rgba(255,255,255,0.04)'}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ bgcolor: index === 0 ? 'warning.main' : 'grey.400' }}>
                    {index + 1}
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {rider.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {rider.team}
                    </Typography>
                  </Box>
                </Box>
                <Box textAlign="right">
                  <Typography variant="h6" color="primary">
                    {rider.points} pt
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {getTrendIcon(rider.trend)}
                    <Typography variant="caption" color="text.secondary">
                      {rider.trend > 0 ? '+' : ''}{rider.trend}%
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}
