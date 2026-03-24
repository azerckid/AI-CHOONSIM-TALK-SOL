import { redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  // 루트 경로(/) 접근 시 /home으로 리다이렉트
  throw redirect("/home");
}

export default function Index() {
  return null;
}

