import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/bicho-pet-logo.png"
      alt="Logo da Bicho Pet"
      width={100}
      height={100}
      priority={priority}
      className={cn("rounded-full object-cover", className)}
    />
  );
}
