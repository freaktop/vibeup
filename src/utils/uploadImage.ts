/**
 * Upload images to Firebase Storage and return download URLs.
 * Falls back to base64 data URLs when not authenticated or in demo mode.
 */
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firebaseStorage } from '../firebase';
import { getCurrentUid, isDemoMode } from '../auth';

export async function uploadProfilePhoto(file: File): Promise<string> {
  const uid = getCurrentUid();
  if (isDemoMode() || !uid || !firebaseStorage) {
    return readAsDataURL(file);
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `profiles/${uid}/${Date.now()}.${ext}`;
  const storageRef = ref(firebaseStorage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type || 'image/jpeg',
    customMetadata: { uploadedBy: uid },
  });

  return getDownloadURL(storageRef);
}

export async function uploadChatImage(file: File, matchId: string): Promise<string> {
  const uid = getCurrentUid();
  if (isDemoMode() || !uid || !firebaseStorage) {
    return readAsDataURL(file);
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `chat/${matchId}/${Date.now()}_${uid.slice(0, 8)}.${ext}`;
  const storageRef = ref(firebaseStorage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type || 'image/jpeg',
    customMetadata: { matchId, senderId: uid },
  });

  return getDownloadURL(storageRef);
}

export async function uploadWallPostImage(file: File): Promise<string> {
  const uid = getCurrentUid();
  if (isDemoMode() || !uid || !firebaseStorage) {
    return readAsDataURL(file);
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `posts/${uid}/${Date.now()}.${ext}`;
  const storageRef = ref(firebaseStorage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type || 'image/jpeg',
    customMetadata: { authorId: uid },
  });

  return getDownloadURL(storageRef);
}

export async function uploadVoiceNote(blob: Blob, matchId: string): Promise<string> {
  const uid = getCurrentUid();
  if (isDemoMode() || !uid || !firebaseStorage) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read audio'));
      reader.readAsDataURL(blob);
    });
  }

  const path = `chat/${matchId}/voice_${Date.now()}_${uid.slice(0, 8)}.webm`;
  const storageRef = ref(firebaseStorage, path);
  const file = new File([blob], 'voice.webm', { type: blob.type || 'audio/webm' });

  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: { matchId, senderId: uid },
  });

  return getDownloadURL(storageRef);
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        } else {
          resolve(reader.result as string);
        }
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
