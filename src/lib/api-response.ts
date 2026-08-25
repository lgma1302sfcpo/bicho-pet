import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAppError } from "./errors";

export function ok<T>(data: T) {
  return NextResponse.json({ data }, { status: 200 });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Dados invalidos.",
          details: error.flatten()
        }
      },
      { status: 422 }
    );
  }

  if (isAppError(error)) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      },
      { status: error.status }
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Nao foi possivel concluir a operacao."
      }
    },
    { status: 500 }
  );
}
