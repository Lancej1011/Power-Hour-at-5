import React, { useRef, useEffect } from 'react';
import { useThemeContext } from '../../contexts/ThemeContext';
import { VisualizerSettings } from '../../contexts/VisualizerContext';
import { EnhancedAudioAnalysisData } from '../../hooks/useEnhancedAudioAnalysis';

interface MandalaVisualizerProps {
  analysisData: EnhancedAudioAnalysisData;
  width: number;
  height: number;
  settings: VisualizerSettings;
}

const MandalaVisualizer: React.FC<MandalaVisualizerProps> = ({
  analysisData,
  width,
  height,
  settings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentTheme } = useThemeContext();
  const timeRef = useRef<number>(0);
  const rotationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const draw = () => {
      timeRef.current += 0.016; // ~60fps
      
      // Clear with motion blur or solid background
      if (settings.motionBlur) {
        ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + settings.backgroundOpacity * 0.1})`;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = `rgba(0, 0, 0, ${settings.backgroundOpacity})`;
        ctx.fillRect(0, 0, width, height);
      }

      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) * 0.4;

      if (!analysisData.isActive) {
        drawIdleMandala(ctx, centerX, centerY, maxRadius);
        return;
      }

      const { frequencyData, beatDetected, beatStrength, bassLevel, midLevel, trebleLevel, frequencyBands } = analysisData;
      
      // Update rotation based on beat
      if (beatDetected && settings.beatReactive) {
        rotationRef.current += beatStrength * 0.1;
      } else {
        rotationRef.current += 0.005;
      }

      drawMandala(ctx, centerX, centerY, maxRadius, frequencyData, frequencyBands, bassLevel, midLevel, trebleLevel, beatStrength);
    };

    const drawIdleMandala = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, maxRadius: number) => {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(timeRef.current * 0.5);

      const layers = 6;
      for (let layer = 0; layer < layers; layer++) {
        const radius = (maxRadius / layers) * (layer + 1);
        const segments = 8 + layer * 4;
        
        for (let i = 0; i < segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          ctx.fillStyle = `${currentTheme.primary}20`;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    };

    const drawMandala = (
      ctx: CanvasRenderingContext2D,
      centerX: number,
      centerY: number,
      maxRadius: number,
      frequencyData: Uint8Array,
      frequencyBands: number[],
      bassLevel: number,
      midLevel: number,
      trebleLevel: number,
      beatStrength: number
    ) => {
      ctx.save();
      ctx.translate(centerX, centerY);

      // Main mandala layers
      const layers = Math.min(frequencyBands.length, 8);
      
      for (let layer = 0; layer < layers; layer++) {
        const bandValue = frequencyBands[layer] * settings.sensitivity;
        const radius = (maxRadius / layers) * (layer + 1) * (0.5 + bandValue * 0.5);
        const segments = 6 + layer * 3;
        
        ctx.save();
        ctx.rotate(rotationRef.current + layer * 0.1);

        // Draw geometric patterns for each layer
        drawGeometricLayer(ctx, radius, segments, bandValue, layer);
        
        ctx.restore();
      }

      // Central core that pulses with bass
      const coreRadius = bassLevel * 30 + 10;
      const coreColor = getLayerColor(0, bassLevel);
      
      if (settings.glowEffect) {
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = bassLevel * settings.bloomIntensity * 30;
      }
      
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Outer ring patterns based on treble
      if (trebleLevel > 0.2) {
        drawOuterRings(ctx, maxRadius, trebleLevel);
      }

      // Beat reactive burst
      if (settings.beatReactive && beatStrength > 1.5) {
        drawBeatBurst(ctx, maxRadius, beatStrength);
      }

      ctx.restore();
    };

    const drawGeometricLayer = (ctx: CanvasRenderingContext2D, radius: number, segments: number, intensity: number, layer: number) => {
      const color = getLayerColor(layer, intensity);
      
      // Draw connecting lines between segments
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, intensity * 3);
      
      if (settings.glowEffect && intensity > 0.3) {
        ctx.shadowColor = color;
        ctx.shadowBlur = intensity * settings.bloomIntensity * 10;
      }

      for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;
        
        const x1 = Math.cos(angle1) * radius;
        const y1 = Math.sin(angle1) * radius;
        const x2 = Math.cos(angle2) * radius;
        const y2 = Math.sin(angle2) * radius;

        // Draw segment line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw nodes at segment points
        const nodeSize = intensity * 5 + 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x1, y1, nodeSize, 0, Math.PI * 2);
        ctx.fill();

        // Draw inner connections for complex patterns
        if (layer % 2 === 0 && intensity > 0.4) {
          const innerRadius = radius * 0.6;
          const innerX = Math.cos(angle1) * innerRadius;
          const innerY = Math.sin(angle1) * innerRadius;
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(innerX, innerY);
          ctx.stroke();
        }
      }

      ctx.shadowBlur = 0;
    };

    const drawOuterRings = (ctx: CanvasRenderingContext2D, maxRadius: number, trebleLevel: number) => {
      const rings = 3;
      const color = getLayerColor(7, trebleLevel);
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      
      if (settings.glowEffect) {
        ctx.shadowColor = color;
        ctx.shadowBlur = trebleLevel * settings.bloomIntensity * 15;
      }

      for (let i = 0; i < rings; i++) {
        const ringRadius = maxRadius + (i + 1) * 20 * trebleLevel;
        const alpha = trebleLevel * (1 - i * 0.3);
        
        ctx.strokeStyle = color.replace(/[\d.]+\)$/g, `${alpha})`);
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
    };

    const drawBeatBurst = (ctx: CanvasRenderingContext2D, maxRadius: number, beatStrength: number) => {
      const rays = 12;
      const burstRadius = maxRadius * 1.2 * (beatStrength / 3);
      const color = getLayerColor(0, beatStrength / 3);
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      
      if (settings.glowEffect) {
        ctx.shadowColor = color;
        ctx.shadowBlur = beatStrength * settings.bloomIntensity * 20;
      }

      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2;
        const x = Math.cos(angle) * burstRadius;
        const y = Math.sin(angle) * burstRadius;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
    };

    const getLayerColor = (layer: number, intensity: number): string => {
      switch (settings.colorMode) {
        case 'gradient':
          return getGradientColor(layer / 8, intensity);
        case 'reactive':
          return getReactiveColor(intensity);
        case 'frequency':
          return getFrequencyColor(layer / 8, intensity);
        case 'rainbow':
          const hue = (layer * 45 + timeRef.current * settings.colorCycleSpeed * 30) % 360;
          return `hsla(${hue}, 70%, ${50 + intensity * 30}%, ${0.5 + intensity * 0.5})`;
        case 'custom':
          return settings.customColor;
        case 'theme':
        default:
          const r = parseInt(currentTheme.primary.slice(1, 3), 16);
          const g = parseInt(currentTheme.primary.slice(3, 5), 16);
          const b = parseInt(currentTheme.primary.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.7})`;
      }
    };

    const getGradientColor = (position: number, intensity: number): string => {
      const colors = settings.gradientColors;
      const index = Math.floor(position * (colors.length - 1));
      const selectedColor = colors[Math.min(index, colors.length - 1)];
      
      const r = parseInt(selectedColor.slice(1, 3), 16);
      const g = parseInt(selectedColor.slice(3, 5), 16);
      const b = parseInt(selectedColor.slice(5, 7), 16);
      
      return `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.7})`;
    };

    const getReactiveColor = (intensity: number): string => {
      const r = Math.floor(255 * intensity);
      const g = Math.floor(128 + 127 * intensity);
      const b = Math.floor(255 * (1 - intensity));
      
      return `rgba(${r}, ${g}, ${b}, ${0.3 + intensity * 0.7})`;
    };

    const getFrequencyColor = (position: number, intensity: number): string => {
      const hue = position * 300; // Map to color spectrum
      return `hsla(${hue}, 70%, ${40 + intensity * 40}%, ${0.3 + intensity * 0.7})`;
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

export default MandalaVisualizer;
