import { useEffect, useRef } from "react";

export function MeshBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);
    resize();

    const particles = [
      { x: 0, y: 0, color: "rgba(238, 43, 140, 0.15)", radius: 0.8 }, // Pink
      { x: 0, y: 0, color: "rgba(107, 33, 168, 0.15)", radius: 0.7 }, // Purple
      { x: 0, y: 0, color: "rgba(30, 58, 138, 0.1)", radius: 0.9 },  // Blue
    ];

    const render = () => {
      time += 0.002;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = "blur(100px)";

      particles.forEach((p, i) => {
        const x = canvas.width * (0.5 + Math.cos(time + i * 2) * 0.3);
        const y = canvas.height * (0.5 + Math.sin(time + i * 3) * 0.3);

        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.arc(x, y, canvas.width * p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none bg-[#0a0508]"
      style={{ opacity: 0.8 }}
    />
  );
}
