import { Brain, Palette, PenLine, Code2, Clapperboard } from "lucide-react";

const TEAM = [
  { icon: Brain, name: "Chat", role: "Project manager · planning · QC", color: "text-indigo-600 bg-indigo-50" },
  { icon: Palette, name: "Grok", role: "Images · branding · covers", color: "text-pink-600 bg-pink-50" },
  { icon: PenLine, name: "Claude", role: "Long-form writing · books · docs", color: "text-orange-600 bg-orange-50" },
  { icon: Code2, name: "Neo", role: "Websites · apps · automation", color: "text-emerald-600 bg-emerald-50" },
  { icon: Clapperboard, name: "Video AI", role: "Videos · shorts · ads", color: "text-violet-600 bg-violet-50" },
];

export default function TeamRoster() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {TEAM.map(({ icon: Icon, name, role, color }) => (
        <div key={name} className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col items-center text-center gap-2">
          <span className={`rounded-full p-2 ${color}`}>
            <Icon size={18} />
          </span>
          <div>
            <p className="font-semibold text-sm text-slate-900">{name}</p>
            <p className="text-xs text-slate-500 leading-snug">{role}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
