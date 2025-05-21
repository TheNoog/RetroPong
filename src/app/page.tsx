import PongGame from "@/components/pong/PongGame";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background">
      <PongGame />
    </main>
  );
}
