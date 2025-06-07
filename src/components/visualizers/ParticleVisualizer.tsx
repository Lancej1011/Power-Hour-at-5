import React, { useRef, useEffect } from 'react';
import { useThemeContext } from '../../contexts/ThemeContext';
import { VisualizerSettings } from '../../contexts/VisualizerContext';
import { EnhancedAudioAnalysisData } from '../../hooks/useEnhancedAudioAnalysis';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  frequency: number;
  energy: number;
  trail: { x: number; y: number }[];
}

interface ParticleVisualizerProps {
  analysisData: EnhancedAudioAnalysisData;
  width: number;
  height: number;
  settings: VisualizerSettings;
}

const ParticleVisualizer: React.FC<ParticleVisualizerProps> = ({ analysisData, width, height, settings }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const { currentTheme } = useThemeContext();
  const timeRef = useRef<number>(0);
  const emittersRef = useRef<{ x: number; y: number; intensity: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    const createParticle = (emitterX: number, emitterY: number, intensity: number, frequency: number): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = intensity * 8 + 2;
      const life = 120 + intensity * 60;

      const color = getParticleColor(frequency, intensity);

      return {
        x: emitterX + (Math.random() - 0.5) * 20,
        y: emitterY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 3, // Slight upward bias
        size: intensity * 12 + 3,
        life,
        maxLife: life,
        color,
        frequency,
        energy: intensity,
        trail: [],
      };
    };

    const getParticleColor = (frequency: number, intensity: number): string => {
      switch (settings.colorMode) {
        case 'gradient':
          const colors = settings.gradientColors;
          const index = Math.floor(frequency * (colors.length - 1));
          const selectedColor = colors[Math.min(index, colors.length - 1)];
          return selectedColor;
        case 'reactive':
          const r = Math.floor(255 * (analysisData.bassLevel || 0));
          const g = Math.floor(255 * (analysisData.midLevel || 0));
          const b = Math.floor(255 * (analysisData.trebleLevel || 0));
          return `rgb(${r}, ${g}, ${b})`;
        case 'frequency':
          let hue: number;
          if (frequency < 0.33) {
            hue = 0; // Red for bass
          } else if (frequency < 0.66) {
            hue = 120; // Green for mids
          } else {
            hue = 240; // Blue for treble
          }
          return `hsl(${hue}, 80%, ${50 + intensity * 30}%)`;
        case 'rainbow':
          const rainbowHue = (frequency * 360 + timeRef.current * settings.colorCycleSpeed * 50) % 360;
          return `hsl(${rainbowHue}, 70%, ${50 + intensity * 30}%)`;
        case 'custom':
          return settings.customColor;
        case 'theme':
        default:
          return currentTheme.primary;
      }
    };

    const updateEmitters = () => {
      if (!analysisData.isActive) {
        // Create idle emitters
        emittersRef.current = [
          { x: width * 0.2, y: height * 0.5, intensity: 0.3 },
          { x: width * 0.5, y: height * 0.3, intensity: 0.4 },
          { x: width * 0.8, y: height * 0.6, intensity: 0.3 },
        ];
        return;
      }

      const { frequencyBands, beatDetected, beatStrength } = analysisData;
      const emitters: { x: number; y: number; intensity: number }[] = [];

      // Create emitters based on frequency bands
      const bandCount = Math.min(frequencyBands?.length || 8, 8);
      for (let i = 0; i < bandCount; i++) {
        const intensity = (frequencyBands?.[i] || 0) * settings.sensitivity;
        if (intensity > 0.1) {
          // Position emitters in a circle around the center
          const angle = (i / bandCount) * Math.PI * 2;
          const radius = Math.min(width, height) * 0.3;
          const centerX = width / 2;
          const centerY = height / 2;

          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;

          // Beat reactive positioning
          const beatOffset = beatDetected && settings.beatReactive ? beatStrength * 20 : 0;

          emitters.push({
            x: x + (Math.random() - 0.5) * beatOffset,
            y: y + (Math.random() - 0.5) * beatOffset,
            intensity: intensity * (beatDetected && settings.beatReactive ? 1 + beatStrength * 0.5 : 1),
          });
        }
      }

      emittersRef.current = emitters;
    };

    const updateParticles = () => {
      const particles = particlesRef.current;

      // Update existing particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];

        // Update trail
        if (settings.motionBlur) {
          particle.trail.push({ x: particle.x, y: particle.y });
          if (particle.trail.length > 5) {
            particle.trail.shift();
          }
        }

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Apply physics
        particle.vy += 0.05; // Gentle gravity
        particle.vx *= 0.995; // Air resistance
        particle.vy *= 0.995;

        // Particle interaction - attract to nearby particles
        for (const other of particles) {
          if (other !== particle) {
            const dx = other.x - particle.x;
            const dy = other.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 50 && distance > 0) {
              const force = (50 - distance) * 0.0001;
              particle.vx += (dx / distance) * force;
              particle.vy += (dy / distance) * force;
            }
          }
        }

        // Bounce off edges
        if (particle.x < 0 || particle.x > width) {
          particle.vx *= -0.8;
          particle.x = Math.max(0, Math.min(width, particle.x));
        }
        if (particle.y < 0 || particle.y > height) {
          particle.vy *= -0.8;
          particle.y = Math.max(0, Math.min(height, particle.y));
        }

        // Update life
        particle.life--;

        // Remove dead particles
        if (particle.life <= 0) {
          particles.splice(i, 1);
        }
      }
    };

    const spawnParticles = () => {
      const emitters = emittersRef.current;
      const spawnRate = Math.min(settings.particleCount / 30, 8);

      for (const emitter of emitters) {
        if (emitter.intensity > 0.1) {
          const particlesToSpawn = Math.floor(spawnRate * emitter.intensity);

          for (let i = 0; i < particlesToSpawn; i++) {
            const frequency = Math.random(); // Random frequency for variety
            particlesRef.current.push(createParticle(emitter.x, emitter.y, emitter.intensity, frequency));
          }
        }
      }

      // Limit total particles
      if (particlesRef.current.length > settings.particleCount) {
        particlesRef.current.splice(0, particlesRef.current.length - settings.particleCount);
      }
    };

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

      updateEmitters();
      updateParticles();
      spawnParticles();

      // Draw emitters (subtle glow)
      if (settings.renderQuality !== 'low') {
        for (const emitter of emittersRef.current) {
          if (emitter.intensity > 0.2) {
            const glowSize = emitter.intensity * 30;
            const gradient = ctx.createRadialGradient(
              emitter.x, emitter.y, 0,
              emitter.x, emitter.y, glowSize
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${emitter.intensity * 0.3})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(emitter.x, emitter.y, glowSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw particles
      const particles = particlesRef.current;
      for (const particle of particles) {
        const alpha = particle.life / particle.maxLife;
        const size = particle.size * alpha;

        // Draw trail
        if (settings.motionBlur && particle.trail.length > 1) {
          ctx.strokeStyle = getColorWithAlpha(particle.color, alpha * 0.3);
          ctx.lineWidth = size * 0.3;
          ctx.beginPath();
          ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
          for (let i = 1; i < particle.trail.length; i++) {
            ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
          }
          ctx.stroke();
        }

        // Enhanced glow effect
        if (settings.glowEffect && particle.energy > 0.3) {
          const glowIntensity = particle.energy * settings.bloomIntensity;
          ctx.shadowColor = particle.color;
          ctx.shadowBlur = glowIntensity * 20;
        }

        // Create gradient for particle
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, size
        );
        gradient.addColorStop(0, getColorWithAlpha(particle.color, alpha));
        gradient.addColorStop(0.7, getColorWithAlpha(particle.color, alpha * 0.6));
        gradient.addColorStop(1, getColorWithAlpha(particle.color, 0));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();

        // Draw core
        ctx.fillStyle = getColorWithAlpha(particle.color, alpha * 0.8);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Reset shadow
        ctx.shadowBlur = 0;
      }
    };

    const getColorWithAlpha = (color: string, alpha: number): string => {
      if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else if (color.startsWith('hsl')) {
        return color.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
      } else if (color.startsWith('rgb')) {
        return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
      } else {
        return color;
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

export default ParticleVisualizer;
