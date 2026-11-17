import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "10mb" }));

// Membaca ANTHROPIC_API_KEY dari environment variable
const client = new Anthropic();

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

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.post("/api/analyze", async (req, res) => {
  try {
    const { image, mediaType = "image/jpeg" } = req.body;
    if (!image) return res.status(400).json({ error: "Gambar kosong" });

    const msg = await client.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Respons AI tidak berformat JSON");
    res.json(JSON.parse(match[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Gagal menganalisis" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NutriSnap jalan di http://localhost:${PORT}`));
