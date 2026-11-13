import photos from "./partPhotos.json";
export type PartPhoto = {
  src: string;
  title: string;
  source: string;
  id: string;
};
const catalog = photos as Record<string, PartPhoto>;
export function workshopPhoto(id: string, category: string) {
  const exact: Record<string, string> = {
    "basic-rover": "basic",
    "polar-rover": "rover",
    "heavy-rover": "heavy",
    nss: "nss",
    nirvss: "nirvss",
    trident: "drill",
    msolo: "msolo",
  };
  const family = id.startsWith("geo-") ? id.split("-")[1] : "";
  return catalog[
    exact[id] ??
      (
        {
          ir: "nirvss",
          xrf: "xrf",
          xrd: "xrd",
          seismometer: "seismometer",
          gpr: "gpr",
          camera: "camera",
          drill: "drill",
          scoop: "sample",
        } as Record<string, string>
      )[family] ??
      (
        {
          rover: "rover",
          solar: "solar",
          battery: "battery",
          communication: "antenna",
          navigation: "camera",
          thermal: "thermal",
        } as Record<string, string>
      )[category]
  ];
}
export const photoUrl = (photo: PartPhoto) =>
  `${import.meta.env.BASE_URL}${photo.src}`;
