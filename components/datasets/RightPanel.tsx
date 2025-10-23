import { FileText } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

export function RightPanel({ recent, docs }: {
  recent: Array<{ id: string; text: string; at: string }>;
  docs: Array<{ id: string; name: string; type: string; size: number; status: string; updatedAt: string }>;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200/60 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold">Activity</h3>
        {recent.length === 0 ? (
          <Empty text="No activity yet. Upload a document to get started." />
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between">
                <p className="text-neutral-700">{r.text}</p>
                <time className="text-neutral-400">{r.at}</time>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200/60 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold">Documents</h3>
        {docs.length === 0 ? (
          <Empty text="No documents yet. Upload files on the left." />
        ) : (
          <table className="w-full table-fixed text-left text-sm">
            <thead className="text-neutral-500">
              <tr className="[&>th]:py-2 [&>th]:font-medium">
                <th className="w-7"></th><th>Name</th><th>Type</th><th>Size</th><th>Status</th><th>Updated</th><th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {docs.map((d) => (
                <tr key={d.id} className="hover:bg-neutral-50">
                  <td><Icon as={FileText} /></td>
                  <td className="truncate pr-4">{d.name}</td>
                  <td>{d.type}</td>
                  <td>{(d.size/1024/1024).toFixed(2)} MB</td>
                  <td>{d.status}</td>
                  <td>{d.updatedAt}</td>
                  <td className="text-right">
                    <button className="text-indigo-600 hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-neutral-200/80 bg-neutral-50 p-4 text-neutral-600">
      <Icon as={FileText} />
      <p className="text-sm">{text}</p>
    </div>
  );
}
