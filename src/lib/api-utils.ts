import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function decimalOrUndefined(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) {
    return undefined;
  }

  return value;
}

export function success<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function created<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { status: 201, ...init });
}

export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Geçersiz veri", issues: error.issues },
      { status: 400 },
    );
  }

  if (error instanceof Error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  console.error(error);
  return NextResponse.json(
    { error: "Beklenmeyen bir hata oluştu" },
    { status: 500 },
  );
}
