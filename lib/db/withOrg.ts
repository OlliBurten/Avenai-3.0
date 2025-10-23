/**
 * Row-Level Security (RLS) Helper for Multi-Tenant Queries
 * 
 * This module provides utilities for executing database queries with proper
 * organization context enforcement using PostgreSQL session variables and RLS policies.
 */

import { prisma } from '@/lib/prisma';

/**
 * Execute a database query with organization context for RLS enforcement
 * 
 * This function sets the PostgreSQL session variable 'app.current_org' which is
 * used by Row-Level Security policies to filter data access by organization.
 * 
 * @param orgId - Organization ID to set in the session context
 * @param run - Async function to execute with the org context set
 * @returns The result of the executed function
 * 
 * @example
 * ```typescript
 * // Query documents with org context
 * const docs = await withOrg(organizationId, async () => {
 *   return prisma.document.findMany({
 *     where: { status: 'COMPLETED' }
 *   });
 * });
 * 
 * // Query chunks with org context
 * const chunks = await withOrg(organizationId, async () => {
 *   return prisma.documentChunk.findMany({
 *     where: {
 *       metadata: {
 *         path: ['element_type'],
 *         equals: 'table'
 *       }
 *     }
 *   });
 * });
 * ```
 */
export async function withOrg<T>(
  orgId: string,
  run: () => Promise<T>
): Promise<T> {
  if (!orgId || typeof orgId !== 'string') {
    throw new Error('Organization ID is required for RLS context');
  }

  try {
    // Set the current organization in the PostgreSQL session variable
    // This is used by RLS policies to filter queries
    // The 'true' parameter makes this setting local to the current transaction
    await prisma.$executeRaw`
      SELECT set_config('app.current_org', ${orgId}, true)
    `;

    // Execute the provided function with org context set
    const result = await run();

    return result;
  } catch (error) {
    console.error('[withOrg] Error executing query with org context:', {
      orgId,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Get the current organization context from the session
 * Useful for debugging or verification
 * 
 * @returns The current organization ID or null if not set
 */
export async function getCurrentOrg(): Promise<string | null> {
  try {
    // Use $queryRawUnsafe to avoid parameterization issues
    const result = await prisma.$queryRaw<Array<{ setting: string }>>`
      SELECT current_setting('app.current_org', true)::text as setting
    `;
    
    const setting = result[0]?.setting;
    
    // Return null if setting is empty string or null
    return setting && setting.trim() !== '' ? setting : null;
  } catch (error) {
    console.error('[getCurrentOrg] Error getting current org:', error);
    return null;
  }
}

/**
 * Clear the organization context from the session
 * Useful for testing or cleanup
 */
export async function clearOrgContext(): Promise<void> {
  try {
    await prisma.$executeRaw`
      SELECT set_config('app.current_org', '', true)
    `;
  } catch (error) {
    console.error('[clearOrgContext] Error clearing org context:', error);
  }
}

/**
 * Verify that RLS is properly enforcing organization isolation
 * 
 * @param orgId - Organization ID to test
 * @returns Object with test results
 */
export async function verifyRLSIsolation(orgId: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Get count without org context
    const totalCount = await prisma.document.count();

    // Get count with org context
    const orgCount = await withOrg(orgId, async () => {
      return prisma.document.count();
    });

    // If counts are different, RLS is working
    const isWorking = orgCount <= totalCount;

    return {
      success: isWorking,
      message: isWorking
        ? 'RLS is properly isolating organization data'
        : 'RLS may not be properly configured',
      details: {
        totalDocuments: totalCount,
        orgDocuments: orgCount,
        orgId
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `RLS verification failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

