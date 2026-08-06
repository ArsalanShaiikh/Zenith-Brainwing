import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

/**
 * The Sanity client, and a promise that it will never take the app down.
 *
 * `createClient` throws *at module load* if it has no projectId — not on the
 * first query, on the import. This module is imported by the Floorplan and
 * Amenities views, which Shell imports, which App imports, so an unconfigured
 * build failed before React ever mounted: a white page with nothing on it but
 * `Uncaught Error: Configuration must contain 'projectId'`.
 *
 * That is exactly what a build without the vars looks like — a fresh clone, CI,
 * or a host where they have not been set yet. The credentials are deliberately
 * not in the repo (see .env.example), so "not configured" has to be an ordinary
 * state rather than a crash.
 *
 * Unconfigured, `client.fetch()` rejects. Both views already `.catch()` their
 * query and fall back to the bundled plan and amenity data, so the app runs on
 * what it ships with and only the CMS-authored content goes missing.
 */

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID
const dataset = import.meta.env.VITE_SANITY_DATASET
// Pinned rather than left undefined: the client warns on every construction
// without one, and an absent version is its own deprecation notice.
const apiVersion = import.meta.env.VITE_SANITY_API_VERSION || '2024-01-01'

/** Whether this build has enough to talk to the CMS at all. */
export const sanityConfigured = Boolean(projectId && dataset)

if (!sanityConfigured && import.meta.env.DEV) {
  console.warn(
    '[sanity] VITE_SANITY_PROJECT_ID / VITE_SANITY_DATASET are not set — CMS ' +
      'content is off and the views will use their bundled data. See .env.example.',
  )
}

/** Stands in for the real client so imports resolve and queries just fail. */
const offline = {
  fetch: () => Promise.reject(new Error('Sanity is not configured for this build')),
  config: () => ({ projectId, dataset, apiVersion }),
}

export const client = sanityConfigured
  ? createClient({ projectId, dataset, apiVersion, useCdn: false })
  : offline

// The builder reads the client's config, so it is only safe to construct when
// there is one. Unconfigured, `urlFor` returns a chainable no-op: the views
// only reach for it once a query has returned something, which cannot happen
// here, but it must not be the thing that throws if that ever changes.
const builder = sanityConfigured ? imageUrlBuilder(client) : null

const noImage = {
  url: () => '',
  width: () => noImage,
  height: () => noImage,
  auto: () => noImage,
  fit: () => noImage,
  quality: () => noImage,
}

export const urlFor = (source) => (builder ? builder.image(source) : noImage)
