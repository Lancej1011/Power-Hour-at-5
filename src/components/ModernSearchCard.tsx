import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  IconButton,
  Chip,
  Avatar,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Add as AddIcon,
  AccessTime as TimeIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  ThumbUp as ThumbUpIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../contexts/ThemeContext';
import { YouTubeVideo, YouTubeChannel, formatViewCount, formatPublishDate, parseDuration, formatTime } from '../utils/youtubeUtils';

// Utility function to get better channel avatar URL with multiple fallbacks
const getChannelAvatarUrl = (channel: YouTubeChannel): string => {
  if (channel.thumbnail && channel.thumbnail !== 'https://www.youtube.com/img/desktop/yt_1200.png') {
    return channel.thumbnail;
  }

  // Try to construct better channel avatar URLs
  if (channel.id) {
    // Try multiple YouTube channel avatar patterns
    const patterns = [
      `https://yt3.ggpht.com/ytc/AIdro_${channel.id}=s240-c-k-c0x00ffffff-no-rj`,
      `https://yt3.ggpht.com/a/default-user=s240-c-k-c0x00ffffff-no-rj`,
      `https://yt3.ggpht.com/ytc/${channel.id}=s240-c-k-c0x00ffffff-no-rj`
    ];
    return patterns[0]; // Return the first pattern
  }

  // Final fallback
  return 'https://www.youtube.com/img/desktop/yt_1200.png';
};

interface ModernSearchCardProps {
  video?: YouTubeVideo;
  channel?: YouTubeChannel;
  size?: 'small' | 'medium' | 'large';
  onPlay?: (video: YouTubeVideo) => void;
  onAdd?: (video: YouTubeVideo) => void;
  onChannelClick?: (channel: YouTubeChannel) => void;
  showActions?: boolean;
  uniformHeight?: boolean;
}

