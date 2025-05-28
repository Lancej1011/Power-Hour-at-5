import React, { useRef, useEffect } from 'react';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useVisualizer } from '../../contexts/VisualizerContext';
import { AudioAnalysisData } from '../../hooks/useAudioAnalysis';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

interface ParticleVisualizerProps {
  analysisData: AudioAnalysisData;
  width: number;
  height: number;
}

const ParticleVisualizer: React.FC<ParticleVisualizerProps> = ({ analysisData, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
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

    const createParticle = (x: number, y: number, intensity: number): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = intensity * 5 + 1;
      
      let color: string;
      switch (settings.colorMode) {
        case 'rainbow':
          const hue = Math.random() * 360;
          color = `hsl(${hue}, 70%, 60%)`;
          break;
        case 'custom':
          color = settings.customColor;
          break;
        case 'theme':
        default:
          color = currentTheme.primary;
          break;
      }

      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: intensity * 8 + 2,
        life: 60,
        maxLife: 60,
        color,
      };
    };

    const updateParticles = () => {
      const particles = particlesRef.current;
      
      // Update existing particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        
        // Apply gravity and friction
        particle.vy += 0.1;
        particle.vx *= 0.99;
        particle.vy *= 0.99;
        
        // Update life
        particle.life--;
        
        // Remove dead particles
        if (particle.life <= 0 || 
            particle.x < 0 || particle.x > width || 
            particle.y < 0 || particle.y > height) {
          particles.splice(i, 1);
        }
      }
    };

    const spawnParticles = () => {
      if (!analysisData.isActive) return;

      const { frequencyData } = analysisData;
      const spawnRate = Math.min(settings.particleCount / 20, 10);
      
      for (let i = 0; i < spawnRate; i++) {
        const freqIndex = Math.floor(Math.random() * frequencyData.length);
        const intensity = (frequencyData[freqIndex] / 255) * settings.sensitivity;
        
        if (intensity > 0.1) {
          // Spawn from bottom center, spreading based on frequency
          const spreadX = (freqIndex / frequencyData.length - 0.5) * width * 0.8;
          const x = width / 2 + spreadX;
          const y = height - 50;
          
          particlesRef.current.push(createParticle(x, y, intensity));
        }
      }

      // Limit total particles
      if (particlesRef.current.length > settings.particleCount) {
        particlesRef.current.splice(0, particlesRef.current.length - settings.particleCount);
      }
    };

    const draw = () => {
      // Clear with semi-transparent background for trail effect
      ctx.fillStyle = `rgba(0, 0, 0, ${settings.backgroundOpacity})`;
      ctx.fillRect(0, 0, width, height);

      if (!analysisData.isActive) {
        return;
      }

      updateParticles();
      spawnParticles();

      // Draw particles
      const particles = particlesRef.current;
      for (const particle of particles) {
        const alpha = particle.life / particle.maxLife;
        
        // Parse color and add alpha
        let drawColor: string;
        if (particle.color.startsWith('#')) {
          const r = parseInt(particle.color.slice(1, 3), 16);
          const g = parseInt(particle.color.slice(3, 5), 16);
          const b = parseInt(particle.color.slice(5, 7), 16);
          drawColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else if (particle.color.startsWith('hsl')) {
          drawColor = particle.color.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
        } else {
          drawColor = particle.color;
        }

        ctx.fillStyle = drawColor;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
        ctx.fill();

        // Add glow for larger particles
        if (particle.size > 5) {
          ctx.shadowColor = drawColor;
          ctx.shadowBlur = particle.size;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * alpha * 0.5, 0, Math.PI * 2);
          ctx.fill();
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

export default ParticleVisualizer;
