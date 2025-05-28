import React, { useRef, useEffect } from 'react';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useVisualizer } from '../../contexts/VisualizerContext';
import { AudioAnalysisData } from '../../hooks/useAudioAnalysis';

interface CircularVisualizerProps {
  analysisData: AudioAnalysisData;
  width: number;
  height: number;
}

const CircularVisualizer: React.FC<CircularVisualizerProps> = ({ analysisData, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentTheme } = useThemeContext();
  const { settings } = useVisualizer();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    const draw = () => {
      if (!analysisData.isActive) {
        // Clear canvas when not active
        ctx.fillStyle = `rgba(0, 0, 0, ${settings.backgroundOpacity})`;
        ctx.fillRect(0, 0, width, height);
        return;
      }

      // Clear with semi-transparent background for trail effect
      ctx.fillStyle = `rgba(0, 0, 0, ${settings.backgroundOpacity})`;
      ctx.fillRect(0, 0, width, height);

      const { frequencyData } = analysisData;
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) * 0.4;
      const minRadius = maxRadius * 0.2;

      const barCount = Math.min(settings.barCount, frequencyData.length);
      const angleStep = (Math.PI * 2) / barCount;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * frequencyData.length);
        const amplitude = (frequencyData[dataIndex] / 255) * settings.sensitivity;
        const barLength = amplitude * (maxRadius - minRadius);

        const angle = i * angleStep - Math.PI / 2; // Start from top
        const innerX = centerX + Math.cos(angle) * minRadius;
        const innerY = centerY + Math.sin(angle) * minRadius;
        const outerX = centerX + Math.cos(angle) * (minRadius + barLength);
        const outerY = centerY + Math.sin(angle) * (minRadius + barLength);

        // Color based on settings
        let color: string;
        switch (settings.colorMode) {
          case 'rainbow':
            const hue = (i / barCount) * 360;
            color = `hsl(${hue}, 70%, 60%)`;
            break;
          case 'custom':
            color = settings.customColor;
            break;
          case 'theme':
          default:
            // Use theme colors with frequency-based intensity
            const intensity = Math.min(amplitude * 2, 1);
            const r = parseInt(currentTheme.primary.slice(1, 3), 16);
            const g = parseInt(currentTheme.primary.slice(3, 5), 16);
            const b = parseInt(currentTheme.primary.slice(5, 7), 16);
            color = `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.7})`;
            break;
        }

        // Draw radial bar
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, (width + height) / 400);
        ctx.beginPath();
        ctx.moveTo(innerX, innerY);
        ctx.lineTo(outerX, outerY);
        ctx.stroke();

        // Add glow effect for high frequencies
        if (amplitude > 0.7) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 15;
          ctx.lineWidth = Math.max(2, (width + height) / 300);
          ctx.beginPath();
          ctx.moveTo(innerX, innerY);
          ctx.lineTo(outerX, outerY);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // Draw center circle
      ctx.fillStyle = currentTheme.primary;
      ctx.beginPath();
      ctx.arc(centerX, centerY, minRadius * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Draw outer ring
      ctx.strokeStyle = currentTheme.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, minRadius, 0, Math.PI * 2);
      ctx.stroke();
    };

    draw();
  }, [analysisData, width, height, currentTheme, settings]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
};

export default CircularVisualizer;
