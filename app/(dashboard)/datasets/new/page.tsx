'use client'

import { useFormStatus } from "react-dom";
import { createDatasetAction } from "./actions";
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Icon } from '@/components/Icon'
import { ArrowLeft, FolderPlus, Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NewDatasetPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <Icon as={ArrowLeft} className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Create Dataset</h1>
          <p className="text-gray-600 mt-2">
            Set up a new dataset to organize your documentation
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon as={FolderPlus} className="h-5 w-5" />
              Dataset Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createDatasetAction} className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-gray-700">Name *</label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Product Documentation"
                  required
                />
              </div>

              {/* Purpose */}
              <div className="space-y-2">
                <label htmlFor="purpose" className="text-sm font-medium text-gray-700">Purpose</label>
                <select
                  id="purpose"
                  name="purpose"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Documentation">Documentation</option>
                  <option value="API">API</option>
                  <option value="Internal">Internal</option>
                </select>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label htmlFor="tags" className="text-sm font-medium text-gray-700">Tags</label>
                <div className="relative">
                  <Icon as={Tag} className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="tags"
                    name="tags"
                    placeholder="e.g., api, docs, internal"
                    className="pl-10"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Separate multiple tags with commas
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Submit />
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-purple-600 hover:bg-purple-700"
    >
      {pending ? 'Creating...' : 'Create Dataset'}
    </Button>
  );
}
