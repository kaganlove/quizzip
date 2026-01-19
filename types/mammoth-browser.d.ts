declare module "mammoth/mammoth.browser" {
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value?: string; messages?: any[] }>;

  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options?: any
  ): Promise<{ value?: string; messages?: any[] }>;

  export const images: {
    inline: (converter?: (image: any) => Promise<{ src: string }>) => any;
  };
}
