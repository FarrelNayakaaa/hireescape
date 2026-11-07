import type { JourneyCopy } from "@/components/game/RoomHall";

export const journeyCopy: Record<"en" | "id", JourneyCopy> = {
  en: {
    eyebrow: "YOUR ESCAPE STARTS HERE", title: "Three doors. Three keys. One escape.",
    description: "Choose the open door. Complete each mission to earn its key and unlock the next room.",
    enter: "Enter", locked: "Locked · finish the previous room", complete: "Complete · key earned",
    keyEarned: "A new key is yours!", rewardDescription: "Your work is saved. The next door is ready when you are.",
    collect: "Collect key & return to the doors", keys: "keys collected", entering: "Entering",
    names: ["Triage", "The Bug", "The Defence"], goals: ["Find where it breaks.", "Make the hidden tests pass.", "Explain your fix in your own words."],
  },
  id: {
    eyebrow: "PETUALANGANMU DIMULAI DI SINI", title: "Tiga pintu. Tiga kunci. Satu jalan keluar.",
    description: "Pilih pintu yang terbuka. Selesaikan setiap misi untuk mendapatkan kunci dan membuka ruangan berikutnya.",
    enter: "Masuk", locked: "Terkunci · selesaikan ruangan sebelumnya", complete: "Selesai · kunci didapat",
    keyEarned: "Kamu mendapatkan kunci baru!", rewardDescription: "Pekerjaanmu tersimpan. Pintu berikutnya siap saat kamu siap.",
    collect: "Ambil kunci & kembali ke pintu", keys: "kunci terkumpul", entering: "Memasuki",
    names: ["Triage", "The Bug", "The Defence"], goals: ["Temukan sumber masalahnya.", "Buat semua pengujian tersembunyi berhasil.", "Jelaskan perbaikan dengan kata-katamu sendiri."],
  },
};
