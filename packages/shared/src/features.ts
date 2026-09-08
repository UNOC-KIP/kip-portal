/**
 * Product feature flags.
 *
 * Plot selection (the KIP land map + plot picker) and the per-plot application
 * fee are enabled together: the fee is a function of how many plots are chosen,
 * so one without the other makes no sense.
 */
export const PLOT_SELECTION_ENABLED = true;
export const APPLICATION_FEE_ENABLED = true;

/**
 * The UNOC GIS "instant/basic" viewer for the current-phase KIP plot map,
 * embedded in the EOI plot picker for visual reference. Selection itself happens
 * from the plot list (the embed is a third-party viewer we cannot read clicks
 * from). Swap the appid here when the published map changes.
 */
export const KIP_LAND_MAP_EMBED_URL =
  "https://gis.unoc.co.ug/portal/apps/instant/basic/index.html?appid=abaa323f24864837995963bdede3b5f8";
