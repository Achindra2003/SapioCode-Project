import { redirect } from "next/navigation";

export default function Home() {
    // Simple redirect to login as this is an auth-only module
    redirect("/login");
}
