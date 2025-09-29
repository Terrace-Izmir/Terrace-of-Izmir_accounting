import Tesseract from "tesseract.js";

export async function extractTextFromImage(imagePath: string): Promise<string> {
  const { data } = await Tesseract.recognize(imagePath, "tur+eng", {
    logger: process.env.NODE_ENV === "development" ? console.log : undefined,
  });

  return data.text?.trim() ?? "";
}
