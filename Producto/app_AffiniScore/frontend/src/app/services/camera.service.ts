import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import {
  Camera,
  CameraResultType,
  CameraSource,
  PermissionStatus,
} from '@capacitor/camera';

export interface CameraResult {
  /** Base64 sin prefijo data URI, listo para subir */
  base64: string;
  /** Data URI completo para mostrar en pantalla */
  dataUrl: string;
  /** Formato de la imagen ('jpeg' o 'png') */
  format: string;
}

/**
 * CameraService centraliza todo el flujo de permisos y captura de fotos
 * usando @capacitor/camera. Soporta cámara nativa (Capacitor) y fallback
 * a <input type="file"> cuando se corre en el navegador web.
 *
 * Flujo para plataformas nativas:
 *  1. checkPermissions() → si 'granted', tomar foto directamente.
 *  2. Si el estado es 'prompt', llamar requestPermissions() y esperar respuesta.
 *  3. Si el usuario niega permanentemente → mostrar AlertController explicando
 *     por qué AffiniScore necesita la cámara y cómo habilitarla en Ajustes.
 */
@Injectable({ providedIn: 'root' })
export class CameraService {

  constructor(private alertCtrl: AlertController) {}

  /**
   * Método principal. Devuelve un CameraResult o null si el usuario canceló/denegó.
   * @param source  'CAMERA' para cámara directa, 'PHOTOS' para galería, 'PROMPT' para dejar elegir al usuario
   */
  async takePicture(source: 'CAMERA' | 'PHOTOS' | 'PROMPT' = 'PROMPT'): Promise<CameraResult | null> {

    // En web/browser usamos el <input type="file"> nativo a través del source PROMPT de Capacitor
    if (!Capacitor.isNativePlatform()) {
      return this.takeWebPicture(source);
    }

    // ── FLUJO NATIVO ─────────────────────────────────────────────────
    const hasPermission = await this.ensurePermissions();
    if (!hasPermission) return null;

    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source === 'CAMERA'
          ? CameraSource.Camera
          : source === 'PHOTOS'
          ? CameraSource.Photos
          : CameraSource.Prompt,
        saveToGallery: false,
      });

      if (!photo.base64String) return null;

      return {
        base64: photo.base64String,
        dataUrl: `data:image/${photo.format};base64,${photo.base64String}`,
        format: photo.format ?? 'jpeg',
      };
    } catch (err: any) {
      // El usuario canceló el selector de foto — no es un error real
      const msg = (err?.message ?? String(err)).toLowerCase();
      if (msg.includes('cancel') || msg.includes('no image')) return null;
      console.error('[CameraService] Error capturando foto:', err);
      return null;
    }
  }

  // ── GESTIÓN DE PERMISOS ───────────────────────────────────────────────

  /**
   * Verifica y, si es necesario, solicita los permisos de cámara y fotos.
   * Retorna true si se puede proceder, false si el usuario denegó el acceso.
   */
  async ensurePermissions(): Promise<boolean> {
    let status: PermissionStatus;

    try {
      status = await Camera.checkPermissions();
    } catch {
      // Si checkPermissions falla (ej. simulador sin cámara), asumimos que podemos intentar
      return true;
    }

    const cameraOk = this.isGranted(status.camera);
    const photosOk = this.isGranted(status.photos);

    if (cameraOk && photosOk) return true;

    // Estado 'prompt' o 'prompt-with-rationale' → solicitar permisos
    if (this.isRequestable(status.camera) || this.isRequestable(status.photos)) {
      let requested: PermissionStatus;
      try {
        requested = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
      } catch {
        return false;
      }

      if (this.isGranted(requested.camera) && this.isGranted(requested.photos)) {
        return true;
      }
    }

    // Estado 'denied' (denegación permanente) → mostrar alerta educativa
    await this.showPermissionDeniedAlert();
    return false;
  }

  // ── HELPERS ──────────────────────────────────────────────────────────

  private isGranted(state: string | undefined): boolean {
    return state === 'granted';
  }

  private isRequestable(state: string | undefined): boolean {
    return state === 'prompt' || state === 'prompt-with-rationale' || state === 'limited';
  }

  /**
   * Alerta amigable cuando el usuario ha denegado los permisos permanentemente.
   * Le explica por qué AffiniScore necesita la cámara y cómo habilitarla.
   */
  private async showPermissionDeniedAlert(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: '📸 Permisos de Cámara',
      subHeader: 'Necesitamos acceso a tu cámara',
      message:
        'AffiniScore usa la cámara para que tú y tu pareja puedan:\n\n' +
        '• Capturar recuerdos especiales juntos\n' +
        '• Validar retos completados con fotos\n' +
        '• Personalizar tu foto de perfil\n\n' +
        'Para habilitarlo, ve a Ajustes › AffiniScore › Permisos y activa "Cámara" y "Fotos".',
      mode: 'ios',
      cssClass: 'camera-permission-alert',
      buttons: [
        {
          text: 'Ahora no',
          role: 'cancel',
          cssClass: 'alert-btn-cancel',
        },
        {
          text: 'Ir a Ajustes',
          cssClass: 'alert-btn-primary',
          handler: () => {
            // Capacitor no tiene un método directo para abrir ajustes de app,
            // pero @capacitor/app puede hacerlo en versiones recientes.
            // Como workaround seguro, mostramos las instrucciones en el mensaje.
            // Si tienes @capacitor/app >= 4, puedes usar: App.openUrl({ url: 'app-settings:' })
            console.log('[CameraService] Usuario redirigido a Ajustes manualmente.');
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Fallback para navegador web: usa Camera.getPhoto con source Prompt,
   * que internamente dispara el <input type="file"> del browser.
   */
  private async takeWebPicture(source: 'CAMERA' | 'PHOTOS' | 'PROMPT'): Promise<CameraResult | null> {
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: source === 'CAMERA'
          ? CameraSource.Camera
          : source === 'PHOTOS'
          ? CameraSource.Photos
          : CameraSource.Prompt,
      });

      if (!photo.base64String) return null;

      return {
        base64: photo.base64String,
        dataUrl: `data:image/${photo.format};base64,${photo.base64String}`,
        format: photo.format ?? 'jpeg',
      };
    } catch {
      return null;
    }
  }

  /**
   * Convierte un base64 string a un objeto File/Blob para subida a Supabase.
   */
  base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Blob {
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
  }

  /**
   * Convierte el resultado de CameraService a un File para subir.
   */
  resultToFile(result: CameraResult, fileName: string = 'photo.jpg'): File {
    const blob = this.base64ToBlob(result.base64, `image/${result.format}`);
    return new File([blob], fileName, { type: `image/${result.format}` });
  }
}
