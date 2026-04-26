import { Readable } from "stream";
import cloudinary from "@/lib/cloudinary";

export interface CloudinaryVideoUpload {
  secureUrl: string;
  publicId: string;
  duration: number;
  thumbnailUrl: string;
}

export async function uploadToCloudinary(buffer: Buffer, filename: string): Promise<CloudinaryVideoUpload> {
  const result = await new Promise<{
    secure_url: string;
    public_id: string;
    duration?: number;
  }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "assembly-manager/videos",
        resource_type: "video",
        filename_override: filename,
        use_filename: true,
        unique_filename: true
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(uploadResult as { secure_url: string; public_id: string; duration?: number });
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });

  const thumbnailUrl = result.secure_url.replace("/upload/", "/upload/so_3,w_400,h_225,c_fill/");

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
    duration: Math.round(result.duration ?? 0),
    thumbnailUrl
  };
}

export async function uploadVideoFileToCloudinary(filePath: string, filename: string): Promise<CloudinaryVideoUpload> {
  const result = await new Promise<{
    secure_url?: string;
    url?: string;
    public_id: string;
    duration?: number;
    done?: boolean;
  }>((resolve, reject) => {
    cloudinary.uploader.upload_large(
      filePath,
      {
        folder: "assembly-manager/videos",
        resource_type: "video",
        filename_override: filename,
        use_filename: true,
        unique_filename: true,
        chunk_size: 20_000_000
      },
      (error, uploadResult) => {
        if (error) {
          reject(error);
          return;
        }

        const resultChunk = uploadResult as
          | {
              secure_url?: string;
              url?: string;
              public_id: string;
              duration?: number;
              done?: boolean;
            }
          | undefined;

        if (!resultChunk) return;
        if (resultChunk.secure_url || resultChunk.done === true) {
          resolve(resultChunk);
        }
      }
    );
  });

  const secureUrl = result.secure_url ?? result.url;
  if (!secureUrl) {
    throw new Error("Cloudinary upload finished without a video URL");
  }

  const thumbnailUrl = secureUrl.replace("/upload/", "/upload/so_3,w_400,h_225,c_fill/");

  return {
    secureUrl,
    publicId: result.public_id,
    duration: Math.round(result.duration ?? 0),
    thumbnailUrl
  };
}

export async function uploadImageToCloudinary(buffer: Buffer, filename: string) {
  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "assembly-manager/logos",
        resource_type: "image",
        filename_override: filename,
        use_filename: true,
        unique_filename: true
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("Cloudinary image upload failed"));
          return;
        }
        resolve(uploadResult as { secure_url: string; public_id: string });
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });

  return { secureUrl: result.secure_url, publicId: result.public_id };
}

export async function uploadIdleImageToCloudinary(buffer: Buffer, filename: string) {
  const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "assembly-manager/idle-images",
        resource_type: "image",
        filename_override: filename,
        use_filename: true,
        unique_filename: true
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("Cloudinary idle image upload failed"));
          return;
        }
        resolve(uploadResult as { secure_url: string; public_id: string });
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });

  return { secureUrl: result.secure_url, publicId: result.public_id };
}

