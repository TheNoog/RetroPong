import type { Score } from '@/types/pong';

interface ScoreDisplayProps {
  score: Score;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score }) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex text-5xl font-mono text-accent space-x-16">
      <span>{score.player1}</span>
      <span>{score.player2}</span>
    </div>
  );
};

export default ScoreDisplay;
