import { LinkButton } from "~/components/link";

export default function SharedGameNotFound() {
  return (
    <div className="container flex min-h-[400px] flex-col items-center justify-center py-8">
      <h2 className="mb-4 text-2xl font-bold">Shared Game Not Found</h2>
      <p className="text-muted-foreground mb-6">
        The shared game you're looking for doesn't exist or you don't have
        access to it.
      </p>
      <LinkButton href="/games">Back to Games</LinkButton>
    </div>
  );
}
