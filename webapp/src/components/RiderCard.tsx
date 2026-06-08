import React from 'react';
import { Card, CardActionArea, CardMedia, Typography, Box, Chip, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Euro, Speed, Star } from '@mui/icons-material';
import type { Rider } from '../types';

const categoryColors = {
  MOTOGP: '#E60023',
  MOTO2: '#FF6B00',
  MOTO3: '#1976D2',
};

const categoryGradients = {
  MOTOGP: 'linear-gradient(135deg, #E60023 0%, #FF4C4C 100%)',
  MOTO2: 'linear-gradient(135deg, #FF6B00 0%, #FF8F40 100%)',
  MOTO3: 'linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)',
};

export function RiderCard({ rider }: { rider: Rider }) {
  const navigate = useNavigate();

  return (
    <Card 
      sx={{ 
        position: 'relative',
        borderRadius: 2,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        border: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: 'background.paper',
        '&:hover': {
          transform: 'translateY(-8px) scale(1.02)',
          boxShadow: (theme) => `0 20px 40px -12px ${theme.palette.primary.main}66`,
          borderColor: categoryColors[rider.category],
          '& .rider-image': {
            transform: 'scale(1.1)',
          },
          '& .overlay': {
            opacity: 1,
          },
        }
      }}
    >
      <CardActionArea 
        onClick={() => navigate(`/riders/${rider.id}`)}
        sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Box sx={{ position: 'relative', width: '100%', paddingTop: '125%' }}>
          <CardMedia
            component="img"
            image={rider.photoUrl || `https://via.placeholder.com/400x500/1E1E1E/FFFFFF?text=${rider.name.split(' ').map(n => n[0]).join('')}`}
            alt={rider.name}
            className="rider-image"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              transition: 'transform 0.6s ease',
            }}
          />
          
          {/* Gradient Overlay */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '70%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, transparent 100%)',
            }}
          />

          {/* Stats Overlay */}
          <Box
            className="overlay"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 2,
            }}
          >
            <Stack spacing={2} alignItems="center">
              {rider.totalPoints !== undefined && (
                <Box textAlign="center">
                  <Typography variant="h3" color="primary">
                    {rider.totalPoints}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Punti Totali
                  </Typography>
                </Box>
              )}
              {rider.averagePoints !== undefined && (
                <Box textAlign="center">
                  <Typography variant="h4" color="secondary">
                    {rider.averagePoints.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Media Punti
                  </Typography>
                </Box>
              )}
              <Chip
                icon={<Euro />}
                label={`${rider.value} crediti`}
                color="primary"
                sx={{ fontWeight: 600 }}
              />
            </Stack>
          </Box>

          {/* Number Badge */}
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: categoryGradients[rider.category],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              border: '2px solid rgba(255,255,255,0.2)',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'white' }}>
              {rider.number}
            </Typography>
          </Box>

          {/* Content */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              p: 2,
              color: 'white',
            }}
          >
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700,
                mb: 0.5,
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              {rider.name}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                opacity: 0.9,
                mb: 1,
              }}
            >
              {rider.team}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                label={rider.category}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 600,
                  backdropFilter: 'blur(10px)',
                }}
              />
            </Stack>
          </Box>
        </Box>
        
        {/* Category Bar */}
        <Box
          sx={{
            height: 4,
            background: categoryGradients[rider.category],
          }}
        />
      </CardActionArea>
    </Card>
  );
}
