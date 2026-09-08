import { X509Certificate } from "crypto";
import { rootCertificates } from "tls";
import { describe, expect, it } from "vitest";

import { sefazTrustStore } from "@/services/fiscal/direct/sefaz-trust-store";

describe("sefazTrustStore", () => {
  it("preserva as autoridades padrao e adiciona a cadeia publica da SEFAZ-SP", () => {
    const authorities = sefazTrustStore();
    expect(authorities.slice(0, rootCertificates.length)).toEqual(rootCertificates);

    const bundled = authorities.at(-1) ?? "";
    const certificates = bundled
      .split("-----END CERTIFICATE-----")
      .filter((value) => value.includes("-----BEGIN CERTIFICATE-----"))
      .map((value) => new X509Certificate(`${value}-----END CERTIFICATE-----`));

    expect(certificates).toHaveLength(2);
    expect(certificates[0].subject).toContain("CN=AC SOLUTI SSL EV G4");
    expect(certificates[1].subject).toContain("CN=Autoridade Certificadora Raiz Brasileira v10");
    expect(certificates[0].verify(certificates[1].publicKey)).toBe(true);
    expect(certificates[1].verify(certificates[1].publicKey)).toBe(true);
  });
});
