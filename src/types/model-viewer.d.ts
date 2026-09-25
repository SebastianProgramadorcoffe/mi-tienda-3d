// Declara el custom element <model-viewer> (cargado por script, no por npm)
// para que TypeScript/JSX lo acepte dentro de componentes "use client".
// Con React 19 + jsx: "react-jsx", el namespace JSX efectivo es React.JSX
// (ver node_modules/@types/react/jsx-runtime.d.ts), así que se aumenta ahí
// en vez del namespace global JSX.
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        poster?: string;
        ar?: boolean;
        "ar-modes"?: string;
        "camera-controls"?: boolean;
        "auto-rotate"?: boolean;
        "shadow-intensity"?: string | number;
        exposure?: string | number;
        loading?: "auto" | "lazy" | "eager";
        reveal?: "auto" | "interaction" | "manual";
      };
    }
  }
}

export {};
