import { ChevronLeft } from "lucide-react";

type Props = {
  title: string;
  onBack?: () => void;
};

export function TngAppHeader({ title, onBack }: Props) {
  return (
    <header className="flex items-center gap-3 px-5 pb-3 pt-4 text-white">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 grid size-8 place-items-center rounded-full hover:bg-white/10"
        aria-label="Back"
      >
        <ChevronLeft className="size-5" />
      </button>
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
