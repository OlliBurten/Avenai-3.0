/**
 * Upload Quality Component
 * 
 * Displays document processing quality metrics and warnings
 * for the universal document processing pipeline.
 */

type Props = {
  quality: { coveragePct: number; warnings: string[]; hasTextLayer?: boolean; suspectedScanned?: boolean };
  extractor: string;
  mime?: string;
};

export default function UploadQuality({ quality, extractor, mime }: Props) {
  const pct = Math.round((quality.coveragePct || 0) * 100);
  const badge =
    pct >= 80 ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
  : pct >= 50 ? "bg-amber-50 text-amber-700 ring-amber-200"
  : "bg-rose-50 text-rose-700 ring-rose-200";

  // For TXT/MD files, show 100% coverage if we have chunks and don't show low quality warning
  const isTextFile = mime?.startsWith('text/') || mime === 'text/markdown';
  const displayPct = isTextFile && pct > 0 ? 100 : pct;
  const displayBadge = isTextFile && pct > 0 ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : badge;

  // Show warning badge for low coverage or suspected scanned (but not for TXT/MD with chunks)
  const showWarning = !isTextFile && (pct < 50 || quality.suspectedScanned);
  
  // Show "Searchable" indicator for TXT/MD files with chunks
  const showSearchable = isTextFile && pct > 0;

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ring-1 ${displayBadge}`}>
            Coverage {displayPct}%
          </div>
          {showSearchable && (
            <div className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs bg-green-50 text-green-700 ring-1 ring-green-200">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Searchable
            </div>
          )}
          {showWarning && (
            <div className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs bg-orange-50 text-orange-700 ring-1 ring-orange-200">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
              {pct < 50 ? 'Low Quality' : 'Scanned PDF'}
            </div>
          )}
        </div>
        <div className="text-xs text-slate-500">Extractor: {extractor}</div>
      </div>
      {!!quality.warnings?.length && (
        <ul className="mt-3 list-disc pl-5 text-sm text-slate-600">
          {quality.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}
      {quality.suspectedScanned && (
        <p className="mt-2 text-sm text-slate-600">
          This PDF appears scanned. We used OCR. Accuracy may be lower on some pages.
        </p>
      )}
      {pct < 50 && (
        <p className="mt-2 text-sm text-slate-600">
          Low text coverage detected. Some content may not be searchable or may have extraction errors.
        </p>
      )}
    </div>
  );
}