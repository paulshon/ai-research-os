"use client";

interface CollaboratorCursorsProps {
  collaborators: Array<{
    userId: string;
    name: string;
    color: string;
    isActive: boolean;
  }>;
}

export default function CollaboratorCursors({ collaborators }: CollaboratorCursorsProps) {
  const active = collaborators.filter((c) => c.isActive);

  if (active.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {active.slice(0, 5).map((c) => (
        <div
          key={c.userId}
          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#0d0f14] -ml-1 first:ml-0"
          style={{ backgroundColor: c.color }}
          title={c.name}
        >
          {c.name[0]?.toUpperCase()}
        </div>
      ))}
      {active.length > 5 && (
        <span className="text-[10px] text-white/30 ml-1">+{active.length - 5}</span>
      )}
    </div>
  );
}
