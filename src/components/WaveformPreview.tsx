import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface WaveformPreviewProps {
  audioPath?: string;
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  showProgress?: boolean;
  currentTime?: number;
  duration?: number;
  onClick?: (time: number) => void;
}

const WaveformPreview: React.FC<WaveformPreviewProps> = ({
  audioPath,
  width = 200,
  height = 40,
  color,
  backgroundColor,
  showProgress = false,
  currentTime = 0,
  duration = 0,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  const waveColor = color || theme.palette.primary.main;
  const bgColor = backgroundColor || theme.palette.background.paper;

  useEffect(() => {
    if (!audioPath) return;

    const generateWaveform = async () => {
      setLoading(true);
      setError(null);

      try {
        // Create audio context
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Fetch audio file
        const response = await fetch(audioPath);
        const arrayBuffer = await response.arrayBuffer();
        
        // Decode audio data
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Get channel data (use first channel)
        const channelData = audioBuffer.getChannelData(0);
        
        // Generate waveform data points
        const samples = Math.min(width, 500); // Limit samples for performance
        const blockSize = Math.floor(channelData.length / samples);
        const waveData: number[] = [];
        
        for (let i = 0; i < samples; i++) {
          const start = i * blockSize;
          const end = start + blockSize;
          let sum = 0;
          
          // Calculate RMS (Root Mean Square) for this block
          for (let j = start; j < end && j < channelData.length; j++) {
            sum += channelData[j] * channelData[j];
          }
          
          const rms = Math.sqrt(sum / blockSize);
          waveData.push(rms);
        }
        
        // Normalize the data
        const maxValue = Math.max(...waveData);
        const normalizedData = waveData.map(value => (value / maxValue) || 0);
        
        setWaveformData(normalizedData);
        audioContext.close();
      } catch (err) {
        console.error('Error generating waveform:', err);
        setError('Failed to generate waveform');
        
        // Generate fake waveform data as fallback
        const fakeData = Array.from({ length: Math.min(width, 100) }, () => Math.random() * 0.8 + 0.1);
        setWaveformData(fakeData);
      } finally {
        setLoading(false);
      }
    };

    generateWaveform();
  }, [audioPath, width]);

  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    const barWidth = width / waveformData.length;
    const centerY = height / 2;

    ctx.fillStyle = waveColor;

    waveformData.forEach((amplitude, index) => {
      const barHeight = amplitude * height * 0.8; // Use 80% of height
      const x = index * barWidth;
      const y = centerY - barHeight / 2;

      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
    });

    // Draw progress indicator
    if (showProgress && duration > 0) {
      const progressX = (currentTime / duration) * width;
      
      // Draw progress line
      ctx.strokeStyle = theme.palette.secondary.main;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();

      // Draw played portion with different color
      ctx.fillStyle = theme.palette.secondary.main + '40'; // 40% opacity
      ctx.fillRect(0, 0, progressX, height);
    }
  }, [waveformData, width, height, waveColor, bgColor, showProgress, currentTime, duration, theme]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onClick || !duration) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const clickTime = (x / width) * duration;
    
    onClick(clickTime);
  };

  if (loading) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bgColor,
          borderRadius: 1,
        }}
      >
        <CircularProgress size={20} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bgColor,
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          No waveform
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width,
        height,
        borderRadius: 1,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </Box>
  );
};

export default WaveformPreview;
