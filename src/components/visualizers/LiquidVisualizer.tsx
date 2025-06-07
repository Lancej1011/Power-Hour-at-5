import React, { useRef, useEffect } from 'react';
import { useThemeContext } from '../../contexts/ThemeContext';
import { VisualizerSettings } from '../../contexts/VisualizerContext';
import { EnhancedAudioAnalysisData } from '../../hooks/useEnhancedAudioAnalysis';

interface LiquidVisualizerProps {
  analysisData: EnhancedAudioAnalysisData;
  width: number;
  height: number;
  settings: VisualizerSettings;
}

interface FluidParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  frequency: number;
  density: number;
  pressure: number;
  viscosity: number;
}

interface FluidField {
  velocityX: number[][];
  velocityY: number[][];
  density: number[][];
  pressure: number[][];
}

const LiquidVisualizer: React.FC<LiquidVisualizerProps> = ({
  analysisData,
  width,
  height,
  settings,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentTheme } = useThemeContext();
  const particlesRef = useRef<FluidParticle[]>([]);
  const timeRef = useRef<number>(0);
  const waveOffsetRef = useRef<number>(0);
  const fluidFieldRef = useRef<FluidField | null>(null);
  const gridSize = 20; // Size of fluid simulation grid

  // Initialize fluid field
  useEffect(() => {
    const gridWidth = Math.ceil(width / gridSize);
    const gridHeight = Math.ceil(height / gridSize);

    fluidFieldRef.current = {
      velocityX: Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(0)),
      velocityY: Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(0)),
      density: Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(0)),
      pressure: Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(0)),
    };
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    const initializeFluidField = () => {
      if (!fluidFieldRef.current) return;

      const gridWidth = Math.ceil(width / gridSize);
      const gridHeight = Math.ceil(height / gridSize);

      // Reset fluid field
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          fluidFieldRef.current.velocityX[y][x] = 0;
          fluidFieldRef.current.velocityY[y][x] = 0;
          fluidFieldRef.current.density[y][x] = 0;
          fluidFieldRef.current.pressure[y][x] = 0;
        }
      }
    };

    const updateFluidField = () => {
      if (!fluidFieldRef.current || !analysisData.isActive) return;

      const { frequencyBands, bassLevel, midLevel, trebleLevel } = analysisData;
      const gridWidth = Math.ceil(width / gridSize);
      const gridHeight = Math.ceil(height / gridSize);

      // Add forces based on audio
      const centerX = Math.floor(gridWidth / 2);
      const centerY = Math.floor(gridHeight / 2);

      // Bass creates central disturbance
      if (bassLevel && bassLevel > 0.2) {
        const radius = Math.floor(bassLevel * 5);
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const x = centerX + dx;
            const y = centerY + dy;
            if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance <= radius) {
                const force = (1 - distance / radius) * bassLevel * 0.5;
                fluidFieldRef.current.velocityX[y][x] += dx * force;
                fluidFieldRef.current.velocityY[y][x] += dy * force;
                fluidFieldRef.current.density[y][x] += force;
              }
            }
          }
        }
      }

      // Frequency bands create directional forces
      if (frequencyBands) {
        for (let i = 0; i < Math.min(frequencyBands.length, 8); i++) {
          const intensity = frequencyBands[i];
          if (intensity > 0.1) {
            const angle = (i / 8) * Math.PI * 2;
            const forceX = Math.cos(angle) * intensity * 0.3;
            const forceY = Math.sin(angle) * intensity * 0.3;

            const x = Math.floor(centerX + Math.cos(angle) * 3);
            const y = Math.floor(centerY + Math.sin(angle) * 3);

            if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
              fluidFieldRef.current.velocityX[y][x] += forceX;
              fluidFieldRef.current.velocityY[y][x] += forceY;
              fluidFieldRef.current.density[y][x] += intensity * 0.5;
            }
          }
        }
      }

      // Apply fluid dynamics (simplified)
      const damping = 0.99;
      const diffusion = 0.01;

      for (let y = 1; y < gridHeight - 1; y++) {
        for (let x = 1; x < gridWidth - 1; x++) {
          // Velocity diffusion
          const avgVelX = (
            fluidFieldRef.current.velocityX[y-1][x] +
            fluidFieldRef.current.velocityX[y+1][x] +
            fluidFieldRef.current.velocityX[y][x-1] +
            fluidFieldRef.current.velocityX[y][x+1]
          ) / 4;

          const avgVelY = (
            fluidFieldRef.current.velocityY[y-1][x] +
            fluidFieldRef.current.velocityY[y+1][x] +
            fluidFieldRef.current.velocityY[y][x-1] +
            fluidFieldRef.current.velocityY[y][x+1]
          ) / 4;

          fluidFieldRef.current.velocityX[y][x] =
            fluidFieldRef.current.velocityX[y][x] * damping + avgVelX * diffusion;
          fluidFieldRef.current.velocityY[y][x] =
            fluidFieldRef.current.velocityY[y][x] * damping + avgVelY * diffusion;

          // Density diffusion
          const avgDensity = (
            fluidFieldRef.current.density[y-1][x] +
            fluidFieldRef.current.density[y+1][x] +
            fluidFieldRef.current.density[y][x-1] +
            fluidFieldRef.current.density[y][x+1]
          ) / 4;

          fluidFieldRef.current.density[y][x] =
            fluidFieldRef.current.density[y][x] * 0.98 + avgDensity * 0.02;
        }
      }
    };

    const draw = () => {
      timeRef.current += 0.016; // ~60fps
      waveOffsetRef.current += 0.02;

      // Clear with motion blur effect
      if (settings.motionBlur) {
        ctx.fillStyle = `rgba(0, 0, 0, ${0.03 + settings.backgroundOpacity * 0.05})`;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = `rgba(0, 0, 0, ${settings.backgroundOpacity})`;
        ctx.fillRect(0, 0, width, height);
      }

      if (!analysisData.isActive) {
        drawIdleLiquid(ctx);
        return;
      }

      updateFluidField();

      // Draw fluid field
      drawFluidField(ctx);

      // Draw enhanced liquid effects
      const { frequencyData, beatDetected, beatStrength, bassLevel, midLevel, trebleLevel, frequencyBands } = analysisData;

      // Spawn and update particles
      spawnParticles(frequencyData, beatDetected, beatStrength);
      updateParticles();
      drawParticles(ctx);

      // Draw enhanced waves
      drawEnhancedWaves(ctx, frequencyBands, bassLevel, midLevel, trebleLevel);

      // Draw dynamic liquid surface
      drawDynamicSurface(ctx, frequencyData);
    };

    const drawFluidField = (ctx: CanvasRenderingContext2D) => {
      if (!fluidFieldRef.current) return;

      const gridWidth = Math.ceil(width / gridSize);
      const gridHeight = Math.ceil(height / gridSize);

      // Draw density field as colored areas
      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          const density = fluidFieldRef.current.density[y][x];
          if (density > 0.01) {
            const screenX = x * gridSize;
            const screenY = y * gridSize;

            const color = getFluidColor(density);
            const alpha = Math.min(density * 2, 0.8);

            if (settings.glowEffect) {
              ctx.shadowColor = color;
              ctx.shadowBlur = density * settings.bloomIntensity * 10;
            }

            ctx.fillStyle = color.replace(/[\d.]+\)$/g, `${alpha})`);
            ctx.fillRect(screenX, screenY, gridSize, gridSize);

            ctx.shadowBlur = 0;
          }
        }
      }

      // Draw velocity field as flow lines (for high quality)
      if (settings.renderQuality === 'ultra') {
        ctx.strokeStyle = `${currentTheme.primary}30`;
        ctx.lineWidth = 1;

        for (let y = 0; y < gridHeight; y += 2) {
          for (let x = 0; x < gridWidth; x += 2) {
            const velX = fluidFieldRef.current.velocityX[y][x];
            const velY = fluidFieldRef.current.velocityY[y][x];
            const magnitude = Math.sqrt(velX * velX + velY * velY);

            if (magnitude > 0.1) {
              const screenX = x * gridSize + gridSize / 2;
              const screenY = y * gridSize + gridSize / 2;
              const endX = screenX + velX * 20;
              const endY = screenY + velY * 20;

              ctx.beginPath();
              ctx.moveTo(screenX, screenY);
              ctx.lineTo(endX, endY);
              ctx.stroke();
            }
          }
        }
      }
    };

    const getFluidColor = (density: number): string => {
      switch (settings.colorMode) {
        case 'gradient':
          const colors = settings.gradientColors;
          const index = Math.floor(density * (colors.length - 1));
          return colors[Math.min(index, colors.length - 1)];
        case 'reactive':
          const rReactive = Math.floor(255 * (analysisData.bassLevel || 0));
          const gReactive = Math.floor(255 * (analysisData.midLevel || 0));
          const bReactive = Math.floor(255 * (analysisData.trebleLevel || 0));
          return `rgba(${rReactive}, ${gReactive}, ${bReactive}`;
        case 'frequency':
          const hue = density * 240; // Blue to red spectrum
          return `hsla(${hue}, 70%, ${40 + density * 40}%`;
        case 'rainbow':
          const rainbowHue = (density * 360 + timeRef.current * settings.colorCycleSpeed * 30) % 360;
          return `hsla(${rainbowHue}, 70%, ${50 + density * 30}%`;
        case 'custom':
          return settings.customColor.replace(')', '');
        case 'theme':
        default:
          const rTheme = parseInt(currentTheme.primary.slice(1, 3), 16);
          const gTheme = parseInt(currentTheme.primary.slice(3, 5), 16);
          const bTheme = parseInt(currentTheme.primary.slice(5, 7), 16);
          return `rgba(${rTheme}, ${gTheme}, ${bTheme}`;
      }
    };

    const drawIdleLiquid = (ctx: CanvasRenderingContext2D) => {
      // Draw gentle waves when idle
      const waveCount = 5;
      const amplitude = 40;

      for (let wave = 0; wave < waveCount; wave++) {
        const y = height * (0.3 + wave * 0.15);
        const alpha = Math.max(0.1, 0.6 - wave * 0.1);
        const color = `${currentTheme.primary}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;

        ctx.strokeStyle = color;
        ctx.lineWidth = 3 - wave * 0.3;
        ctx.beginPath();

        for (let x = 0; x <= width; x += 3) {
          const waveY = y + Math.sin((x * 0.008) + (timeRef.current * (1 + wave * 0.3)) + (wave * 0.7)) * amplitude;
          if (x === 0) {
            ctx.moveTo(x, waveY);
          } else {
            ctx.lineTo(x, waveY);
          }
        }
        ctx.stroke();
      }
    };

    const spawnParticles = (frequencyData: Uint8Array, beatDetected: boolean, beatStrength: number) => {
      const spawnRate = Math.min(settings.particleCount / 40, 6);
      const beatMultiplier = beatDetected && settings.beatReactive ? beatStrength : 1;

      // Spawn from multiple sources based on frequency bands
      const spawnSources = [
        { x: width * 0.2, y: height * 0.8 },
        { x: width * 0.5, y: height * 0.9 },
        { x: width * 0.8, y: height * 0.8 },
        { x: width * 0.1, y: height * 0.6 },
        { x: width * 0.9, y: height * 0.6 },
      ];

      for (let i = 0; i < spawnRate * beatMultiplier; i++) {
        const freqIndex = Math.floor(Math.random() * frequencyData.length);
        const intensity = (frequencyData[freqIndex] / 255) * settings.sensitivity;

        if (intensity > 0.1) {
          const source = spawnSources[Math.floor(Math.random() * spawnSources.length)];

          const particle: FluidParticle = {
            x: source.x + (Math.random() - 0.5) * 40,
            y: source.y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 6,
            vy: -Math.random() * 4 - intensity * 3,
            size: intensity * 12 + 4,
            life: 150 + intensity * 80,
            maxLife: 150 + intensity * 80,
            color: getParticleColor(freqIndex / frequencyData.length, intensity),
            frequency: freqIndex / frequencyData.length,
            density: intensity,
            pressure: 0,
            viscosity: 0.98,
          };

          particlesRef.current.push(particle);
        }
      }

      // Limit particle count for performance
      if (particlesRef.current.length > settings.particleCount * 1.5) {
        particlesRef.current = particlesRef.current.slice(-settings.particleCount);
      }
    };

    const drawEnhancedWaves = (
      ctx: CanvasRenderingContext2D,
      frequencyBands: number[],
      bassLevel: number,
      midLevel: number,
      trebleLevel: number
    ) => {
      const waveCount = Math.min(frequencyBands?.length || 6, 6);

      for (let i = 0; i < waveCount; i++) {
        const bandValue = (frequencyBands?.[i] || 0) * settings.sensitivity;
        const y = height * (0.2 + i * 0.12);
        const amplitude = bandValue * 60 + 15;
        const frequency = 0.003 + i * 0.001;
        const speed = 0.8 + i * 0.3;

        const color = getWaveColor(i, bandValue);

        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, bandValue * 5);

        if (settings.glowEffect && bandValue > 0.3) {
          ctx.shadowColor = color;
          ctx.shadowBlur = bandValue * settings.bloomIntensity * 12;
        }

        ctx.beginPath();

        for (let x = 0; x <= width; x += 2) {
          const waveY = y + Math.sin((x * frequency) + (waveOffsetRef.current * speed)) * amplitude;

          if (x === 0) {
            ctx.moveTo(x, waveY);
          } else {
            ctx.lineTo(x, waveY);
          }
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    const drawDynamicSurface = (ctx: CanvasRenderingContext2D, frequencyData: Uint8Array) => {
      const surfaceY = height * 0.75;
      const points: { x: number; y: number }[] = [];

      // Generate surface points based on frequency data
      const pointCount = Math.min(frequencyData.length / 3, 80);
      for (let i = 0; i < pointCount; i++) {
        const x = (i / pointCount) * width;
        const dataIndex = Math.floor((i / pointCount) * frequencyData.length);
        const amplitude = (frequencyData[dataIndex] / 255) * settings.sensitivity * 40;
        const y = surfaceY - amplitude + Math.sin(waveOffsetRef.current + i * 0.1) * 10;

        points.push({ x, y });
      }

      // Draw smooth surface using curves
      if (points.length > 2) {
        const surfaceColor = getSurfaceColor();

        // Fill area below surface with gradient
        const gradient = ctx.createLinearGradient(0, surfaceY, 0, height);
        gradient.addColorStop(0, surfaceColor);
        gradient.addColorStop(0.6, surfaceColor.replace(/[\d.]+\)$/g, '0.4)'));
        gradient.addColorStop(1, surfaceColor.replace(/[\d.]+\)$/g, '0.1)'));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, points[0].y);

        // Draw smooth curve through points
        for (let i = 0; i < points.length - 1; i++) {
          const current = points[i];
          const next = points[i + 1];
          const controlX = (current.x + next.x) / 2;
          const controlY = (current.y + next.y) / 2;

          ctx.quadraticCurveTo(current.x, current.y, controlX, controlY);
        }

        ctx.lineTo(width, points[points.length - 1].y);
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        // Draw surface line with glow
        if (settings.glowEffect) {
          ctx.shadowColor = surfaceColor;
          ctx.shadowBlur = 8;
        }

        ctx.strokeStyle = surfaceColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {
          const current = points[i];
          const next = points[i + 1];
          const controlX = (current.x + next.x) / 2;
          const controlY = (current.y + next.y) / 2;

          ctx.quadraticCurveTo(current.x, current.y, controlX, controlY);
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    const updateParticles = () => {
      particlesRef.current = particlesRef.current.filter(particle => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Apply gravity and fluid dynamics
        particle.vy += 0.1; // gravity
        particle.vx *= 0.99; // friction
        particle.vy *= 0.99;

        // Fluid interaction - particles attract to each other
        particlesRef.current.forEach(other => {
          if (other !== particle) {
            const dx = other.x - particle.x;
            const dy = other.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 50 && distance > 0) {
              const force = (50 - distance) * 0.001;
              particle.vx += (dx / distance) * force;
              particle.vy += (dy / distance) * force;
            }
          }
        });

        // Bounce off walls
        if (particle.x < 0 || particle.x > width) {
          particle.vx *= -0.8;
          particle.x = Math.max(0, Math.min(width, particle.x));
        }

        // Update life
        particle.life--;

        return particle.life > 0 && particle.y < height + 50;
      });
    };

    const drawParticles = (ctx: CanvasRenderingContext2D) => {
      particlesRef.current.forEach(particle => {
        const alpha = particle.life / particle.maxLife;
        const size = particle.size * alpha;

        // Create gradient for liquid effect
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, size
        );

        const baseColor = particle.color;
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(0.7, baseColor.replace(/[\d.]+\)$/g, `${alpha * 0.6})`));
        gradient.addColorStop(1, baseColor.replace(/[\d.]+\)$/g, '0)'));

        // Glow effect
        if (settings.glowEffect && alpha > 0.5) {
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = size * settings.bloomIntensity;
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
      });
    };

    const drawFluidWaves = (
      ctx: CanvasRenderingContext2D,
      frequencyBands: number[],
      bassLevel: number,
      midLevel: number,
      trebleLevel: number
    ) => {
      const waveCount = Math.min(frequencyBands.length, 6);

      for (let i = 0; i < waveCount; i++) {
        const bandValue = frequencyBands[i] * settings.sensitivity;
        const y = height * (0.3 + i * 0.1);
        const amplitude = bandValue * 80 + 20;
        const frequency = 0.005 + i * 0.002;
        const speed = 1 + i * 0.5;

        const color = getWaveColor(i, bandValue);

        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, bandValue * 4);

        if (settings.glowEffect && bandValue > 0.3) {
          ctx.shadowColor = color;
          ctx.shadowBlur = bandValue * settings.bloomIntensity * 15;
        }

        ctx.beginPath();

        for (let x = 0; x <= width; x += 3) {
          const waveY = y + Math.sin((x * frequency) + (waveOffsetRef.current * speed)) * amplitude;

          if (x === 0) {
            ctx.moveTo(x, waveY);
          } else {
            ctx.lineTo(x, waveY);
          }
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    const drawLiquidSurface = (ctx: CanvasRenderingContext2D, frequencyData: Uint8Array) => {
      const surfaceY = height * 0.8;
      const points: { x: number; y: number }[] = [];

      // Generate surface points based on frequency data
      const pointCount = Math.min(frequencyData.length / 4, 100);
      for (let i = 0; i < pointCount; i++) {
        const x = (i / pointCount) * width;
        const dataIndex = Math.floor((i / pointCount) * frequencyData.length);
        const amplitude = (frequencyData[dataIndex] / 255) * settings.sensitivity * 50;
        const y = surfaceY - amplitude;

        points.push({ x, y });
      }

      // Draw smooth surface using curves
      if (points.length > 2) {
        const surfaceColor = getSurfaceColor();

        // Fill area below surface
        const gradient = ctx.createLinearGradient(0, surfaceY, 0, height);
        gradient.addColorStop(0, surfaceColor);
        gradient.addColorStop(1, surfaceColor.replace(/[\d.]+\)$/g, '0.1)'));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, points[0].y);

        // Draw smooth curve through points
        for (let i = 0; i < points.length - 1; i++) {
          const current = points[i];
          const next = points[i + 1];
          const controlX = (current.x + next.x) / 2;
          const controlY = (current.y + next.y) / 2;

          ctx.quadraticCurveTo(current.x, current.y, controlX, controlY);
        }

        ctx.lineTo(width, points[points.length - 1].y);
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        // Draw surface line
        ctx.strokeStyle = surfaceColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {
          const current = points[i];
          const next = points[i + 1];
          const controlX = (current.x + next.x) / 2;
          const controlY = (current.y + next.y) / 2;

          ctx.quadraticCurveTo(current.x, current.y, controlX, controlY);
        }

        ctx.stroke();
      }
    };

    const getParticleColor = (frequency: number, intensity: number): string => {
      switch (settings.colorMode) {
        case 'gradient':
          return getGradientColor(frequency, intensity);
        case 'reactive':
          return getReactiveColor(intensity);
        case 'frequency':
          return getFrequencyColor(frequency, intensity);
        case 'rainbow':
          const hue = (frequency * 360 + timeRef.current * settings.colorCycleSpeed * 50) % 360;
          return `hsla(${hue}, 70%, ${50 + intensity * 30}%, ${0.6 + intensity * 0.4})`;
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

    const getWaveColor = (index: number, intensity: number): string => {
      const baseColor = getParticleColor(index / 8, intensity);
      return baseColor.replace(/[\d.]+\)$/g, `${0.3 + intensity * 0.5})`);
    };

    const getSurfaceColor = (): string => {
      const r = parseInt(currentTheme.primary.slice(1, 3), 16);
      const g = parseInt(currentTheme.primary.slice(3, 5), 16);
      const b = parseInt(currentTheme.primary.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, 0.6)`;
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
      const g = Math.floor(150 + 105 * intensity);
      const b = Math.floor(255 * (1 - intensity * 0.5));

      return `rgba(${r}, ${g}, ${b}, ${0.4 + intensity * 0.6})`;
    };

    const getFrequencyColor = (position: number, intensity: number): string => {
      const hue = position * 240; // Blue to red spectrum
      return `hsla(${hue}, 70%, ${40 + intensity * 40}%, ${0.4 + intensity * 0.6})`;
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

export default LiquidVisualizer;
