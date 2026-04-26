import formidable from "formidable";
import { Readable } from "stream";

export async function parseMultipartForm(request: Request) {
  if (!request.body) {
    throw new Error("Missing request body");
  }

  const stream = Readable.fromWeb(request.body as never) as Readable & {
    headers: Record<string, string>;
    method: string;
    url: string;
  };

  stream.headers = Object.fromEntries(request.headers.entries());
  stream.method = request.method;
  stream.url = request.url;

  const form = formidable({
    maxFileSize: 500 * 1024 * 1024,
    multiples: false,
    keepExtensions: true
  });

  return new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
    form.parse(stream as never, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ fields, files });
    });
  });
}

export function fieldValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function firstFile(value: formidable.File | formidable.File[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}
