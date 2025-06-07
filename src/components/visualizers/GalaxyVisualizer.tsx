import React, { useRef, useEffect } from 'react';
import { useThemeContext } from '../../contexts/ThemeContext';
import { VisualizerSettings } from '../../contexts/VisualizerContext';
import { EnhancedAudioAnalysisData } from '../../hooks/useEnhancedAudioAnalysis';

interface GalaxyVisualizerProps {
  analysisData: EnhancedAudioAnalysisData;
  width: number;
  height: number;
  settings: VisualizerSettings;
}

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  brightness: number;
  color: string;
  twinkle: number;
}

interface Planet {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  color: string;
  intensity: number;
}

const GalaxyVisualizer: React.FC<GalaxyVisualizerProps> = ({
  analysisData,
  width,
  height,
  settings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentTheme } = useThemeContext();
  const starsRef = useRef<Star[]>([]);
  const planetsRef = useRef<Planet[]>([]);
  const timeRef = useRef<number>(0);
  const galaxyRotationRef = useRef<number>(0);

  const getStarColor = (): string => {
    const colors = ['#ffffff', '#ffffcc', '#ffcc99', '#ff9999', '#99ccff', '#ccccff'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getPlanetColor = (index: number): string => {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
      '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'
    ];
    return colors[index % colors.length];
  };

  // Initialize stars and planets
  useEffect(() => {
    // Create starfield
    const starCount = Math.min(settings.particleCount * 2, 500);
    starsRef.current = [];

    for (let i = 0; i < starCount; i++) {
      starsRef.current.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 1000,
        size: Math.random() * 3 + 1,
        brightness: Math.random(),
        color: getStarColor(),
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    // Create planets
    planetsRef.current = [];
    const planetCount = 8;

    for (let i = 0; i < planetCount; i++) {
      planetsRef.current.push({
        angle: (i / planetCount) * Math.PI * 2,
        radius: 100 + i * 50,
        speed: 0.01 + i * 0.005,
        size: 10 + i * 3,
        color: getPlanetColor(i),
        intensity: 0,
      });
    }
  }, [width, height, settings.particleCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const draw = () => {
      timeRef.current += 0.016; // ~60fps

      // Clear with space background
      ctx.fillStyle = `rgba(5, 5, 15, ${settings.backgroundOpacity})`;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      if (!analysisData.isActive) {
        drawIdleGalaxy(ctx, centerX, centerY);
        return;
      }

      const { frequencyData, beatDetected, beatStrength, bassLevel, midLevel, trebleLevel, frequencyBands } = analysisData;

      // Update galaxy rotation based on music
      galaxyRotationRef.current += 0.002 + bassLevel * 0.01;

      // Update planet intensities based on frequency bands
      updatePlanets(frequencyBands, beatDetected, beatStrength);

      // Draw components
      drawStarfield(ctx);
      drawGalaxySpiral(ctx, centerX, centerY, frequencyData);
      drawPlanets(ctx, centerX, centerY);
      drawNebula(ctx, centerX, centerY, bassLevel, midLevel, trebleLevel);

      if (beatDetected && settings.beatReactive) {
        drawSupernova(ctx, centerX, centerY, beatStrength);
      }
    };

    const drawIdleGalaxy = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
      galaxyRotationRef.current += 0.001;

      // Draw gentle starfield
      drawStarfield(ctx, 0.3);

      // Draw idle spiral
      const arms = 4;
      const maxRadius = Math.min(width, height) * 0.3;

      for (let arm = 0; arm < arms; arm++) {
        const armAngle = (arm / arms) * Math.PI * 2 + galaxyRotationRef.current;

        ctx.strokeStyle = `${currentTheme.primary}30`;
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let r = 0; r < maxRadius; r += 5) {
          const angle = armAngle + r * 0.01;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (r === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    };

    const drawStarfield = (ctx: CanvasRenderingContext2D, intensityMultiplier: number = 1) => {
      starsRef.current.forEach(star => {
        // Update twinkle
        star.twinkle += 0.1;

        const twinkleIntensity = (Math.sin(star.twinkle) + 1) / 2;
        const brightness = star.brightness * twinkleIntensity * intensityMultiplier;

        if (brightness > 0.1) {
          const alpha = brightness * 0.8;
          const size = star.size * (0.5 + brightness * 0.5);

          // Glow effect for bright stars
          if (settings.glowEffect && brightness > 0.7) {
            ctx.shadowColor = star.color;
            ctx.shadowBlur = size * settings.bloomIntensity * 3;
          }

          ctx.fillStyle = star.color.replace(/[\d.]+\)$/g, `${alpha})`);
          ctx.beginPath();
          ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowBlur = 0;
        }
      });
    };

    const drawGalaxySpiral = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, frequencyData: Uint8Array) => {
      const arms = 4;
      const maxRadius = Math.min(width, height) * 0.4;

      for (let arm = 0; arm < arms; arm++) {
        const armAngle = (arm / arms) * Math.PI * 2 + galaxyRotationRef.current;

        // Draw spiral arm with frequency-based intensity
        for (let r = 20; r < maxRadius; r += 10) {
          const dataIndex = Math.floor((r / maxRadius) * frequencyData.length);
          const intensity = (frequencyData[dataIndex] / 255) * settings.sensitivity;

          if (intensity > 0.1) {
            const angle = armAngle + r * 0.008;
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;

            const color = getSpiralColor(r / maxRadius, intensity);
            const size = intensity * 8 + 2;

            if (settings.glowEffect && intensity > 0.5) {
              ctx.shadowColor = color;
              ctx.shadowBlur = size * settings.bloomIntensity;
            }

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
          }
        }
      }
    };

    const updatePlanets = (frequencyBands: number[], beatDetected: boolean, beatStrength: number) => {
      planetsRef.current.forEach((planet, index) => {
        // Update angle
        planet.angle += planet.speed;

        // Update intensity based on frequency band
        if (index < frequencyBands.length) {
          planet.intensity = frequencyBands[index] * settings.sensitivity;
        }

        // Beat reactive size increase
        if (beatDetected && settings.beatReactive) {
          planet.intensity += beatStrength * 0.3;
        }
      });
    };

    const drawPlanets = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number) => {
      planetsRef.current.forEach(planet => {
        const x = centerX + Math.cos(planet.angle) * planet.radius;
        const y = centerY + Math.sin(planet.angle) * planet.radius;

        const size = planet.size * (0.5 + planet.intensity * 0.5);
        const alpha = 0.6 + planet.intensity * 0.4;

        // Planet glow
        if (settings.glowEffect && planet.intensity > 0.3) {
          ctx.shadowColor = planet.color;
          ctx.shadowBlur = size * settings.bloomIntensity * 2;
        }

        // Draw planet
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, planet.color);
        gradient.addColorStop(1, planet.color.replace(/[\d.]+\)$/g, '0)'));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();

        // Draw orbital trail
        if (settings.renderQuality !== 'low') {
          ctx.strokeStyle = planet.color.replace(/[\d.]+\)$/g, `${alpha * 0.2})`);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(centerX, centerY, planet.radius, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
      });
    };

    const drawNebula = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, bassLevel: number, midLevel: number, trebleLevel: number) => {
      if (bassLevel < 0.2) return;

      const nebulaSize = bassLevel * 200 + 50;
      const nebulaColor = getNebulaColor(bassLevel, midLevel, trebleLevel);

      // Create nebula gradient
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, nebulaSize
      );

      gradient.addColorStop(0, nebulaColor);
      gradient.addColorStop(0.5, nebulaColor.replace(/[\d.]+\)$/g, `${bassLevel * 0.3})`));
      gradient.addColorStop(1, nebulaColor.replace(/[\d.]+\)$/g, '0)'));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, nebulaSize, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawSupernova = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, beatStrength: number) => {
      const rays = 12;
      const maxLength = beatStrength * 100;
      const color = getStarColor();

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;

      if (settings.glowEffect) {
        ctx.shadowColor = color;
        ctx.shadowBlur = beatStrength * settings.bloomIntensity * 20;
      }

      for (let i = 0; i < rays; i++) {
        const angle = (i / rays) * Math.PI * 2;
        const length = maxLength * (0.5 + Math.random() * 0.5);

        const x1 = centerX + Math.cos(angle) * 20;
        const y1 = centerY + Math.sin(angle) * 20;
        const x2 = centerX + Math.cos(angle) * length;
        const y2 = centerY + Math.sin(angle) * length;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
    };



    const getSpiralColor = (position: number, intensity: number): string => {
      switch (settings.colorMode) {
        case 'gradient':
          return getGradientColor(position, intensity);
        case 'reactive':
          return getReactiveColor(intensity);
        case 'frequency':
          return getFrequencyColor(position, intensity);
        case 'rainbow':
          const hue = (position * 360 + timeRef.current * settings.colorCycleSpeed * 30) % 360;
          return `hsla(${hue}, 70%, ${50 + intensity * 30}%, ${0.5 + intensity * 0.5})`;
        case 'custom':
          return settings.customColor;
        case 'theme':
        default:
          const r = parseInt(currentTheme.primary.slice(1, 3), 16);
          const g = parseInt(currentTheme.primary.slice(3, 5), 16);
          const b = parseInt(currentTheme.primary.slice(5, 7), 16);
          return `rgba(${r}, ${g}, ${b}, ${0.4 + intensity * 0.6})`;
      }
    };

    const getNebulaColor = (bassLevel: number, midLevel: number, trebleLevel: number): string => {
      const r = Math.floor(255 * bassLevel);
      const g = Math.floor(255 * midLevel);
      const b = Math.floor(255 * trebleLevel);
      return `rgba(${r}, ${g}, ${b}, ${bassLevel * 0.4})`;
    };

    const getGradientColor = (position: number, intensity: number): string => {
      const colors = settings.gradientColors;
      const index = Math.floor(position * (colors.length - 1));
      const selectedColor = colors[Math.min(index, colors.length - 1)];

      const r = parseInt(selectedColor.slice(1, 3), 16);
      const g = parseInt(selectedColor.slice(3, 5), 16);
      const b = parseInt(selectedColor.slice(5, 7), 16);

      return `rgba(${r}, ${g}, ${b}, ${0.4 + intensity * 0.6})`;
    };

    const getReactiveColor = (intensity: number): string => {
      const r = Math.floor(100 + 155 * intensity);
      const g = Math.floor(50 + 205 * intensity);
      const b = Math.floor(255);

      return `rgba(${r}, ${g}, ${b}, ${0.4 + intensity * 0.6})`;
    };

    const getFrequencyColor = (position: number, intensity: number): string => {
      const hue = position * 300; // Map to color spectrum
      return `hsla(${hue}, 80%, ${40 + intensity * 40}%, ${0.4 + intensity * 0.6})`;
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

export default GalaxyVisualizer;
