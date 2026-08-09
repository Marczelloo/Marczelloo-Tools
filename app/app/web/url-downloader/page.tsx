import { redirect } from "next/navigation";

/** Backwards-compatible alias for the registered downloader route. */
export default function UrlDownloaderAliasPage(): never {
  redirect("/app/downloader/url-downloader");
}
