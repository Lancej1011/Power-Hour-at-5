import React, { useRef, useEffect } from 'react';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useVisualizer } from '../../contexts/VisualizerContext';
import { AudioAnalysisData } from '../../hooks/useAudioAnalysis';

interface BarVisualizerProps {
  analysisData: AudioAnalysisData;
  width: number;
  height: number;
}

const BarVisualizer: React.FC<BarVisualizerProps> = ({ analysisData, width, height }) => {
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
      const barCount = Math.min(settings.barCount, frequencyData.length);
      const barWidth = width / barCount;
      const maxBarHeight = height * 0.8;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * frequencyData.length);
        const amplitude = (frequencyData[dataIndex] / 255) * settings.sensitivity;
        const barHeight = amplitude * maxBarHeight;

        const x = i * barWidth;
        const y = height - barHeight;

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

        // Draw bar with gradient
        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, color.replace(/[\d.]+\)$/g, '0.1)'));

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - 1, barHeight);

        // Add glow effect for high frequencies
        if (amplitude > 0.7) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          ctx.fillRect(x, y, barWidth - 1, barHeight);
          ctx.shadowBlur = 0;
        }
      }
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

export default BarVisualizer;
