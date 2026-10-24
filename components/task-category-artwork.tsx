type TaskCategoryArtworkProps = {
  icon: string;
};

// Decorative vector artwork inherits the group's color and works for custom groups too.
export function TaskCategoryArtwork({ icon }: TaskCategoryArtworkProps) {
  return (
    <svg className="task-category-artwork" viewBox="0 0 180 128" fill="none" aria-hidden="true" focusable="false">
      <ellipse className="task-category-artwork-halo" cx="90" cy="65" rx="77" ry="57" />
      <ellipse className="task-category-artwork-orbit" cx="90" cy="67" rx="79" ry="33" transform="rotate(-18 90 67)" />
      <circle className="task-category-artwork-spark" cx="153" cy="34" r="5" />
      <circle className="task-category-artwork-spark" cx="29" cy="92" r="3" />
      <path className="task-category-artwork-spark" d="m30 29 2.5 6.5L39 38l-6.5 2.5L30 47l-2.5-6.5L21 38l6.5-2.5L30 29Z" />
      <rect className="task-category-artwork-back" x="52" y="25" width="79" height="88" rx="16" transform="rotate(12 91.5 69)" />
      <rect className="task-category-artwork-paper" x="48" y="17" width="79" height="88" rx="16" transform="rotate(-8 87.5 61)" />
      <path className="task-category-artwork-line" d="M64 84h43M64 92h27" />
      <rect className="task-category-artwork-icon-bg" x="65" y="32" width="48" height="42" rx="14" />
      <text x="89" y="55" textAnchor="middle" dominantBaseline="central" fontSize="27" fill="currentColor">{icon}</text>
    </svg>
  );
}
