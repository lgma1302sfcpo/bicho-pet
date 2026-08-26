import { ShieldX } from "lucide-react";

import { Card } from "@/components/ui/card";

export default function AccessDeniedPage() {
  return (
    <div className="erp-page mx-auto grid min-h-[60vh] max-w-xl place-items-center">
      <Card className="w-full p-6 text-center sm:p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-700">
          <ShieldX size={28} />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Acesso não autorizado</h1>
        <p className="mt-2 text-sm leading-relaxed text-subdued">
          Seu perfil não possui permissão para abrir esta tela. Solicite a liberação ao administrador da loja.
        </p>
      </Card>
    </div>
  );
}
