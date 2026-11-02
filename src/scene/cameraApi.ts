/**
 * Commandes de caméra accessibles depuis l'interface HTML (boutons zoom, rotation, recentrer).
 * Rempli par <CameraRig> à l'intérieur du Canvas.
 */
export interface CameraApi {
  zoomBy: (factor: number) => void;
  rotate: (direction: 1 | -1) => void;
  reset: () => void;
}

export const cameraApi: { current: CameraApi | null } = { current: null };

export const ZOOM_MIN = 15;
export const ZOOM_MAX = 140;
