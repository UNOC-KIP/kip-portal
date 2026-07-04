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
