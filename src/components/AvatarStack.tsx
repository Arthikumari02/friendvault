export function AvatarStack({ avatars }: { avatars: string[] }) {
  return (
    <div className="flex -space-x-3">
      {avatars.slice(0, 6).map((avatar, index) => (
        <span
          className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-indigo-500 to-purple-400 text-xs font-bold text-white shadow-sm"
          key={`${avatar}-${index}`}
        >
          {avatar}
        </span>
      ))}
    </div>
  );
}
