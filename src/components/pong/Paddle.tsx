import type { Paddle as PaddleType } from '@/types/pong';

interface PaddleProps {
  y: number;
  height: number;
  width: number;
  isLeft: boolean;
  boardHeight: number;
}

const Paddle: React.FC<PaddleProps> = ({ y, height, width, isLeft }) => {
  const xPosition = isLeft ? 0 : `calc(100% - ${width}px)`;
  return (
    <div
      className="absolute bg-primary rounded"
      style={{
        top: `${y}px`,
        left: isLeft ? `${0}px` : undefined,
        right: !isLeft ? `${0}px` : undefined,
        width: `${width}px`,
        height: `${height}px`,
        transform: `translateY(-${height / 2}px)` // Centering paddle vertically if y is center
      }}
    />
  );
};

export default Paddle;
