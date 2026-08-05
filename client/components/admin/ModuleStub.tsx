import { type LucideIcon } from "lucide-react";

interface ModuleStubProps {
  icon: LucideIcon;
  title: string;
  description: string;
  comingIn: string;
}

export default function ModuleStub({ icon: Icon, title, description, comingIn }: ModuleStubProps) {
  return (
    <div className="px-6 py-10 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-[560px] rounded-3xl border border-k-gray-200 bg-k-white px-8 py-12 text-center shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-k-primary/10 text-k-primary">
          <Icon size={22} />
        </div>
        <h1 className="mb-2 font-serif text-2xl font-light text-k-black">{title}</h1>
        <p className="mb-4 text-sm font-light leading-relaxed text-k-gray-600">{description}</p>
        <span className="inline-block rounded-full bg-k-gray-100 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-k-gray-600">
          Coming in {comingIn}
        </span>
      </div>
    </div>
  );
}
