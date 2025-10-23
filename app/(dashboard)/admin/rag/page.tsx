// app/admin/rag/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface DatasetDiagnostic {
  id: string;
  name: string;
  docCount: number;
  chunkCount: number;
  vectorCount: number;
  missingVectors: number;
  avgChunkChars: number;
  hasValidChunks: boolean;
}

interface RetrievalDiagnostic {
  denseTopK: number;
  reranked: number;
  finalUsed: number;
  brandLock: string | null;
  anchorDocId: string | null;
  query: string;
  datasetIds: string[];
}

interface DiagnosticResult {
  datasets: DatasetDiagnostic[];
  retrieval: RetrievalDiagnostic | null;
  flags: {
    namespaceMismatch: boolean;
    vectorMismatch: boolean;
    chunkSizeIssue: boolean;
    retrievalTooStrict: boolean;
    brandNotSet: boolean;
    fallbackOrderWrong: boolean;
  };
  actionsTaken: string[];
}

export default function RAGDiagnosticPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [datasets, setDatasets] = useState<DatasetDiagnostic[]>([]);
  const [retrieval, setRetrieval] = useState<RetrievalDiagnostic | null>(null);
  const [flags, setFlags] = useState<any>({});
  const [actionsTaken, setActionsTaken] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [testQuery, setTestQuery] = useState('');

  // Handle authentication states
  useEffect(() => {
    if (status === 'loading') return; // Still loading
    
    if (status === 'unauthenticated') {
      router.push('/signin');
      return;
    }
    
    if (session && !['ADMIN', 'OWNER'].includes((session.user as any)?.role as string)) {
      // User is authenticated but not admin
      return;
    }
  }, [session, status, router]);

  const runDiagnostic = async (query?: string) => {
    if (!(session?.user as any)?.organizationId) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/rag-diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: (session?.user as any)?.organizationId,
          datasetIds: selectedDatasets.length > 0 ? selectedDatasets : undefined,
          query
        })
      });

      const data = await response.json();
      if (data.success) {
        const result: DiagnosticResult = data.result;
        setDatasets(result.datasets);
        setRetrieval(result.retrieval);
        setFlags(result.flags);
        setActionsTaken(result.actionsTaken);
      } else {
        console.error('Diagnostic failed:', data.error);
      }
    } catch (error) {
      console.error('Diagnostic error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testRetrieval = () => {
    if (testQuery.trim()) {
      runDiagnostic(testQuery);
    }
  };

  useEffect(() => {
    if ((session?.user as any)?.organizationId) {
      runDiagnostic();
    }
  }, [session]);

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    );
  }

  // Show forbidden state for non-admin users
  if (session && !['ADMIN', 'OWNER'].includes((session.user as any)?.role as string)) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Forbidden</h1>
          <p className="text-gray-600">You need admin privileges to access RAG diagnostics.</p>
        </div>
      </div>
    );
  }

  // Show sign-in prompt for unauthenticated users
  if (!session) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-600">Please sign in to access RAG diagnostics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">RAG Diagnostic Panel</h1>
      
      {/* Dataset Selection */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Dataset Selection</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {datasets.map(dataset => (
            <label key={dataset.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedDatasets.includes(dataset.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedDatasets([...selectedDatasets, dataset.id]);
                  } else {
                    setSelectedDatasets(selectedDatasets.filter(id => id !== dataset.id));
                  }
                }}
                className="rounded"
              />
              <span className="text-sm">{dataset.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Test Query */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Test Retrieval</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Enter test query..."
            className="flex-1 px-3 py-2 border rounded-md"
          />
          <button
            onClick={testRetrieval}
            disabled={loading || !testQuery.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
          >
            Test
          </button>
        </div>
      </div>

      {/* Actions Taken */}
      {actionsTaken.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Auto-Fix Actions</h2>
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <ul className="space-y-1">
              {actionsTaken.map((action, i) => (
                <li key={i} className="text-sm text-green-800">✓ {action}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Flags */}
      {Object.values(flags).some(Boolean) && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Issues Detected</h2>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <ul className="space-y-1">
              {flags.namespaceMismatch && <li className="text-sm text-red-800">⚠ Namespace mismatch</li>}
              {flags.vectorMismatch && <li className="text-sm text-red-800">⚠ Vector count mismatch</li>}
              {flags.chunkSizeIssue && <li className="text-sm text-red-800">⚠ Chunk size issues</li>}
              {flags.retrievalTooStrict && <li className="text-sm text-red-800">⚠ Retrieval too strict</li>}
              {flags.brandNotSet && <li className="text-sm text-red-800">⚠ Brand not set</li>}
              {flags.fallbackOrderWrong && <li className="text-sm text-red-800">⚠ Fallback order wrong</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Retrieval Results */}
      {retrieval && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Retrieval Results</h2>
          <div className="bg-gray-50 border rounded-md p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Dense TopK:</span>
                <span className="ml-2">{retrieval.denseTopK}</span>
              </div>
              <div>
                <span className="font-medium">Reranked:</span>
                <span className="ml-2">{retrieval.reranked}</span>
              </div>
              <div>
                <span className="font-medium">Final Used:</span>
                <span className="ml-2">{retrieval.finalUsed}</span>
              </div>
              <div>
                <span className="font-medium">Brand Lock:</span>
                <span className="ml-2">{retrieval.brandLock || 'None'}</span>
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Query:</span> {retrieval.query}
            </div>
          </div>
        </div>
      )}

      {/* Dataset Table */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Dataset Status</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-md">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Dataset</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Docs</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Chunks</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Vectors</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Missing</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Avg Chars</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map(dataset => (
                <tr key={dataset.id} className="border-t">
                  <td className="px-4 py-2 text-sm">{dataset.name}</td>
                  <td className="px-4 py-2 text-sm">{dataset.docCount}</td>
                  <td className="px-4 py-2 text-sm">{dataset.chunkCount}</td>
                  <td className="px-4 py-2 text-sm">{dataset.vectorCount}</td>
                  <td className="px-4 py-2 text-sm">
                    {dataset.missingVectors > 0 ? (
                      <span className="text-red-600">{dataset.missingVectors}</span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">{Math.round(dataset.avgChunkChars)}</td>
                  <td className="px-4 py-2 text-sm">
                    {dataset.hasValidChunks ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        ✓ Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                        ⚠ Invalid
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={() => runDiagnostic()}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-md disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
