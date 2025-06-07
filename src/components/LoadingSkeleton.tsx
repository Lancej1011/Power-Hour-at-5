import React from 'react';
import { Box, Skeleton, Card, CardContent } from '@mui/material';

interface LoadingSkeletonProps {
  type: 'library' | 'playlist' | 'song' | 'waveform' | 'card';
  count?: number;
  height?: number | string;
  width?: number | string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  type,
  count = 1,
  height,
  width,
}) => {
  const renderLibrarySkeleton = () => (
    <Box sx={{ width: '100%' }}>
      {/* Header skeleton */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Skeleton variant="text" width={200} height={32} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="rectangular" width={120} height={36} />
          <Skeleton variant="rectangular" width={100} height={36} />
          <Skeleton variant="rectangular" width={100} height={36} />
        </Box>
      </Box>
      
      {/* Search bar skeleton */}
      <Skeleton variant="rectangular" width="100%" height={40} sx={{ mb: 2, borderRadius: 1 }} />
      
      {/* Table header skeleton */}
      <Box sx={{ display: 'flex', gap: 2, mb: 1, px: 1 }}>
        <Skeleton variant="rectangular" width={40} height={24} />
        <Skeleton variant="text" width="30%" height={24} />
        <Skeleton variant="text" width="20%" height={24} />
        <Skeleton variant="text" width="20%" height={24} />
        <Skeleton variant="text" width="15%" height={24} />
        <Skeleton variant="text" width="10%" height={24} />
      </Box>
      
      {/* Table rows skeleton */}
      {Array.from({ length: count }).map((_, index) => (
        <Box key={index} sx={{ display: 'flex', gap: 2, mb: 1, px: 1, alignItems: 'center' }}>
          <Skeleton variant="rectangular" width={40} height={40} />
          <Skeleton variant="text" width="30%" height={20} />
          <Skeleton variant="text" width="20%" height={20} />
          <Skeleton variant="text" width="20%" height={20} />
          <Skeleton variant="text" width="15%" height={20} />
          <Skeleton variant="text" width="10%" height={20} />
        </Box>
      ))}
    </Box>
  );

  const renderPlaylistSkeleton = () => (
    <Box sx={{ width: '100%' }}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Skeleton variant="rectangular" width={60} height={60} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton variant="text" width="40%" height={20} />
                <Skeleton variant="text" width="80%" height={16} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Skeleton variant="circular" width={40} height={40} />
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  const renderSongSkeleton = () => (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 1 }}>
      <Skeleton variant="circular" width={40} height={40} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="text" width="50%" height={16} />
      </Box>
      <Skeleton variant="rectangular" width={60} height={20} />
    </Box>
  );

  const renderWaveformSkeleton = () => (
    <Box sx={{ display: 'flex', alignItems: 'end', gap: 1, height: height || 40 }}>
      {Array.from({ length: 50 }).map((_, index) => (
        <Skeleton
          key={index}
          variant="rectangular"
          width={2}
          height={Math.random() * 30 + 10}
          animation="wave"
        />
      ))}
    </Box>
  );

  const renderCardSkeleton = () => (
    <Card sx={{ width: width || '100%', height: height || 'auto' }}>
      <CardContent>
        <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="100%" height={16} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="80%" height={16} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Skeleton variant="rectangular" width={80} height={32} />
          <Skeleton variant="rectangular" width={80} height={32} />
        </Box>
      </CardContent>
    </Card>
  );

  const renderSkeleton = () => {
    switch (type) {
      case 'library':
        return renderLibrarySkeleton();
      case 'playlist':
        return renderPlaylistSkeleton();
      case 'song':
        return Array.from({ length: count }).map((_, index) => (
          <div key={index}>{renderSongSkeleton()}</div>
        ));
      case 'waveform':
        return renderWaveformSkeleton();
      case 'card':
        return Array.from({ length: count }).map((_, index) => (
          <div key={index}>{renderCardSkeleton()}</div>
        ));
      default:
        return <Skeleton variant="rectangular" width={width} height={height} />;
    }
  };

  return <>{renderSkeleton()}</>;
};

export default LoadingSkeleton;
