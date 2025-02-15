import { basename } from '../../util/path.js';
import { timerify } from '../../util/Performance.js';
import { hasDependency, load } from '../../util/plugin.js';
import { toEntryPattern, toProductionEntryPattern } from '../../util/protocols.js';
import type { PluginConfig } from './types.js';
import type { IsPluginEnabledCallback, GenericPluginCallback } from '../../types/plugins.js';

// link to docs

export const NAME = '';

/** @public */
export const ENABLERS = [''];

export const isEnabled: IsPluginEnabledCallback = ({ dependencies }) => hasDependency(dependencies, ENABLERS);

export const CONFIG_FILE_PATTERNS = [];

/** @public */
export const ENTRY_FILE_PATTERNS = [];

/** @public */
export const PRODUCTION_ENTRY_FILE_PATTERNS = [];

export const PROJECT_FILE_PATTERNS = [];

const findPluginDependencies: GenericPluginCallback = async (configFilePath, options) => {
  const { manifest, config, isProduction } = options;

  const localConfig: PluginConfig | undefined =
    // @ts-expect-error `plugin` is a placeholder, not an actual plugin name
    basename(configFilePath) === 'package.json' ? manifest.plugin : await load(configFilePath);

  if (!localConfig) return [];

  /**
   * If the plugin allows to configure entry files, order of precedence (use only the first one that's set):
   *
   * 1. config.entry (user overrides in Knip config)
   * 2. entry patterns from `localConfig` (read from local tool config)
   * 3. ENTRY_FILE_PATTERNS (default/fallback as defined here in this plugin)
   */
  const entryPatterns = (config?.entry ?? localConfig.entryPathsOrPatterns ?? ENTRY_FILE_PATTERNS).map(toEntryPattern);

  /**
   * If the tool has the concept of entry files for production, we need `PRODUCTION_ENTRY_FILE_PATTERNS`. Return those
   * if `config.entry` is not set.
   */
  const productionPatterns = config.entry ? [] : PRODUCTION_ENTRY_FILE_PATTERNS.map(toProductionEntryPattern);

  /**
   * In production mode (isProduction=true) we have two common scenarios:
   *
   * - Plugins that don't deal with entry or production entry files at all can bail out at the start of this function.
   * - Plugins that only deal with `devDependencies` can bail out here and return all entry patterns.
   *
   * Both scenarios skip finding devDependencies in `localConfig`.
   */
  if (isProduction) return [...entryPatterns, ...productionPatterns];

  // resolve dependencies/binaries from local config file
  const dependencies = localConfig?.plugins ?? [];

  return [...dependencies, ...entryPatterns, ...productionPatterns];
};

export const findDependencies = timerify(findPluginDependencies);
