import type { DefectType } from "@/lib/contracts";
export const triageHints: Record<DefectType, string> = {
  swallowed_exception: "Look at what happens after something goes wrong.",
  unhandled_null: "Look at data that comes from outside this file.",
  cache_no_fallback: "Look at what the request depends on that can fail.",
  off_by_one: "Look at the edges: the exact value where behaviour changes.",
  shared_mutation: "Look at who owns the data this function receives.",
  missing_await: "Look at the order things finish, not the order they start.",
  unbounded_retry: "Look at which failures are worth trying again.",
  resource_leak: "Look at every way this function can end.",
};

const indonesianHints: Record<import("@/lib/contracts").DefectType, string> = {
  swallowed_exception: "Perhatikan apa yang terjadi setelah ada masalah.",
  unhandled_null: "Perhatikan data yang berasal dari luar berkas ini.",
  cache_no_fallback: "Perhatikan dependensi permintaan yang bisa gagal.",
  off_by_one: "Perhatikan batas: nilai persis saat perilaku berubah.",
  shared_mutation: "Perhatikan siapa yang memiliki data yang diterima fungsi ini.",
  missing_await: "Perhatikan urutan pekerjaan selesai, bukan urutan dimulai.",
  unbounded_retry: "Perhatikan kegagalan mana yang layak dicoba lagi.",
  resource_leak: "Perhatikan setiap cara fungsi ini dapat berakhir.",
};
export function triageHint(defectType: import("@/lib/contracts").DefectType, locale: "en" | "id"): string {
  return (locale === "id" ? indonesianHints : triageHints)[defectType];
}
