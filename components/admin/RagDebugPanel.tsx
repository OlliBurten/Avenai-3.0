/**
 * RAG Debug Panel
 * 
 * Shows retrieval debug information in testing mode
 */
import { RetrievalDebug } from "@/lib/rag/search";
import { SearchResult } from "@/lib/rag/search";

interface RagDebugPanelProps {
  retrievalDebug: RetrievalDebug;
  results: SearchResult[];
}

export default function RagDebugPanel({ retrievalDebug, results }: RagDebugPanelProps) {
  return (
    <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <h3 className="text-sm font-medium text-slate-900 mb-3">RAG Debug Panel</h3>
      
      {/* Retrieval Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">{retrievalDebug.denseCount}</div>
          <div className="text-xs text-slate-600">Dense</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">{retrievalDebug.sparseCount}</div>
          <div className="text-xs text-slate-600">Sparse</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-purple-600">{retrievalDebug.fusedCount}</div>
          <div className="text-xs text-slate-600">Fused</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-orange-600">{retrievalDebug.rerankedCount}</div>
          <div className="text-xs text-slate-600">Re-ranked</div>
        </div>
      </div>
      
      {/* Search Configuration */}
      <div className="mb-4 text-xs text-slate-600">
        <div><strong>Namespace:</strong> {retrievalDebug.namespace}</div>
        <div><strong>Datasets:</strong> {retrievalDebug.selectedDatasetIds?.join(', ') || 'All'}</div>
      </div>
      
      {/* Top Results Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2">Rank</th>
              <th className="text-left py-2">Dataset</th>
              <th className="text-left py-2">Document</th>
              <th className="text-left py-2">Score</th>
              <th className="text-left py-2">Preview</th>
            </tr>
          </thead>
          <tbody>
            {results.slice(0, 8).map((result, index) => (
              <tr key={result.id} className="border-b border-slate-100">
                <td className="py-2 font-medium">{index + 1}</td>
                <td className="py-2 text-slate-600">{result.metadata.datasetId}</td>
                <td className="py-2 text-slate-700">{result.metadata.title}</td>
                <td className="py-2 text-slate-600">{result.score.toFixed(3)}</td>
                <td className="py-2 text-slate-500 max-w-xs truncate">
                  {result.metadata.content.substring(0, 100)}...
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {results.length === 0 && (
        <div className="text-center py-4 text-slate-500">
          No results found
        </div>
      )}
    </div>
  );
}
