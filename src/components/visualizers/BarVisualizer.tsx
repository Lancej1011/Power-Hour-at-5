import React, { useRef, useEffect } from 'react';
import { useThemeContext } from '../../contexts/ThemeContext';
import { VisualizerSettings } from '../../contexts/VisualizerContext';
import { EnhancedAudioAnalysisData } from '../../hooks/useEnhancedAudioAnalysis';

interface BarVisualizerProps {
  analysisData: EnhancedAudioAnalysisData;
  width: number;
  height: number;
  settings: VisualizerSettings;
}

const BarVisualizer: React.FC<BarVisualizerProps> = ({ analysisData, width, height, settings }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentTheme } = useThemeContext();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    const getBarColor = (index: number, total: number, amplitude: number, bassLevel: number, midLevel: number, trebleLevel: number): string => {
      const position = index / total;

      switch (settings.colorMode) {
        case 'gradient':
          const colors = settings.gradientColors;
          const scaledPos = position * (colors.length - 1);
          const colorIndex = Math.floor(scaledPos);
          const selectedColor = colors[Math.min(colorIndex, colors.length - 1)];

          const rGrad = parseInt(selectedColor.slice(1, 3), 16);
          const gGrad = parseInt(selectedColor.slice(3, 5), 16);
          const bGrad = parseInt(selectedColor.slice(5, 7), 16);

          return `rgba(${rGrad}, ${gGrad}, ${bGrad}, ${0.4 + amplitude * 0.6})`;
        case 'reactive':
          const rReactive = Math.floor(255 * bassLevel);
          const gReactive = Math.floor(255 * midLevel);
          const bReactive = Math.floor(255 * trebleLevel);
          const alphaReactive = 0.4 + amplitude * 0.6;

          return `rgba(${rReactive}, ${gReactive}, ${bReactive}, ${alphaReactive})`;
        case 'frequency':
          let hue: number;
          if (position < 0.33) {
            hue = 0; // Red for bass
          } else if (position < 0.66) {
            hue = 120; // Green for mids
          } else {
            hue = 240; // Blue for treble
          }

          const saturation = 70 + amplitude * 30;
          const lightness = 40 + amplitude * 40;
          const alphaFreq = 0.4 + amplitude * 0.6;

          return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alphaFreq})`;
        case 'rainbow':
          const hueRainbow = (position * 360) % 360;
          return `hsla(${hueRainbow}, 70%, ${50 + amplitude * 30}%, ${0.7 + amplitude * 0.3})`;
        case 'custom':
          return settings.customColor;
        case 'theme':
        default:
          const intensity = Math.min(amplitude * 2, 1);
          const rTheme = parseInt(currentTheme.primary.slice(1, 3), 16);
          const gTheme = parseInt(currentTheme.primary.slice(3, 5), 16);
          const bTheme = parseInt(currentTheme.primary.slice(5, 7), 16);
          return `rgba(${rTheme}, ${gTheme}, ${bTheme}, ${0.3 + intensity * 0.7})`;
      }
    };

    const draw = () => {
      if (!analysisData.isActive) {
        // Clear canvas when not active
        ctx.fillStyle = `rgba(0, 0, 0, ${settings.backgroundOpacity})`;
        ctx.fillRect(0, 0, width, height);
        return;
      }

      // Clear with motion blur or solid background
      if (settings.motionBlur) {
        ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + settings.backgroundOpacity * 0.1})`;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = `rgba(0, 0, 0, ${settings.backgroundOpacity})`;
        ctx.fillRect(0, 0, width, height);
      }

      const { frequencyData, beatDetected, beatStrength, bassLevel, midLevel, trebleLevel } = analysisData;
      const barCount = Math.min(settings.barCount, frequencyData.length);
      const barWidth = width / barCount;
      const maxBarHeight = height * 0.8;

      // Beat reactive scaling
      const beatScale = settings.beatReactive && beatDetected ? 1 + beatStrength * 0.2 : 1;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * frequencyData.length);
        let amplitude = (frequencyData[dataIndex] / 255) * settings.sensitivity * beatScale;

        const barHeight = amplitude * maxBarHeight;
        const x = i * barWidth;
        const y = height - barHeight;

        // Enhanced color calculation
        const color = getBarColor(i, barCount, amplitude, bassLevel || 0, midLevel || 0, trebleLevel || 0);

        // Enhanced glow effect
        if (settings.glowEffect && amplitude > 0.3) {
          const glowIntensity = amplitude * settings.bloomIntensity;
          ctx.shadowColor = color;
          ctx.shadowBlur = glowIntensity * 15;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        // Draw bar with enhanced gradient
        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.7, color.replace(/[\d.]+\)$/g, '0.8)'));
        gradient.addColorStop(1, color.replace(/[\d.]+\)$/g, '0.2)'));

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - 1, barHeight);

        // Draw reflection for high quality
        if (settings.renderQuality !== 'low' && amplitude > 0.2) {
          const reflectionGradient = ctx.createLinearGradient(0, height, 0, height + barHeight * 0.3);
          reflectionGradient.addColorStop(0, color.replace(/[\d.]+\)$/g, '0.3)'));
          reflectionGradient.addColorStop(1, color.replace(/[\d.]+\)$/g, '0.0)'));

          ctx.save();
          ctx.scale(1, -1);
          ctx.translate(0, -height * 2);
          ctx.fillStyle = reflectionGradient;
          ctx.fillRect(x, y, barWidth - 1, barHeight * 0.3);
          ctx.restore();
        }

        // Reset shadow
        ctx.shadowBlur = 0;
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