const ModernSearchCard: React.FC<ModernSearchCardProps> = ({
  video,
  channel,
  size = 'medium',
  onPlay,
  onAdd,
  onChannelClick,
  showActions = true,
  uniformHeight = true,
}) => {
  const theme = useTheme();
  const { currentTheme } = useThemeContext();
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);

  // Get card dimensions based on size
  const getDimensions = () => {
    switch (size) {
      case 'small':
        return {
          height: uniformHeight ? 320 : 'auto',
          thumbnailHeight: 120,
          titleLines: 2,
          fontSize: '0.75rem',
          padding: 12,
        };
      case 'large':
        return {
          height: uniformHeight ? 480 : 'auto',
          thumbnailHeight: 200,
          titleLines: 3,
          fontSize: '0.9rem',
          padding: 16,
        };
      default: // medium
        return {
          height: uniformHeight ? 400 : 'auto',
          thumbnailHeight: 160,
          titleLines: 2,
          fontSize: '0.8rem',
          padding: 14,
        };
    }
  };

  const dimensions = getDimensions();

  // Video Card
  if (video) {
    const duration = parseDuration(video.duration);
    const durationText = formatTime(duration);

    return (
      <Card
        sx={{
          height: dimensions.height,
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${alpha(currentTheme.primary, 0.02)} 0%, ${alpha(currentTheme.secondary, 0.02)} 100%)`,
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: `0 12px 32px ${alpha(currentTheme.primary, 0.25)}`,
            borderColor: currentTheme.primary,
            '& .thumbnail-overlay': {
              opacity: 1,
            },
            '& .action-buttons': {
              opacity: 1,
              transform: 'translateY(0)',
            },
          },
        }}
      >
        {/* Thumbnail with overlay */}
        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
          <CardMedia
            component="img"
            height={dimensions.thumbnailHeight}
            image={video.thumbnail}
            alt={video.title}
            sx={{
              objectFit: 'cover',
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              },
            }}
          />
          
          {/* Duration badge */}
          {durationText && (
            <Chip
              label={durationText}
              size="small"
              sx={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                fontSize: '0.7rem',
                height: 20,
                '& .MuiChip-label': {
                  px: 1,
                },
              }}
            />
          )}

          {/* Hover overlay with play button */}
          <Box
            className="thumbnail-overlay"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.3s ease',
            }}
          >
            <IconButton
              onClick={() => onPlay?.(video)}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: currentTheme.primary,
                width: 56,
                height: 56,
                '&:hover': {
                  backgroundColor: 'white',
                  transform: 'scale(1.1)',
                },
              }}
            >
              <PlayIcon sx={{ fontSize: 32 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Content */}
        <CardContent
          sx={{
            flexGrow: 1,
            p: dimensions.padding,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {/* Title */}
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              display: '-webkit-box',
              WebkitLineClamp: dimensions.titleLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.3,
              fontSize: dimensions.fontSize,
              mb: 1,
            }}
          >
            {video.title}
          </Typography>

          {/* Channel */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: '0.75rem',
              fontWeight: 500,
              mb: 1,
            }}
          >
            {video.channelTitle}
          </Typography>

          {/* Metadata */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            {video.viewCount && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <VisibilityIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {formatViewCount(video.viewCount)}
                </Typography>
              </Box>
            )}
            {video.publishedAt && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {formatPublishDate(video.publishedAt)}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Action buttons */}
          {showActions && (
            <Box
              className="action-buttons"
              sx={{
                mt: 'auto',
                display: 'flex',
                gap: 1,
                opacity: 0.7,
                transform: 'translateY(4px)',
                transition: 'all 0.3s ease',
              }}
            >
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => onAdd?.(video)}
                sx={{
                  flex: 1,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  background: `linear-gradient(135deg, ${currentTheme.primary} 0%, ${currentTheme.secondary} 100%)`,
                }}
              >
                Add to Mix
              </Button>
              <IconButton
                size="small"
                onClick={() => onPlay?.(video)}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <PlayIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  }

  // Channel Card
  if (channel) {
    return (
      <Card
        onClick={() => onChannelClick?.(channel)}
        sx={{
          height: dimensions.height,
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${alpha(currentTheme.secondary, 0.02)} 0%, ${alpha(currentTheme.primary, 0.02)} 100%)`,
          '&:hover': {
            transform: 'translateY(-8px)',
            boxShadow: `0 12px 32px ${alpha(currentTheme.secondary, 0.25)}`,
            borderColor: currentTheme.secondary,
          },
        }}
      >
        <CardContent
          sx={{
            flexGrow: 1,
            p: dimensions.padding,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 2,
          }}
        >
          {/* Avatar with enhanced fallback handling */}
          <Avatar
            src={!imageError ? getChannelAvatarUrl(channel) : undefined}
            alt={channel.title}
            imgProps={{
              onLoad: () => {
                setImageLoaded(true);
                setImageError(false);
              },
              onError: (e) => {
                const target = e.target as HTMLImageElement;
                const currentSrc = target.src;

                console.log(`🖼️ Image failed to load for ${channel.title}: ${currentSrc}`);

                // Try different fallback strategies
                if (currentSrc.includes('AIdro_')) {
                  // Try a different pattern
                  target.src = `https://yt3.ggpht.com/a/default-user=s240-c-k-c0x00ffffff-no-rj`;
                } else if (currentSrc.includes('default-user')) {
                  // Try YouTube's generic channel icon
                  target.src = 'https://www.youtube.com/img/desktop/yt_1200.png';
                } else if (currentSrc.includes('yt_1200.png')) {
                  // Final fallback - show letter avatar
                  setImageError(true);
                  setImageLoaded(false);
                } else {
                  // Try one more fallback
                  target.src = `https://yt3.ggpht.com/a/default-user=s240-c-k-c0x00ffffff-no-rj`;
                }
              }
            }}
            sx={{
              width: 80,
              height: 80,
              bgcolor: channel.isTopicChannel
                ? theme.palette.warning.main
                : channel.isVevoChannel
                  ? theme.palette.error.main
                  : channel.isMusicChannel
                    ? theme.palette.info.main
                    : currentTheme.secondary,
              fontSize: '2rem',
              fontWeight: 600,
              border: `3px solid ${alpha(
                channel.isTopicChannel
                  ? theme.palette.warning.main
                  : channel.isVevoChannel
                    ? theme.palette.error.main
                    : channel.isMusicChannel
                      ? theme.palette.info.main
                      : currentTheme.secondary,
                0.2
              )}`,
              boxShadow: `0 4px 16px ${alpha(currentTheme.secondary, 0.3)}`,
              position: 'relative',
              ...(!imageLoaded && !imageError && {
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `linear-gradient(45deg, ${alpha(currentTheme.primary, 0.1)} 25%, transparent 25%, transparent 75%, ${alpha(currentTheme.primary, 0.1)} 75%)`,
                  backgroundSize: '20px 20px',
                  animation: 'shimmer 1.5s infinite linear',
                  borderRadius: '50%',
                },
                '@keyframes shimmer': {
                  '0%': { backgroundPosition: '0 0' },
                  '100%': { backgroundPosition: '40px 40px' },
                },
              }),
            }}
          >
            {channel.title.charAt(0).toUpperCase()}
          </Avatar>

          {/* Title with Channel Type Badge */}
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.3,
                fontSize: dimensions.fontSize,
                mb: 1,
              }}
            >
              {channel.title}
            </Typography>

            {/* Channel Type Badge */}
            {(channel.isTopicChannel || channel.isVevoChannel || channel.isMusicChannel) && (
              <Chip
                label={
                  channel.isTopicChannel
                    ? '🎵 Official Artist'
                    : channel.isVevoChannel
                      ? '🎬 VEVO'
                      : '🎶 Music Channel'
                }
                size="small"
                sx={{
                  backgroundColor: channel.isTopicChannel
                    ? alpha(theme.palette.warning.main, 0.2)
                    : channel.isVevoChannel
                      ? alpha(theme.palette.error.main, 0.2)
                      : alpha(theme.palette.info.main, 0.2),
                  color: channel.isTopicChannel
                    ? theme.palette.warning.main
                    : channel.isVevoChannel
                      ? theme.palette.error.main
                      : theme.palette.info.main,
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  height: 20,
                }}
              />
            )}
          </Box>

          {/* Enhanced Stats */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', alignItems: 'center' }}>
            {/* Subscriber Count */}
            {channel.subscriberCount && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {formatViewCount(channel.subscriberCount).replace('views', 'subscribers')}
                </Typography>
              </Box>
            )}

            {/* Video Count */}
            {channel.videoCount && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PlayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {formatViewCount(channel.videoCount)} videos
                </Typography>
              </Box>
            )}

            {/* Latest Video Info */}
            {channel.latestVideoTitle && (
              <Box sx={{ textAlign: 'center', mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block' }}>
                  Latest Video:
                </Typography>
                <Typography
                  variant="caption"
                  color="text.primary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.2,
                    fontSize: '0.7rem',
                  }}
                >
                  {channel.latestVideoTitle}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Description */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4,
              fontSize: '0.8rem',
              flexGrow: 1,
            }}
          >
            {channel.description || 'No description available'}
          </Typography>

          {/* Click indicator */}
          <Box
            sx={{
              mt: 'auto',
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <Typography
              variant="caption"
              color="primary"
              sx={{
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                mb: 0.5,
              }}
            >
              <PlayIcon sx={{ fontSize: 14 }} />
              Click to browse videos
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: '0.65rem',
                fontStyle: 'italic',
                display: 'block',
              }}
            >
              Note: Some channels may be restricted
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default ModernSearchCard;
