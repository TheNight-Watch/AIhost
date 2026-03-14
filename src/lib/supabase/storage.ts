import { createClient } from "@/lib/supabase/client";

/**
 * Upload an agenda image to Supabase Storage.
 * Files are stored under the user's folder: {user_id}/{event_id}/{filename}
 */
export async function uploadAgendaImage(
  file: File,
  userId: string,
  eventId: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = createClient();
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${eventId}/agenda.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("uploads")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    const { data } = supabase.storage.from("uploads").getPublicUrl(fileName);

    return { url: data.publicUrl, error: null };
  } catch {
    return { url: null, error: "Failed to upload image. Storage may not be configured." };
  }
}

/**
 * Convert a File to base64 string for sending to the API.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
