import { redirect } from "react-router";

export function loader() {
  return redirect("/admin/blinks");
}

export default function BlinksRedirect() {
  return null;
}
