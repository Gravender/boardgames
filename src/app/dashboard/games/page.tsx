import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";

export default async function Page() {
  return (
    <div className="flex h-full w-full flex-col justify-between">
      <div className="">Stuff</div>
      <div className="flex justify-end p-4">
        <Button variant="default" className="rounded-full" size="icon">
          <Plus />
        </Button>
      </div>
    </div>
  );
}
