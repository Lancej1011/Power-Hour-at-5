import React, { useRef, useEffect } from 'react';
import { useThemeContext } from '../../contexts/ThemeContext';
import { VisualizerSettings } from '../../contexts/VisualizerContext';
import { EnhancedAudioAnalysisData } from '../../hooks/useEnhancedAudioAnalysis';

interface SpectrumVisualizerProps {
  analysisData: EnhancedAudioAnalysisData;
  width: number;
  height: number;
  settings: VisualizerSettings;
}

const SpectrumVisualizer: React.FC<SpectrumVisualizerProps> = ({
  analysisData,
  width,
  height,
  settings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentTheme } = useThemeContext();
  const previousDataRef = useRef<Uint8Array>(new Uint8Array(1024));
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const draw = () => {
      timeRef.current += 0.016; // ~60fps

      // Clear with motion blur effect
      if (settings.motionBlur) {
        ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + settings.backgroundOpacity})`;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = `rgba(0, 0, 0, ${settings.backgroundOpacity})`;
        ctx.fillRect(0, 0, width, height);
      }

      if (!analysisData.isActive) {
        // Draw idle state
        drawIdleSpectrum(ctx);
        return;
      }

      const { frequencyData, beatDetected, beatStrength, bassLevel, midLevel, trebleLevel } = analysisData;
      
      // Apply smoothing
      for (let i = 0; i < frequencyData.length; i++) {
        previousDataRef.current[i] = previousDataRef.current[i] * settings.smoothing + 
                                    frequencyData[i] * (1 - settings.smoothing);
      }

      drawSpectrum(ctx, previousDataRef.current, beatDetected, beatStrength, bassLevel, midLevel, trebleLevel);
    };

    const drawIdleSpectrum = (ctx: CanvasRenderingContext2D) => {
      const centerY = height / 2;
      const barCount = settings.barCount;
      const barWidth = width / barCount;

      for (let i = 0; i < barCount; i++) {
        const x = i * barWidth;
        const idleHeight = Math.sin(timeRef.current * 2 + i * 0.1) * 20 + 30;
        
        ctx.fillStyle = `${currentTheme.primary}40`;
        ctx.fillRect(x, centerY - idleHeight / 2, barWidth - 1, idleHeight);
      }
    };

    const drawSpectrum = (
      ctx: CanvasRenderingContext2D, 
      frequencyData: Uint8Array, 
      beatDetected: boolean, 
      beatStrength: number,
      bassLevel: number,
      midLevel: number,
      trebleLevel: number
    ) => {
      const barCount = settings.barCount;
      const barWidth = width / barCount;
      const maxBarHeight = height * 0.8;

      // Beat reactive scaling
      const beatScale = settings.beatReactive && beatDetected ? 1 + beatStrength * 0.3 : 1;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * frequencyData.length);
        let amplitude = (frequencyData[dataIndex] / 255) * settings.sensitivity * beatScale;
        
        // Logarithmic scaling for better visual distribution
        amplitude = Math.pow(amplitude, 0.7);
        
        const barHeight = amplitude * maxBarHeight;
        const x = i * barWidth;
        const y = height - barHeight;

        // Color calculation
        let color = getBarColor(i, barCount, amplitude, bassLevel, midLevel, trebleLevel);

        // Enhanced glow effect
        if (settings.glowEffect && amplitude > 0.3) {
          const glowIntensity = amplitude * settings.bloomIntensity;
          ctx.shadowColor = color;
          ctx.shadowBlur = glowIntensity * 20;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        // Draw main bar with gradient
        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.7, color.replace(/[\d.]+\)$/g, '0.8)'));
        gradient.addColorStop(1, color.replace(/[\d.]+\)$/g, '0.2)'));

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - 1, barHeight);

        // Draw reflection
        if (settings.renderQuality !== 'low') {
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

        // Peak dots for high frequencies
        if (amplitude > 0.8 && settings.renderQuality === 'ultra') {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x + barWidth / 2, y - 5, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Reset shadow
        ctx.shadowBlur = 0;
      }

      // Draw frequency band indicators
      if (settings.frequencyColorMapping) {
        drawFrequencyBands(ctx, bassLevel, midLevel, trebleLevel);
      }
    };

    const getBarColor = (
      index: number, 
      total: number, 
      amplitude: number, 
      bassLevel: number, 
      midLevel: number, 
      trebleLevel: number
    ): string => {
      const position = index / total;

      switch (settings.colorMode) {
        case 'gradient':
          return getGradientColor(position, amplitude);
        case 'reactive':
          return getReactiveColor(amplitude, bassLevel, midLevel, trebleLevel);
        case 'frequency':
          return getFrequencyColor(position, amplitude);
        case 'rainbow':
          const hue = (position * 360 + timeRef.current * settings.colorCycleSpeed * 50) % 360;
          return `hsla(${hue}, 70%, ${50 + amplitude * 30}%, ${0.7 + amplitude * 0.3})`;
        case 'custom':
          return settings.customColor;
        case 'theme':
        default:
          const intensity = Math.min(amplitude * 2, 1);
          const r = parseInt(currentTheme.primary.slice(1, 3), 16);
          const g = parseInt(currentTheme.primary.slice(3, 5), 16);
          const b = parseInt(currentTheme.primary.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${0.4 + intensity * 0.6})`;
      }
    };

    const getGradientColor = (position: number, amplitude: number): string => {
      const colors = settings.gradientColors;
      const scaledPos = position * (colors.length - 1);
      const index = Math.floor(scaledPos);
      const fraction = scaledPos - index;
      
      if (index >= colors.length - 1) {
        return colors[colors.length - 1];
      }
      
      // Simple color interpolation
      const color1 = colors[index];
      const color2 = colors[index + 1];
      
      // For simplicity, return the nearest color with amplitude-based alpha
      const selectedColor = fraction < 0.5 ? color1 : color2;
      const alpha = 0.4 + amplitude * 0.6;
      
      // Convert hex to rgba
      const r = parseInt(selectedColor.slice(1, 3), 16);
      const g = parseInt(selectedColor.slice(3, 5), 16);
      const b = parseInt(selectedColor.slice(5, 7), 16);
      
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const getReactiveColor = (amplitude: number, bassLevel: number, midLevel: number, trebleLevel: number): string => {
      const r = Math.floor(255 * bassLevel);
      const g = Math.floor(255 * midLevel);
      const b = Math.floor(255 * trebleLevel);
      const alpha = 0.4 + amplitude * 0.6;
      
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const getFrequencyColor = (position: number, amplitude: number): string => {
      // Map frequency position to color spectrum
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
      const alpha = 0.4 + amplitude * 0.6;
      
      return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
    };

    const drawFrequencyBands = (ctx: CanvasRenderingContext2D, bassLevel: number, midLevel: number, trebleLevel: number) => {
      const bandHeight = 10;
      const y = height - bandHeight - 5;
      
      // Bass indicator
      ctx.fillStyle = `rgba(255, 0, 0, ${bassLevel})`;
      ctx.fillRect(10, y, 50, bandHeight);
      
      // Mid indicator
      ctx.fillStyle = `rgba(0, 255, 0, ${midLevel})`;
      ctx.fillRect(70, y, 50, bandHeight);
      
      // Treble indicator
      ctx.fillStyle = `rgba(0, 0, 255, ${trebleLevel})`;
      ctx.fillRect(130, y, 50, bandHeight);
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

export default SpectrumVisualizer;
