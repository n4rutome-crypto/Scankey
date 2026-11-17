const PROMPT = `Kamu adalah ahli gizi. Analisis foto makanan ini.
Identifikasi setiap item makanan, perkirakan berat porsinya (gram) dari ukuran visual,
lalu hitung nutrisinya. Pahami makanan Indonesia (nasi, rendang, gado-gado, dll).
Balas HANYA dengan JSON valid, tanpa teks lain, dengan format:
{
  "is_food": true,
  "items": [
    {"nama": "", "porsi_gram": 0, "kalori": 0, "protein_g": 0, "karbo_g": 0, "lemak_g": 0, "serat_g": 0, "gula_g": 0, "natrium_mg": 0}
  ],
  "total": {"kalori": 0, "protein_g": 0, "karbo_g": 0, "lemak_g": 0, "serat_g": 0, "gula_g": 0, "natrium_mg": 0},
  "keyakinan": "tinggi|sedang|rendah",
  "catatan": "asumsi singkat tentang porsi/cara masak"
}
Jika foto bukan makanan, balas {"is_food": false}.`;

export default async function handler(req, res) {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY belum di-set");
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const { image, mediaType = "image/jpeg" } = req.body || {};
    if (!image) return res.status(400).json({ error: "Gambar kosong" });

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mediaType, data: image } }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || "Gagal memanggil Gemini");
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Respons AI tidak berformat JSON");
    res.status(200).json(JSON.parse(match[0]));
  } catch (err) {
    res.status(500).json({ error: err.message || "Gagal menganalisis" });
  }
}
