import { redirect } from "next/navigation";

/** Legacy route kept as a compatibility redirect to the maintained workspace. */
export default function LegacySpaPage(): never {
  redirect("/app");
}
