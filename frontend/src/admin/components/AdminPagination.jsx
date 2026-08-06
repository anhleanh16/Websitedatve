import { useEffect, useMemo, useState } from "react";

export const useAdminPagination = (items, pageSize = 10) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [page, currentPage]);

  const pageItems = useMemo(
    () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [items, currentPage, pageSize],
  );

  return { page: currentPage, setPage, totalPages, pageItems };
};

export default function AdminPagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalItems <= pageSize) return null;

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((number) => number === 1 || number === totalPages || Math.abs(number - page) <= 1);
  const visible = [];
  pageNumbers.forEach((number, index) => {
    if (index && number - pageNumbers[index - 1] > 1) visible.push("ellipsis-" + number);
    visible.push(number);
  });

  return (
    <nav className="admin-pagination" aria-label="Phân trang">
      <span className="admin-pagination-summary">
        Hiển thị {Math.min((page - 1) * pageSize + 1, totalItems)}–{Math.min(page * pageSize, totalItems)} / {totalItems}
      </span>
      <div className="admin-pagination-controls">
        <button type="button" onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="Trang trước">‹</button>
        {visible.map((item) => typeof item === "string" ? (
          <span key={item} className="admin-pagination-ellipsis">…</span>
        ) : (
          <button type="button" key={item} className={item === page ? "active" : ""} onClick={() => onPageChange(item)}>{item}</button>
        ))}
        <button type="button" onClick={() => onPageChange(page + 1)} disabled={page === totalPages} aria-label="Trang sau">›</button>
      </div>
    </nav>
  );
}
