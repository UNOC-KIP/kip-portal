// Fail the build if the API URL wasn't supplied. NEXT_PUBLIC_API_URL is inlined
// into the browser bundle at build time (Dockerfile build-arg <- deploy.yml
// `vars.NEXT_PUBLIC_API_URL`). If it's missing, admin actions silently fall back
// to http://localhost:4001 and every mutation fails in the deployed browser.
// Erroring here stops a URL-less image from ever shipping — you find out in CI,
// not after a click in production. Only enforced for production builds so
// `next dev` still works without it.
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not set for this production build. Set it to the API " +
      "origin (e.g. https://api.kip.unoc.com) before `next build`. In CI this comes " +
      "from the GitHub Actions variable NEXT_PUBLIC_API_URL, passed as a Docker build-arg.",
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@kip/shared"],
  // @kip/db must NOT be bundled — webpack can't resolve sequelize's dynamic
  // require('pg') at build time. Mark the whole chain as server-external so
  // Node.js loads it natively from dist/index.js at runtime.
  serverExternalPackages: ["@kip/db", "sequelize", "pg", "pg-hstore", "pg-pool", "bcryptjs"],
  webpack: (config, { isServer }) => {
    // pnpm's node_modules layout causes Next.js's serverExternalPackages
    // package-name detection to fail, so @kip/db and its Sequelize deps get
    // bundled. We force them external via an explicit function that runs before
    // Next.js's own externals handler, and disable symlink resolution so
    // webpack uses package names (not real paths) as module identities.
    config.resolve.symlinks = false;
    if (isServer) {
      const FORCE_EXTERNAL = ['@kip/db', 'sequelize', 'pg', 'pg-hstore', 'pg-pool', 'bcryptjs'];
      const prevExternals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : [];
      config.externals = [
        ({ request }, callback) => {
          for (const pkg of FORCE_EXTERNAL) {
            if (request === pkg || request?.startsWith(pkg + '/')) {
              return callback(null, `commonjs ${request}`);
            }
          }
          callback();
        },
        ...prevExternals,
      ];
    }
    return config;
  },
};

export default nextConfig;
