/**
 * Temporary product feature flags.
 *
 * The KIP land map / plot picker is being reworked, so plot selection is hidden
 * for now: investors pick a preferred zone and enter the acreage they need
 * instead of choosing specific plots. Because the application fee is tied to the
 * number of plots, it is switched off while plot selection is hidden. Flip both
 * back to `true` (together) to restore the map and the per-plot fee, then
 * communicate the change to investors.
 */
export const PLOT_SELECTION_ENABLED = false;
export const APPLICATION_FEE_ENABLED = false;
