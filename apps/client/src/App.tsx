import { Canvas } from "@react-three/fiber";
import { useGameStore } from "./store/gameStore.js";
import { useGameSocket } from "./hooks/useGameSocket.js";

function Duck({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <mesh position={[x, 0, y]}>
      <boxGeometry args={[0.8, 0.8, 0.8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export default function App() {
  const players = useGameStore((state) => state.players);
  const { move } = useGameSocket("lobby", "Player");

  return (
    <div className="h-screen w-screen bg-slate-900">
      <Canvas camera={{ position: [6, 8, 6], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        {players.map((player) => (
          <Duck key={player.id} x={player.x} y={player.y} color={player.color} />
        ))}
      </Canvas>
      <div className="absolute bottom-4 left-4 flex gap-2">
        {(["UP", "DOWN", "LEFT", "RIGHT"] as const).map((direction) => (
          <button
            key={direction}
            onClick={() => move(direction)}
            className="rounded bg-slate-700 px-3 py-2 text-sm text-white"
          >
            {direction}
          </button>
        ))}
      </div>
    </div>
  );
}
