import { join } from 'path'
import { sanitizeFilePath } from 'mlly'
import { filename } from 'pathe/utils'
import * as Environment from '@speckle/shared/environment'
import { defineNuxtConfig } from 'nuxt/config'

// Copied out from nuxt vite-builder source to correctly build output chunk/entry/asset/etc file names
const withoutLeadingSlash = (path: string) => path.replace(/^\//, '')
const buildOutputFileName = (chunkName: string) =>
  withoutLeadingSlash(
    join('/_nuxt/', `${sanitizeFilePath(filename(chunkName))}.[hash].js`)
  )

const {
  SPECKLE_SERVER_VERSION,
  NUXT_PUBLIC_LOG_LEVEL = 'info',
  NUXT_PUBLIC_LOG_PRETTY = false,
  BUILD_SOURCEMAPS = 'false',
  HYDRATION_MISMATCH_REPORTING = 'false'
} = process.env

const featureFlags = Environment.getFeatureFlags()

const isLogPretty = ['1', 'true', true, 1].includes(NUXT_PUBLIC_LOG_PRETTY)
const buildSourceMaps = ['1', 'true', true, 1].includes(BUILD_SOURCEMAPS)
const hydrationMismatchReportingEnabled = ['1', 'true', true, 1].includes(
  HYDRATION_MISMATCH_REPORTING
)

const external = ['ioredis', 'jsdom']

/**
 * Optional dev-only proxy to a remote backend (see `yarn dev:frontend-2:proxy` in the
 * root package.json). When `SPECKLE_DEV_PROXY_TARGET` isn't set, no proxy is installed
 * at all and the frontend talks directly to `NUXT_PUBLIC_API_ORIGIN`, like before.
 *
 * The same command also has to pass `NUXT_PUBLIC_API_ORIGIN=/` so that the browser
 * keeps using relative urls (`/graphql`, `/api/...`) instead of a hardcoded backend
 * origin - only then does everything end up in this proxy. `/` is not a usable origin
 * and `normalizeOrigin()` turns it into `null`, i.e. "same origin" (an *empty* value
 * wouldn't work, `.env` overrides it).
 */
const devProxyTarget = (process.env.SPECKLE_DEV_PROXY_TARGET || '')
  .trim()
  .replace(/\/+$/, '')

if (devProxyTarget) {
  // SSR runs inside this dev server and can't use its own proxy, so it has to reach the
  // backend directly. This also marks the backend origin as internal, which makes
  // `useInternalUrlUtils` turn backend absolute URLs (previews/thumbnails, built from
  // the backend's CANONICAL_URL) into relative ones that the proxy can handle.
  // (The npm script passes the same value through as well, since build tools like
  // `yarn gqlgen` read it straight from the environment.)
  process.env.NUXT_PUBLIC_BACKEND_API_ORIGIN = devProxyTarget
}

/**
 * Vite matches these keys against the request url (see its `doesProxyContextMatchUrl`):
 * keys starting with `^` are used as a regex, everything else is a plain
 * `url.startsWith(key)`. Plain prefixes are too blunt here, e.g. '/auth' would also
 * swallow the frontend's own /authn/* pages.
 */
const devProxyContexts = [
  '^/api/',
  '^/graphql',
  '^/auth/',
  '^/objects/',
  // Backend generated absolute URLs (previews/thumbnails, built from the backend's
  // CANONICAL_URL) get rewritten to relative ones by `useInternalUrlUtils`, so they
  // have to be proxied too once the backend origin counts as internal.
  '^/preview/',
  '^/static/'
]

const devProxy = devProxyTarget
  ? Object.fromEntries(
      devProxyContexts.map((context) => [
        context,
        {
          target: `${devProxyTarget}/`,
          changeOrigin: true,
          ws: context === '^/graphql',
          // the target keeps its trailing slash, so drop the leading one here
          rewrite: (path: string) => path.replace(/^\//, '')
        }
      ])
    )
  : undefined

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  ...(buildSourceMaps ? { sourcemap: true } : {}),
  modulesDir: ['./node_modules'],
  typescript: {
    shim: false,
    strict: true,
    tsConfig: {
      compilerOptions: {
        moduleResolution: 'bundler',
        // TODO: More correct, but requires a lot of (minor) changes
        noUncheckedIndexedAccess: false
      }
    }
  },
  modules: [
    '@nuxt/eslint',
    '@nuxt/devtools',
    '@nuxt/image',
    '@nuxtjs/tailwindcss',
    [
      '~/lib/core/nuxt-modules/apollo/module.ts',
      {
        configResolvers: {
          default: '~/lib/core/configs/apollo.ts'
        }
      }
    ],
    '@speckle/ui-components-nuxt',
    ['@artmizu/nuxt-prometheus', { verbose: false }]
  ],
  runtimeConfig: {
    redisUrl: '',
    public: {
      ...featureFlags,
      apiOrigin: '',
      backendApiOrigin: '',
      dtpApiOrigin: '',
      dtpUIOrigin: '',
      baseUrl: '',
      logLevel: NUXT_PUBLIC_LOG_LEVEL,
      logPretty: isLogPretty,
      logCsrEmitProps: false,
      logClientApiToken: '',
      logClientApiEndpoint: '',
      speckleServerVersion: SPECKLE_SERVER_VERSION || 'unknown',
      serverName: 'unknown',
      viewerDebug: false,
      debugCoreWebVitals: false,
      datadogAppId: '',
      datadogClientToken: '',
      datadogSite: '',
      datadogService: '',
      datadogEnv: '',
      intercomAppId: '',
      dashboardsOrigin: '',
      parallelMiddlewares: true,
      disableViewerActivityBroadcasting: false
    }
  },

  experimental: {
    emitRouteChunkError: 'automatic-immediate',
    asyncContext: true // necessary for parallel middlewares
  },

  alias: {
    // Rewriting all lodash calls to lodash-es for proper tree-shaking & chunk splitting
    // lodash: 'lodash-es'
    // '@vue/apollo-composable': '@speckle/vue-apollo-composable'
  },

  vite: {
    esbuild: {
      drop: ['console']
    },

    define: {
      ...(hydrationMismatchReportingEnabled
        ? {
            __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true'
          }
        : {})
    },

    ssr: {
      external
    },

    optimizeDeps: {
      // Should only be ran on serverside anyway. W/o this it tries to transpile it unsuccessfully
      exclude: external
    },

    vue: {
      script: {
        defineModel: true
      }
    },

    resolve: {
      alias: [{ find: /^lodash(?!(-es|\/fp|\.))/, replacement: 'lodash-es' }],
      // i've no idea why, but the same version of various deps gets bundled twice
      // in the case of vee-validate, this is just a guess, but maybe it gets confused cause there's a vee-validate install both under ui-components
      // and also under frontend-2. they're the same version, but apparently that's not enough...
      dedupe: ['prosemirror-state', '@tiptap/pm', 'prosemirror-model', 'vee-validate']
    },
    server: {
      fs: {
        // Allowing symlinks
        // allow: ['/home/fabis/Code/random/vue-apollo/']
      },
      // Dev-only proxy, only installed when SPECKLE_DEV_PROXY_TARGET is set - see
      // `yarn dev:frontend-2:proxy` in the root package.json. Production doesn't use
      // it: there the ingress (utils/docker-compose-ingress) or Nitro route rules
      // take care of routing backend paths.
      ...(devProxy ? { proxy: devProxy } : {})
    },

    build: {
      rollupOptions: {
        output: {
          /**
           * Keep Nuxt's default dev filenames so Vite can serve virtual assets correctly.
           */
          entryFileNames: (chunkInfo) => buildOutputFileName(chunkInfo.name),
          chunkFileNames: (chunkInfo) => buildOutputFileName(chunkInfo.name)
        },
        // Leave imports as is, they're server-side only
        external: ['jsdom']
      }
      // // optionally disable minification for debugging
      // minify: false,
      // // optionally enable sourcemaps for debugging
      // sourcemap: 'inline'
    }
  },

  routeRules: {
    '/**': {
      headers: {
        // No search engine indexing on any of the pages anywhere! TODO: Come up with a more appropriate policy
        'X-Robots-Tag': 'noindex, nofollow, noarchive'
      },
      appMiddleware: [
        // Has to be applied to all pages and as the very last app middleware (hence the 999 prefix)
        '999-parallel-finalize'
      ]
    },
    // Proxy DTP API requests (both dev and production)
    '/__dtp/**': {
      proxy: 'http://192.168.20.157:30080/service/**'
    },
    // Proxy DTP static resources (thumbnails, files, etc.)
    '/__dtp-static/**': {
      proxy: 'http://192.168.20.157:30080/**'
    },
    '/functions': {
      redirect: {
        to: '/',
        statusCode: 307
      }
    },
    // Redirect old settings pages
    '/server-management/projects': {
      redirect: {
        to: '/settings/server/projects',
        statusCode: 301
      }
    },
    '/server-management/active-users': {
      redirect: {
        to: '/settings/server/active-users',
        statusCode: 301
      }
    },
    '/server-management/pending-invitations': {
      redirect: {
        to: '/settings/server/pending-invitations',
        statusCode: 301
      }
    },
    '/server-management': {
      redirect: {
        to: '/settings/server/general',
        statusCode: 301
      }
    },
    '/profile': {
      redirect: {
        to: '/settings/user/profile',
        statusCode: 301
      }
    },
    '/settings/server/active-users': {
      redirect: {
        to: '/settings/server/members',
        statusCode: 301
      }
    },
    '/settings/server/pending-invitations': {
      redirect: {
        to: '/settings/server/members',
        statusCode: 301
      }
    },
    // Redirect old settings - End
    '/downloads': {
      redirect: {
        to: '/',
        statusCode: 301
      }
    },
    '/workspaces': {
      redirect: {
        to: '/workspaces/actions/create',
        statusCode: 301
      }
    }
  },

  nitro: {
    compressPublicAssets: true,
    externals: {
      external
    }
  },

  build: {
    transpile: [
      /^@apollo\/client/,
      'ts-invariant/process',
      '@vue/apollo-composable',
      '@speckle/vue-apollo-composable',
      '@headlessui/vue',
      /^@heroicons\/vue/,
      '@vueuse/core',
      '@vueuse/shared',
      '@speckle/ui-components',
      'v3-infinite-loading',
      /prosemirror.*/,
      /^lodash(?!-es)/,
      // w/o these there's a weird error where Kind from graphql is undefined in dev mode
      'graphql',
      /^graphql\/.+/,
      'graphql/language/printer',
      'graphql/utilities/getOperationAST'
    ]
  },
  features: {
    devLogs: true
  }
})
