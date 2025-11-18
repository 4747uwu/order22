import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const TableFooter = ({ 
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  recordsPerPage = 50,
  onPageChange,
  onRecordsPerPageChange,
  displayedRecords = 0,
  loading = false
}) => {
  
  // Calculate page range to display (max 7 page numbers)
  const getPageRange = () => {
    const maxButtons = 7;
    const pages = [];
    
    if (totalPages <= maxButtons) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Smart pagination with ellipsis
      if (currentPage <= 4) {
        // Near start: 1 2 3 4 5 ... last
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Near end: 1 ... last-4 last-3 last-2 last-1 last
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        // Middle: 1 ... current-1 current current+1 ... last
        pages.push(1);
        pages.push('ellipsis');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageRange = getPageRange();

  const handlePageClick = (page) => {
    if (page !== 'ellipsis' && page !== currentPage && !loading) {
      onPageChange?.(page);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 1 && !loading) {
      onPageChange?.(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !loading) {
      onPageChange?.(currentPage + 1);
    }
  };

  const handleFirst = () => {
    if (currentPage !== 1 && !loading) {
      onPageChange?.(1);
    }
  };

  const handleLast = () => {
    if (currentPage !== totalPages && !loading) {
      onPageChange?.(totalPages);
    }
  };

  const handleRecordsChange = (e) => {
    const newLimit = parseInt(e.target.value);
    if (!loading && newLimit !== recordsPerPage) {
      // ✅ ONLY call onRecordsPerPageChange, DON'T call onPageChange
      onRecordsPerPageChange?.(newLimit);
    }
  };

  const startRecord = totalRecords === 0 ? 0 : ((currentPage - 1) * recordsPerPage) + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalRecords);

  return (
    <div className="sticky bottom-0 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-t border-slate-200 px-4 py-3 shadow-lg">
      <div className="flex items-center justify-between">
        
        {/* LEFT: Records info */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-600">
            Showing <span className="font-semibold text-slate-800">{startRecord}</span> to{' '}
            <span className="font-semibold text-slate-800">{endRecord}</span> of{' '}
            <span className="font-semibold text-teal-600">{totalRecords.toLocaleString()}</span> records
          </div>
          
          {/* Records per page selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600 font-medium">Show:</label>
            <select
              value={recordsPerPage}
              onChange={handleRecordsChange}
              disabled={loading}
              className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded-md hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-xs text-slate-600">per page</span>
          </div>
        </div>

        {/* CENTER: Page navigation */}
        <div className="flex items-center gap-1">
          {/* First page */}
          <button
            onClick={handleFirst}
            disabled={currentPage === 1 || loading}
            className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4 text-slate-600" />
          </button>

          {/* Previous page */}
          <button
            onClick={handlePrevious}
            disabled={currentPage === 1 || loading}
            className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1 mx-2">
            {pageRange.map((page, index) => (
              page === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-2 py-1 text-xs text-slate-400">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageClick(page)}
                  disabled={loading}
                  className={`min-w-[32px] h-[32px] px-2 text-xs font-medium rounded-md transition-all ${
                    page === currentPage
                      ? 'bg-teal-600 text-white shadow-md scale-105'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          {/* Next page */}
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages || loading}
            className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>

          {/* Last page */}
          <button
            onClick={handleLast}
            disabled={currentPage === totalPages || loading}
            className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* RIGHT: Page info */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">
            Page <span className="font-semibold text-slate-800">{currentPage}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalPages}</span>
          </span>
          
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-teal-600">
              <div className="w-3 h-3 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              Loading...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableFooter;