import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DataLoadingState({ label = "Carregando informações..." }: { label?: string }) {
  return (
    <Card className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center" role="status" aria-live="polite">
      <LoaderCircle className="animate-spin text-brand-700" size={32} aria-hidden="true" />
      <div>
        <p className="font-medium text-ink">{label}</p>
        <p className="mt-1 text-sm text-subdued">Aguarde enquanto os dados são atualizados.</p>
      </div>
    </Card>
  );
}

export function DataErrorState({
  message = "Não foi possível carregar as informações.",
  onRetry
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <Card className="flex min-h-48 flex-col items-center justify-center gap-3 border-red-200 p-6 text-center" role="alert">
      <AlertCircle className="text-danger" size={32} aria-hidden="true" />
      <div>
        <p className="font-medium text-ink">{message}</p>
        <p className="mt-1 text-sm text-subdued">Verifique sua conexão e tente novamente.</p>
      </div>
      <Button type="button" variant="secondary" onClick={onRetry}>
        <RefreshCw size={17} />
        Tentar novamente
      </Button>
    </Card>
  );
}
