import { useEffect } from "react";
import { useRouter } from "next/router";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login"); // Redirige al usuario automáticamente
  }, []);

  return null; // No renderiza nada, solo redirige
}
