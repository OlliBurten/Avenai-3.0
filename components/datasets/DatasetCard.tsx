"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Upload, FileText, Database, Clock, Tag, Trash2, MoreVertical } from "lucide-react";
import { Icon } from "@/components/Icon";

interface Dataset {
  id: string;
  name: string;
  type: string;
  tags: string[];
  isActive: boolean;
  docCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DatasetCardProps {
  dataset: Dataset;
}

export default function DatasetCard({ dataset }: DatasetCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/datasets/${dataset.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh the page to update the dataset list
        router.refresh();
      } else {
        const error = await response.json();
        console.error("Failed to delete dataset:", error);
        alert(`Failed to delete dataset: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error deleting dataset:", error);
      alert("Failed to delete dataset. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="group bg-white rounded-xl border border-gray-200 p-6 hover:border-purple-300 hover:shadow-lg transition-all relative">
      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-center z-10">
          <div className="text-center p-4">
            <div className="text-red-600 mb-2">
              <Icon as={Trash2} className="h-8 w-8 mx-auto" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Delete Dataset</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete <strong>"{dataset.name}"</strong>?<br />
              This will permanently delete the dataset and all {dataset.docCount} document{dataset.docCount !== 1 ? 's' : ''}.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <Link href={`/datasets/${dataset.id}`} className="block">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <Icon as={FileText} className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                {dataset.name}
              </h3>
              <p className="text-sm text-gray-500 capitalize">
                {dataset.type.toLowerCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              dataset.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {dataset.isActive ? 'Active' : 'Inactive'}
            </span>
            
            {/* Delete button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete dataset"
            >
              <Icon as={Trash2} className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <Icon as={Database} className="h-4 w-4 mr-2" />
            {dataset.docCount} document{dataset.docCount !== 1 ? 's' : ''}
          </div>

          {dataset.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {dataset.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                  <Icon as={Tag} className="h-3 w-3 mr-1" />
                  {tag}
                </span>
              ))}
              {dataset.tags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{dataset.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          <div className="flex items-center text-xs text-gray-500">
            <Icon as={Clock} className="h-3 w-3 mr-1" />
            Updated {new Date(dataset.updatedAt).toLocaleDateString()}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center text-sm text-purple-600 group-hover:text-purple-700">
            <Icon as={Upload} className="h-4 w-4 mr-1" />
            Upload documents »
          </div>
        </div>
      </Link>
    </div>
  );
}
