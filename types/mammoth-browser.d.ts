declare module "mammoth/mammoth.browser" {
  export type ConvertResult = { value?: string; messages?: Array<{ type?: string; message?: string }> };

  export type Image = {
    contentType?: string;
    read: (encoding: "base64" | "buffer") => Promise<any>;
  };

  export const images: {
    inline: (fn: (image: Image) => Promise<{ src: string }>) => any;
  };

  export function extractRawText(input: { arrayBuffer: ArrayBuffer }, options?: any): Promise<ConvertResult>;
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }, options?: any): Promise<ConvertResult>;
}
