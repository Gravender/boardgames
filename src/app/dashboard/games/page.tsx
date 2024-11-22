import { Plus } from "lucide-react";
import { AddGameForm } from "~/app/_components/addGameForm";
import { Games } from "~/app/_components/games";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { api } from "~/trpc/server";

export default async function Page() {
  void api.game.getGames.prefetch();
  return (
    <Dialog>
      <div>
        <Games />
      </div>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Game</DialogTitle>
        </DialogHeader>
        <AddGameForm />
      </DialogContent>
      <div className="flex h-full w-full flex-col justify-between">
        <div className="">Stuff</div>
        <div className="flex justify-end p-4">
          <DialogTrigger asChild>
            <Button variant="default" className="rounded-full" size="icon">
              <Plus />
            </Button>
          </DialogTrigger>
        </div>
      </div>
    </Dialog>
  );
}
