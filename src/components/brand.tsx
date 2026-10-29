import Link from "next/link";
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="Соседи — на главную">
      <svg
        width="34"
        height="38"
        viewBox="0 0 34 38"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 35V10L17 3L31 10V35H3Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M11 14V18M23 14V18M11 24V28M23 24V28M17 35V29"
          stroke="currentColor"
          strokeWidth="3"
        />
      </svg>
      <span>
        соседи
        <span className="brand-sub">
          {compact ? "Общежитие № 4" : "Сервис общежития № 4"}
        </span>
      </span>
    </Link>
  );
}
