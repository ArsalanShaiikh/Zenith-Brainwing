/**
 * Kept as its own module because the views import `urlFor` from here, but the
 * builder itself lives next to the client — it reads that client's config, so
 * the two have to make the "is this build configured at all?" decision once,
 * together. Building a second one here is what used to throw on an
 * unconfigured build.
 */
export { urlFor } from './client'
