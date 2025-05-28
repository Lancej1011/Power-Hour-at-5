import React, { useRef, useEffect } from 'react';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useVisualizer } from '../../contexts/VisualizerContext';
import { AudioAnalysisData } from '../../hooks/useAudioAnalysis';

interface WaveformVisualizerProps {
  analysisData: AudioAnalysisData;
  width: number;
  height: number;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ analysisData, width, height }) => {
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
        
        // Draw center line
        ctx.strokeStyle = currentTheme.primary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        return;
      }

      // Clear with semi-transparent background for trail effect
      ctx.fillStyle = `rgba(0, 0, 0, ${settings.backgroundOpacity})`;
      ctx.fillRect(0, 0, width, height);

      const { waveformData, frequencyData } = analysisData;
      const centerY = height / 2;
      const maxAmplitude = height * 0.4 * settings.sensitivity;

      // Draw main waveform
      ctx.strokeStyle = currentTheme.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();

      const step = width / waveformData.length;
      for (let i = 0; i < waveformData.length; i++) {
        const x = i * step;
        const sample = (waveformData[i] - 128) / 128; // Normalize to -1 to 1
        const y = centerY + sample * maxAmplitude;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Add frequency-based color overlay
      if (settings.colorMode === 'rainbow') {
        // Create rainbow gradient based on frequency data
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        const segmentCount = Math.min(10, frequencyData.length / 10);
        
        for (let i = 0; i < segmentCount; i++) {
          const position = i / (segmentCount - 1);
          const freqIndex = Math.floor((i / segmentCount) * frequencyData.length);
          const intensity = frequencyData[freqIndex] / 255;
          const hue = position * 360;
          gradient.addColorStop(position, `hsla(${hue}, 70%, 60%, ${intensity})`);
        }

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let i = 0; i < waveformData.length; i++) {
          const x = i * step;
          const sample = (waveformData[i] - 128) / 128;
          const y = centerY + sample * maxAmplitude;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Add glow effect based on volume
      if (analysisData.volume > 0.3) {
        ctx.shadowColor = currentTheme.primary;
        ctx.shadowBlur = analysisData.volume * 20;
        ctx.strokeStyle = currentTheme.primary;
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < waveformData.length; i++) {
          const x = i * step;
          const sample = (waveformData[i] - 128) / 128;
          const y = centerY + sample * maxAmplitude;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw center reference line
      ctx.strokeStyle = `${currentTheme.primary}40`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
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

export default WaveformVisualizer;
