interface BallProps {
  x: number;
  y: number;
  radius: number;
}

const Ball: React.FC<BallProps> = ({ x, y, radius }) => {
  return (
    <div
      className="absolute bg-accent rounded-full"
      style={{
        left: `${x - radius}px`,
        top: `${y - radius}px`,
        width: `${radius * 2}px`,
        height: `${radius * 2}px`,
      }}
    />
  );
};

export default Ball;
