import crypto from "node:crypto";

import bcrypt from "bcryptjs";

export interface PasswordHasher {
  hash(value: string): Promise<string>;
  verify(value: string, hash: string): Promise<boolean>;
}

export const bcryptPasswordHasher: PasswordHasher = {
  hash(value) {
    return bcrypt.hash(value, 12);
  },
  verify(value, hash) {
    return bcrypt.compare(value, hash);
  }
};

export function createResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
