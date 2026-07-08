/** @type {import('next').NextConfig} */
const nextConfig = {
  // Phase 21 S9 (2026-07-04): '@lados/contractor-pack' removed — that
  // workspace package was archived (see archived/packs/) and no longer
  // exists for Next to transpile.
  transpilePackages: ['@lados/shared-types'],
};

export default nextConfig;
