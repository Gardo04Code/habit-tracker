import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import clsx from "clsx";
import { IconButton } from "./IconButton";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(page: number, totalPages: number): number[] {
  const window = 1;
  const start = Math.max(1, page - window);
  const end = Math.min(totalPages, page + window);
  const pages: number[] = [];
  for (let p = start; p <= end; p += 1) pages.push(p);
  return pages;
}

export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  if (totalItems === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(totalItems, page * pageSize);
  const pages = getPageNumbers(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2 text-sm text-text-secondary">
      <p>
        Mostrando {from} a {to} de {totalItems} registros
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <IconButton
            icon={<ChevronsLeft size={15} />}
            label="Primera página"
            variant="secondary"
            disabled={page === 1}
            onClick={() => onPageChange(1)}
          />
          <IconButton
            icon={<ChevronLeft size={15} />}
            label="Página anterior"
            variant="secondary"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          />
          {pages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              aria-current={pageNumber === page ? "page" : undefined}
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                pageNumber === page
                  ? "bg-primary text-white shadow-glow"
                  : "text-text-secondary hover:bg-surface-muted",
              )}
            >
              {pageNumber}
            </button>
          ))}
          <IconButton
            icon={<ChevronRight size={15} />}
            label="Página siguiente"
            variant="secondary"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
          />
          <IconButton
            icon={<ChevronsRight size={15} />}
            label="Última página"
            variant="secondary"
            disabled={page === totalPages}
            onClick={() => onPageChange(totalPages)}
          />
        </div>
      )}
    </div>
  );
}
