import React, { useEffect } from 'react';
import { Firework } from './types';

interface FireworksCanvasProps {
  show: boolean;
  fireworks: Firework[];
  setFireworks: React.Dispatch<React.SetStateAction<Firework[]>>;
}

const FireworksCanvas: React.FC<FireworksCanvasProps> = ({
  show,
  fireworks,
  setFireworks
}) => {
  useEffect(() => {
    if (!show) return;

    const canvas = document.getElementById('fireworks-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let animationId: number;
    let fireworkId = 0;

    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

    const createFirework = (x: number, y: number) => {
      const particles = [];
      const particleCount = 30 + Math.random() * 20;

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 2 + Math.random() * 4;
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 1,
          maxLife: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 2 + Math.random() * 3
        });
      }

      return {
        id: fireworkId++,
        x,
        y,
        particles
      };
    };

    const updateFireworks = () => {
      setFireworks(prevFireworks => {
        return prevFireworks.map(firework => ({
          ...firework,
          particles: firework.particles
            .map(particle => ({
              ...particle,
              x: particle.x + particle.vx,
              y: particle.y + particle.vy,
              vy: particle.vy + 0.1, // gravity
              vx: particle.vx * 0.99, // air resistance
              life: particle.life - 0.02
            }))
            .filter(particle => particle.life > 0)
        })).filter(firework => firework.particles.length > 0);
      });
    };

    const drawFireworks = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      fireworks.forEach(firework => {
        firework.particles.forEach(particle => {
          ctx.save();
          ctx.globalAlpha = particle.life;
          ctx.fillStyle = particle.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      });
    };

    const animate = () => {
      updateFireworks();
      drawFireworks();
      animationId = requestAnimationFrame(animate);
    };

    // Create initial fireworks
    const createRandomFirework = () => {
      const x = Math.random() * canvas.width;
      const y = Math.random() * (canvas.height * 0.6) + canvas.height * 0.1;
      setFireworks(prev => [...prev, createFirework(x, y)]);
    };

    // Create fireworks at intervals
    const fireworkInterval = setInterval(createRandomFirework, 300);

    // Start animation
    animate();

    // Cleanup after 8 seconds
    const cleanup = setTimeout(() => {
      clearInterval(fireworkInterval);
      setFireworks([]);
    }, 8000);

    return () => {
      clearInterval(fireworkInterval);
      clearTimeout(cleanup);
      cancelAnimationFrame(animationId);
    };
  }, [show, fireworks, setFireworks]);

  if (!show) return null;

  return (
    <canvas
      id="fireworks-canvas"
      className="fixed inset-0 z-50 pointer-events-none"
      style={{ background: 'transparent' }}
    />
  );
};

export default FireworksCanvas;
