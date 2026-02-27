/**
 * URL Downloader API Route (Legacy)
 *
 * Maintains backward compatibility by re-exporting from check endpoint.
 *
 * New implementations should use:
 * - POST /api/tools/url-downloader/check - Check URL and get options
 * - POST /api/tools/url-downloader/download - Download media
 */

export { POST, GET } from "./check/route";
